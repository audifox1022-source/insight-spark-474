# [Work AI PDF Editor Upgrade] 작업 일지 (updates.md)

## 📅 날짜: 2026-03-26

### 1. 시도한 해결책 및 수정 내역

- **리사이저블 텍스트 박스 구현**: `react-rnd`를 도입하여 텍스트 상자의 너비와 높이를 자유롭게 조절할 수 있도록 구현. 상태 관리(`usePdfEditorStore`)와 연동하여 리사이징 시 즉시 반영되도록 처리.
- **플로팅 포맷팅 툴바 (`PDFTextFormatToolbar.tsx`)**: 텍스트 박스 선택 시 상단에 폰트 크기, 종류, 색상을 조절할 수 있는 전용 툴바 구현.
- **PDF 내보내기 엔진 고도화 (`pdf-export-lib.ts`)**: 
  - 사용자가 지정한 텍스트 상자 너비에 맞춰 **자동 줄바꿈(Word wrap)** 처리 로직 추가.
  - 폰트 스타일(Batang, Gulim, Dotum 등)에 따른 매핑 로직 반영.
- **AI 문맥 최적화 연동**: `aiService.editPdfSegment`를 호출하여 선택된 텍스트의 문맥을 분석하고 다듬는 기능 통합.
- **TypeScript 린트 오류 해결**: `Blob` 생성 시 타입 불일치, `react-rnd` 이벤트 핸들러 타입 오류 등을 수정하여 안정성 확보.

### 2. 실패 사례 및 극복 과정

- **Detached ArrayBuffer 오류**: PDF 내보내기 과정에서 `originalBytes`가 소비되어 이후 재사용이 불가능해지는 문제 발생 -> `.slice(0)`를 통해 버퍼를 방어적으로 복제하여 해결.
- **줄바꿈 누락**: 기존 `drawText`는 긴 텍스트를 한 줄로만 렌더링함 -> `splitTextIntoLines` 유틸리티를 작성하여 수동으로 줄바꿈 위치를 계산하고 여러 번 그리는 방식으로 해결.

### 3. 최종 성공 상태

- 사용자가 텍스트 상자 크기를 조절하면 PDF 내보내기 시 해당 너비에 맞춰 텍스트가 정렬됨.
- 폰트 종류 및 색상 변경이 UI와 출력물 모두에 정확히 반영됨.
- AI Magics 기능을 통해 텍스트 내용을 즉시 전문적으로 다듬을 수 있음.

---

## 📅 날짜: 2026-04-01

### 4. 404 Not Found 에러 해결 및 오디오 레거시 소멸 (PDF/Audio)

- **문제 진단**: 
  - 브라우저 환경에서 직접 호출 불가한 구글 파일 업로드 API(`v1/files`) 사용으로 인한 404 에러 발생.
  - 과거의 2단계 분석 로직(`identifyAudioType` -> 상세 분석)이 남아있어 "오디오 유형 판별 불가" 에러 발생.
- **해결책 (Extinction & Rebirth)**:
  - **레거시 소멸**: `identifyAudioType`, `analyzeSpeechAudio`, `analyzeMusicAudio` 함수를 코드베이스에서 영원히 삭제.
  - **단일 파이프라인 통합**: `FileReader`를 통한 Base64 변환 후, Gemini 2.5 Flash에 `inlineData`로 주입하여 판별과 분석을 한 번에 수행.
  - **Direct Injection**: `AudioLabWorkspace.tsx`에 사용자 강제 주입 로직을 100% 적용하여 안정성 확보.
- **성공 상태**: 
  - PDF 및 오디오 업로드 시 404 에러 없이 즉시 분석 완료.
  - 모든 오디오 데이터가 보안상 안전한 브라우저 단 인라인 파이프라인을 통해 처리됨.

### 5. Vercel 빌드 에러 해결 (translateLiveAudio 누락 복구)

- **문제 진단**: AUDIO LAB 레거시 제거 과정에서 `geminiAudioService.ts`를 과도하게 파기하여 `VoiceRecorder.tsx`에서 참조하는 `translateLiveAudio` 기능이 유실됨.
- **해결책**:
  - `geminiAudioService.ts`에 `translateLiveAudio` 기능을 **Gemini 2.5 Flash 단일 파이프라인**으로 재건.
  - `FileReader`를 통한 Base64 인라인 데이터 방식을 적용하여 서버 사이드 404 에러 발생 가능성을 원천 차단.
  - 기존 `VoiceRecorder.tsx`와의 호환성을 유지하여 Vercel 빌드 통과 보장.
- **성공 상태**: 배포 빌드 시 모듈 참조 에러 해결 및 실시간 통역 기능 정상화.

---

## 📅 날짜: 2026-04-02

### 6. AUDIO LAB 데이터 구조 복구 및 PDF 편집기 UI/UX 통일

- **문제 진단**:
  - 오디오 분석 결과가 단순 텍스트로만 출력되어 심층 리포트 기능이 마비됨.
  - PDF 편집기 디자인이 플랫폼 표준과 일치하지 않아 사용자 경험 이질감 발생.
- **해결책 (Recovery & Unification)**:
  - **오디오 스토어 복구**: `useAudioStore.ts`(Zustand)를 신규 생성하여 상태 관리를 중앙 집중화.
  - **엄격한 JSON 스키마 강제**: `schema.ts`에 오디오 분석용 Zod 스키마를 추가하고, AI 응답 모드를 JSON으로 고정하여 `SpeechReport`, `MusicReport` 등 전용 UI 연동 복구.
  - **디자인 시스템 통일**: `PDFEditorWorkspace.tsx`를 발표자료 앱(Slide App) 디자인 시스템에 맞춰 전면 리팩토링(Indigo 테마, 프리미엄 툴바, 둥근 디자인 적용).
- **성공 상태**:
  - 오디오 분석 시 정밀한 화자 분석 및 음악 구조 데이터 시각화 리포트가 정상 출력됨.
  - PDF 편집기의 UI가 플랫폼 통합 패밀리룩으로 정립되어 UX 완성도 향상.

### 7. Gemini 모델 식별자 업데이트 및 404 에러 원천 차단

- **문제 진단**: 
  - Audio Lab 분석 시 `models/gemini-1.5-pro`를 찾을 수 없다는 404 에러 발생.
  - 코드베이스 곳곳에 하드코딩된 구버전 모델 식별자가 산재하여 서비스 불안정성 초래.
- **해결책 (Modernization & Resilience)**:
  - **모델 전면 교체**: `geminiAudioService.ts`, `api-client.ts`, `geminiService.ts`, `server.js` 등 모든 모델 호출부의 식별자를 최신 버전인 `gemini-2.5-flash`로 업그레이드.
  - **동적 모델 매핑**: 환경 변수(`VITE_GEMINI_MODEL`)를 우선 참조하되, 하드코딩된 fallback 값도 모두 2.5 버전으로 수정하여 404 에러 발생 가능성을 원천 차단.
  - **UX 방어 로직**: API 호출 실패 시 사용자에게 Toast 알림("AI 서버와 통신할 수 없습니다...")을 표시하도록 `AudioLab.tsx`의 에러 핸들링 강화.
- **성공 상태**:
  - 오디오 분석 및 AI 채팅 등 모든 지능형 기능이 최신 `2.5 Flash` 엔진을 통해 지연 없이 정상 작동함.
  - 서버 장애나 모델 미지원 시 사용자가 명확한 상태를 인지할 수 있도록 에러 피드백 시스템 구축 완료.

### 8. Gemini API 토큰 제한(MAX_TOKENS) 해결 및 JSON 파싱 안정화

- **문제 진단**:
  - AI 응답이 길어질 경우 `MAX_TOKENS` 한도에 걸려 JSON 구조가 불완전하게 반환됨.
  - 결과적으로 "Expected ',' or ']' after array element in JSON" 등 파싱 에러가 발생하여 앱 서비스 중단.
- **해결책 (Stability Upgrade)**:
  - **출력 한도 상향**: `src/services/ai/api-client.ts`, `geminiService.ts`, `lib/ai-service.ts`의 모든 모델 호출 설정에서 `maxOutputTokens`를 `8192`로 대폭 상향.
  - **Truncation 대응 강화**: API 응답에서 `finishReason === 'MAX_TOKENS'` 감지 시, 불완전한 데이터를 파싱하려 시도하는 대신 명시적인 안내 메시지("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.")를 에러로 발생시키도록 로직 개선.
  - **UI 에러 핸들링**: `usePresentation.ts` 등의 훅에서 발생하는 에러를 Toast로 즉시 표시하여 사용자 인지성 확보.
  - **서버 환경 개선**: `server.js` 내의 TypeScript 구문 에러(Catch block type annotation)를 제거하여 로컬/배포 환경 호환성 확보.
- **성공 상태**:
  - 복잡한 구성안 및 장문의 슬라이드 생성 시에도 토큰 부족으로 인한 런타임 에러 없이 안정적으로 작동함.
  - 극단적인 호출 상황에서도 시스템 붕괴 대신 명확한 가이드를 제공하여 사용자 경험(UX) 방어 성공.
