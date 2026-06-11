# WorkAI Outline Intent Contract 리서치

작성일: 2026-06-12
대상 제품: WorkAI 승인 목차, 슬라이드 생성, 최종 덱 정규화
이번 루프 결론: 사용자가 목차 화면에서 확정한 제목, 순서, 레이아웃, strategicGoal은 단순 프롬프트 힌트가 아니라 최종 덱의 계약이다. 모델이 본문과 근거를 잘 보강하더라도 승인 목차 의도가 drift되면 사용자가 검토한 설계가 깨지므로, 장수 보정 이후 deterministic post-processing으로 목차 의도를 다시 맞춘다.

## 1. 현재 제품 관찰

- `PresentationTab`은 사용자가 outline 제목과 순서를 편집한 뒤 `handleGenerateFull`에 승인 목차를 전달한다.
- `Slide Count Contract`는 승인 outline 길이에 맞춰 최종 장수는 보정하지만, 각 슬라이드의 제목/레이아웃/strategicGoal이 승인 목차와 같은지는 검사하지 않았다.
- `geminiService.generatePresentation`과 `src/lib/ai-service.ts`는 `approvedOutline`을 payload로 전달하지만, 모델 생성 결과가 outline 제목을 일반화하거나 레이아웃을 `default`로 바꾸면 그대로 최종 덱에 반영될 수 있었다.
- 결과적으로 사용자가 "ROI 240% 달성 가능성 확인"이라는 2번 장표를 승인했는데 최종 슬라이드가 "Generic KPI page"처럼 바뀌는 문제가 생길 수 있었다.

## 2. 외부 리서치 요약

### 2.1 제품 내 일관성은 사용자가 다음 결과를 예측하게 하는 기본 조건이다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 같은 제품 안에서 단어, 상황, 동작이 일관되어야 사용자의 학습 부담과 혼란이 줄어든다고 설명한다.
- Applicability: WorkAI의 outline 승인 화면과 preview 화면은 같은 발표자료 생성 흐름이므로, 승인한 제목과 레이아웃이 최종 덱에서 같은 의미로 이어져야 한다.
- Difference From This Project: 기존 구현은 UI 흐름은 일관되지만 모델 출력이 중간 계약을 변경할 수 있어 사용자 예측 가능성이 약했다.
- Adoption Priority: 높음.
- Reflected Status: `alignSlidesToApprovedOutline`가 승인 목차의 제목, 레이아웃, strategicGoal, speakerPersona를 최종 slides에 재정렬한다.

### 2.2 구조화 출력은 JSON shape뿐 아니라 다운스트림 계약 검증과 함께 써야 한다

- Source URL: https://developers.openai.com/api/docs/guides/structured-outputs
- Key Summary: OpenAI 문서는 구조화 출력이 모델 응답을 스키마에 맞추는 기능이며, 앱에서 안정적으로 후속 처리를 하려면 정의한 구조와 계약을 명확히 해야 한다고 설명한다.
- Applicability: WorkAI는 `slides[]`가 존재하는 것만으로 충분하지 않고, 각 `slides[i]`가 승인된 outline `i`번째 항목의 의도와 맞아야 한다.
- Difference From This Project: 현재 Gemini 경로는 JSON 파싱과 normalize는 수행하지만, 사용자 승인 의도에 대한 field-level 계약은 없었다.
- Adoption Priority: 높음.
- Reflected Status: 생성 시스템 프롬프트에 `APPROVED OUTLINE CONTRACT`를 추가하고, 응답 후 사후 보정으로 계약을 강제한다.

### 2.3 좋은 슬라이드는 제목이 한 장표의 메시지를 정확히 대표해야 한다

- Source URL: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009554
- Key Summary: PLOS Computational Biology의 발표 슬라이드 가이드는 슬라이드마다 하나의 중심 아이디어가 있어야 하며, 제목이 그 메시지를 직접 드러내야 한다고 설명한다.
- Applicability: WorkAI 사용자가 outline에서 확정한 슬라이드 제목은 최종 장표의 메시지 가이드포스트 역할을 한다.
- Difference From This Project: 기존 생성은 모델이 더 그럴듯한 일반 제목으로 바꾸면서 사용자가 의도한 의사결정 메시지를 약화시킬 수 있었다.
- Adoption Priority: 높음.
- Reflected Status: 후보 구현은 생성된 본문/출처는 유지하되 outline title을 최종 slide title로 복원한다.

## 3. 제품 개선 결정

선택 기능: `Outline Intent Contract`

- `src/lib/outline-contract.ts` 추가.
- 승인 outline 배열 추출: `outline`, `slides`, `tasks`, `plan`, `phases`, `steps`, `items` 형태 지원.
- 각 `slides[i]`에 승인 outline `i`번째 항목의 `title`, `strategicGoal`, `speakerPersona`를 적용.
- outline subtitle은 생성 결과에 subtitle이 비어 있을 때만 채워, 모델이 보강한 유효한 부제는 유지.
- outline 레이아웃은 명시 레이아웃 또는 `visualization_recommendation`에서 추론해 적용하되, outline이 generic/default인 경우 생성된 chart/table/timeline 같은 더 구체적 레이아웃은 downgrade하지 않음.
- 기존 `Slide Count Contract` 이후 실행해 trim/pad로 정리된 최종 슬라이드에 같은 의도 계약을 적용.

## 4. A/B 테스트 설계

- Control A: 기존 방식. 생성 결과 title/layout/strategicGoal drift를 그대로 사용.
- Candidate B: `alignSlidesToApprovedOutline` 적용.
- 샘플: 승인 outline 3개와 모델이 drift한 생성 슬라이드 3개.
- 평가 기준: 각 슬라이드마다 title, layout, strategicGoal 일치 여부를 3점 만점으로 계산한다.
- 기대 결과: baseline 1점, candidate 9점.
- 구현 위치: `src/lib/outline-contract.test.ts`.
- 1차 실제 결과: `npx vitest run src/lib/outline-contract.test.ts src/lib/slide-count-contract.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 10개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- preview 또는 품질 패널에 "승인 목차 기준으로 제목/레이아웃 보정됨" 이벤트를 표시.
- outline 항목과 최종 slide 사이에 stable outline id를 추가해 reorder 이후에도 index 외 매칭을 지원.
- 생성된 본문이 outline title과 의미적으로 충돌하는 경우 품질 감사에서 재작성 제안을 표시.
- 사용자가 특정 슬라이드는 모델 제목을 유지하도록 잠금 해제할 수 있는 고급 옵션 제공.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/outline-contract.ts` 승인 목차 추출과 title/layout/strategicGoal 정렬.
- 반영됨: `src/hooks/usePresentation.ts` 최종 생성 상태 반영 전 outline contract 적용.
- 반영됨: `src/services/ai/geminiService.ts` generation prompt와 반환 경로에 outline contract 적용.
- 반영됨: `src/lib/ai-service.ts` 스트리밍/일반 생성 경로에 outline contract 적용.
- 반영됨: `src/lib/outline-contract.test.ts` A/B 테스트와 레이아웃 downgrade 방지 테스트 추가.
- 검증 완료: `npx vitest run src/lib/outline-contract.test.ts src/lib/slide-count-contract.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 10개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 17개 파일 57개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
