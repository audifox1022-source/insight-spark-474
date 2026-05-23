# Work AI 업데이트 일지

## 2026-05-23: 파일 업로드 기반 발표자료 생성 버그 수정

### 🐛 문제
- 파일을 업로드해도 파일 내용과 **무관한** 발표자료가 생성됨

### 🔍 근본 원인 (3단계 데이터 유실)

| 단계 | 파일 | 문제점 |
|------|------|--------|
| 1 | `PresentationTab.tsx` (L149) | `info.notes`에 메타 텍스트만 저장 (`[파일 분석됨: 파일명]`), 실제 파일 내용은 `sourceFileData`에 저장 |
| 2 | `usePresentation.ts` (L167) | **Plan 생성 시** `info.title`, `info.objective`, `info.notes`만 사용 → `sourceFileData` (실제 파일 내용) **누락** |
| 3 | `prompts.ts` | AI 프롬프트에 업로드 문서 내용을 우선 반영하라는 지시 없음 |

**결과**: AI가 `info.notes`의 짧은 메타 텍스트만 보고 일반적인 발표자료를 생성

### ✅ 수정 사항

#### 1. `usePresentation.ts` - Plan 생성에 sourceFileData 주입
- `handleGenerateOutline`에서 Plan 생성 시 `sourceFileData`를 `userRequest`에 포함 (최대 15,000자)
- Outline 생성 시에도 `sourceFileData`를 `integratedText`에 명시적으로 포함

#### 2. `prompts.ts` - AI 프롬프트 3개 강화
- `GEMINI_SYSTEM_PROMPT_STANDARD`: "업로드 문서 기반 생성 강제" 규칙 추가
- `GEMINI_OUTLINE_PROMPT`: "업로드 문서 기반 생성 강제" 규칙 추가
- `GEMINI_HITL_PLANNER_SYSTEM_PROMPT`: 문서 기반 계획 수립 강제 지시 추가

### 📊 데이터 흐름 (수정 후)
```
파일 업로드
  → parseFile() → sourceFileData에 저장 (max 20,000자)
  → Plan 생성: sourceFileData 포함된 userRequest 전달 ✅ (기존: 누락)
  → Outline 생성: integratedText에 sourceFileData 포함 ✅ (기존: 누락)
  → Slide 생성: combinedInput에 sourceFileData 포함 ✅ (기존부터 정상)
```
