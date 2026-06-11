# WorkAI Presentation Review Contract 리서치

작성일: 2026-06-12
대상 제품: WorkAI 자동 디자인 리뷰/수정, 덱 상태 보존, 슬라이드 정규화
이번 루프 결론: 자동 리뷰는 전체 덱을 개선하는 기능이지만, AI가 반환한 presentation을 그대로 store에 넣으면 덱 id, 브랜드, 슬라이드 수, slide id, 출처, 렌더 가능한 데이터 구조가 깨질 수 있다. 리뷰 결과는 기존 덱을 대체하는 것이 아니라 기존 덱과 병합되어야 한다.

## 1. 현재 제품 관찰

- `reviewAndFixPresentation`은 `aiService.reviewAndFix` 결과의 `result.presentation`을 그대로 `setPresentationState`와 store에 반영했다.
- 리뷰 모델이 일부 슬라이드만 반환하면 기존 덱의 나머지 슬라이드가 사라질 수 있었다.
- 리뷰 모델이 추가 appendix 슬라이드를 반환하면 사용자가 승인한 장수와 흐름이 바뀔 수 있었다.
- 리뷰 응답에 `id`, `brandColor`, `citation_url`, `source_label`, `chartData.data`가 빠지면 기존 덱 메타데이터와 검증 가능한 근거가 손실될 수 있었다.
- 개별 슬라이드 재생성에는 contract가 적용되었지만, 전체 리뷰/수정 경로에는 같은 보호막이 없었다.

## 2. 외부 리서치 요약

### 2.1 제품 기능 간 일관성은 사용자가 결과를 신뢰하는 기반이다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 제품 내부의 일관성이 사용자가 동작을 예측하고 학습하는 데 필요하다고 설명한다.
- Applicability: WorkAI의 전체 생성, 개별 재생성, 자동 리뷰는 모두 같은 덱 상태를 수정하므로 동일한 schema와 보존 규칙을 따라야 한다.
- Difference From This Project: 기존 자동 리뷰 경로는 전체 생성/재생성 경로의 정규화 계약을 우회했다.
- Adoption Priority: 높음.
- Reflected Status: `mergeReviewedPresentation`이 리뷰 결과를 기존 덱과 병합하고 각 슬라이드에 재생성 계약을 적용.

### 2.2 구조화 출력은 앱 내부 계약과 함께 검증되어야 다운스트림 처리가 안정적이다

- Source URL: https://developers.openai.com/api/docs/guides/structured-outputs
- Key Summary: OpenAI 문서는 구조화 출력을 사용해 모델 응답이 정의된 schema를 따르게 하고, 안정적인 후속 처리를 가능하게 한다고 설명한다.
- Applicability: 리뷰 모델이 presentation JSON을 반환하더라도 WorkAI 내부에서는 slide count, slide id, content/chart/table/citation 계약을 다시 검증해야 한다.
- Difference From This Project: 기존 구현은 리뷰 JSON의 존재만 확인하고 내부 상태 불변조건은 보장하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: 리뷰 결과를 store에 반영하기 전 `mergeReviewedPresentation`으로 정규화.

### 2.3 슬라이드 개선은 반복적이지만 메시지와 흐름의 연속성이 유지되어야 한다

- Source URL: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009554
- Key Summary: PLOS Computational Biology의 슬라이드 가이드는 슬라이드 설계가 반복적으로 개선되는 과정이며 각 슬라이드는 발표 흐름 안에서 메시지를 전달해야 한다고 설명한다.
- Applicability: WorkAI 자동 리뷰는 디자인 밸런스를 개선하더라도 사용자가 승인한 덱 흐름과 슬라이드 수를 무단 변경하지 않아야 한다.
- Difference From This Project: 기존 자동 리뷰는 일부/추가 슬라이드 반환을 그대로 수용해 흐름을 바꿀 수 있었다.
- Adoption Priority: 중간.
- Reflected Status: 기존 슬라이드 수를 기준으로 누락 슬라이드는 복원하고 초과 슬라이드는 버린다.

## 3. 제품 개선 결정

선택 기능: `Presentation Review Contract`

- `src/lib/presentation-review-contract.ts` 추가.
- `mergeReviewedPresentation(currentPresentation, reviewedPresentation)`가 리뷰 결과를 기존 덱과 병합.
- 기존 presentation `id`, `brandColor`, 승인된 slide count를 보존.
- 각 슬라이드는 `mergeRegeneratedSlide`를 통해 id, 출처, strategicGoal, speakerPersona, content/chart/table 정규화 계약을 적용.
- 리뷰 결과가 일부 슬라이드만 반환하면 기존 슬라이드로 누락분을 복원.
- 리뷰 결과가 초과 슬라이드를 반환하면 기존 덱 길이를 기준으로 초과분 제거.
- `usePresentation.reviewAndFixPresentation`에서 직접 store 반영 대신 review contract 적용.

## 4. A/B 테스트 설계

- Control A: 기존 방식. 리뷰 결과 presentation을 그대로 store에 반영.
- Candidate B: `mergeReviewedPresentation` 적용.
- 샘플 1: 리뷰 결과가 3장 덱 중 2장만 반환하고, 차트 슬라이드는 `bar_chart`, `bullets`, `labels/datasets` 변형으로 반환.
- 샘플 2: 리뷰 결과가 기존 덱보다 1장 많은 appendix를 반환.
- 평가 기준: 덱 id, brandColor, slide count, slide id, cover layout, 표준 content, chartData.data, citation, 누락 슬라이드 복원, 초과 슬라이드 제거.
- 실제 결과: candidate가 legacy replacement보다 높은 계약 점수로 통과.
- 구현 위치: `src/lib/presentation-review-contract.test.ts`.
- 1차 검증: `npx vitest run src/lib/presentation-review-contract.test.ts src/lib/slide-regeneration-contract.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- 자동 리뷰 결과가 초과 슬라이드를 제안할 때 사용자에게 appendix 추가 여부를 선택하게 하기.
- review contract 적용 결과를 품질 패널에 "누락 복원/초과 제거" 이벤트로 표시.
- 기존 outline contract와 연결해 리뷰 후에도 승인 목차 title/layout을 선택적으로 재적용.
- 리뷰 모델에 "슬라이드 수와 id를 변경하지 말라"는 system prompt 보강.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/presentation-review-contract.ts` 리뷰 결과 병합/정규화 계약.
- 반영됨: `src/hooks/usePresentation.ts` 자동 리뷰 store 반영 경로에 contract 적용.
- 반영됨: `src/lib/presentation-review-contract.test.ts` A/B 테스트와 초과 슬라이드 제거 테스트 추가.
- 검증 완료: `npx vitest run src/lib/presentation-review-contract.test.ts src/lib/slide-regeneration-contract.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 19개 파일 62개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
