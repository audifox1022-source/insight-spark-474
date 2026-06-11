# WorkAI Slide Regeneration Contract 리서치

작성일: 2026-06-12
대상 제품: WorkAI 개별 슬라이드 재생성, 편집 안정성, 덱 상태 정규화
이번 루프 결론: 전체 생성 경로에는 슬라이드 정규화, 장수 계약, outline 계약이 적용되어 있지만 개별 슬라이드 재생성 경로는 AI 응답을 거의 그대로 store에 넣고 있었다. 이 경로는 사용자가 실제 편집 중 가장 자주 호출할 수 있으므로, 재생성 결과도 전체 생성과 같은 데이터 계약을 통과해야 한다.

## 1. 현재 제품 관찰

- `usePresentation.regenerateSlide`는 `newSlides[slideIndex] = { ...result.slide, id: currentSlide.id }`로 id만 보존했다.
- AI가 `bullets`, `points`, `content_data_chart: { labels, datasets }`, `headers/rows` 같은 변형 구조를 반환하면 store의 slide shape가 전체 생성 결과와 달라질 수 있었다.
- 기존 슬라이드에 있던 `citation_url`, `source_label`, `strategicGoal`, `speakerPersona`가 재생성 응답에 없으면 사라질 수 있었다.
- 첫 번째 슬라이드 재생성에서 모델이 `layout: default`를 반환하면 표지 슬라이드 규칙이 약해질 수 있었다.
- 결과적으로 부분 편집 후 preview/export/review 경로가 전체 생성 직후보다 더 불안정해질 수 있었다.

## 2. 외부 리서치 요약

### 2.1 같은 제품 안의 편집 결과는 일관된 구조와 기대를 유지해야 한다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 같은 제품 안에서 단어, 상황, 동작이 일관되어야 사용자가 예측하고 학습할 수 있다고 설명한다.
- Applicability: WorkAI에서 전체 생성과 슬라이드 재생성은 모두 최종 덱 상태를 만드는 경로이므로 동일한 slide schema와 렌더링 계약을 유지해야 한다.
- Difference From This Project: 기존 재생성 경로는 전체 생성 경로의 정규화 계약을 우회했다.
- Adoption Priority: 높음.
- Reflected Status: `mergeRegeneratedSlide`가 재생성 응답을 기존 slide metadata와 병합하고 `normalizePresentationSlide`를 통과시킨다.

### 2.2 구조화 출력은 다운스트림 처리를 위해 스키마 준수가 필요하다

- Source URL: https://developers.openai.com/api/docs/guides/structured-outputs
- Key Summary: OpenAI 문서는 구조화 출력이 모델 응답을 정의된 JSON Schema에 맞추어 다운스트림 처리를 안정화하는 목적이라고 설명한다.
- Applicability: WorkAI는 모델이 JSON을 반환해도 `content`, `layout`, `chartData`, `citation_url` 등 앱 내부 계약을 만족하는지 보정해야 한다.
- Difference From This Project: 기존 재생성 경로는 JSON 객체를 받았다는 사실만으로 충분하다고 보고 shape 검증을 하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: 재생성 응답을 slide-level contract로 병합/정규화한 뒤 store에 반영.

### 2.3 슬라이드 개선은 반복 작업이므로 각 반복에서 메시지와 흐름을 유지해야 한다

- Source URL: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009554
- Key Summary: PLOS Computational Biology의 슬라이드 가이드는 좋은 슬라이드 설계가 반복 개선을 통해 발표자가 전달하려는 메시지를 더 잘 맞추는 과정이라고 설명한다.
- Applicability: WorkAI 재생성은 사용자의 반복 개선 루프이므로 기존 슬라이드의 목적, 출처, 위치 정보를 잃지 않고 내용만 개선해야 한다.
- Difference From This Project: 기존 구현은 재생성 결과가 기존 증거/전략 목표를 지워도 방어하지 않았다.
- Adoption Priority: 중간.
- Reflected Status: 재생성 응답에 없는 출처/전략 목표/발표자 페르소나는 기존 slide에서 보존.

## 3. 제품 개선 결정

선택 기능: `Slide Regeneration Contract`

- `src/lib/slide-regeneration-contract.ts` 추가.
- `mergeRegeneratedSlide(currentSlide, regeneratedSlide, slideIndex)`가 재생성 결과를 기존 슬라이드와 병합.
- 항상 기존 `id`를 보존.
- 재생성 응답이 `citation_url`, `source_label`, `strategicGoal`, `speakerPersona`를 생략하면 기존 값을 보존.
- 재생성 응답이 `bullets`, `points`, `items` 같은 본문 변형을 제공하면 기존 `content`가 이를 가리지 않도록 처리.
- 병합 결과를 `normalizePresentationSlide`에 통과시켜 chart/table data contract, content contract, cover layout rule을 적용.
- `usePresentation.regenerateSlide`에서 직접 spread 대신 `mergeRegeneratedSlide` 사용.

## 4. A/B 테스트 설계

- Control A: 기존 방식. `{ ...result.slide, id }`로 대체.
- Candidate B: `mergeRegeneratedSlide` 적용.
- 샘플 1: AI가 `type: bar_chart`, `bullets`, `content_data_chart: { labels, datasets }`만 반환하고 출처를 생략.
- 샘플 2: 첫 번째 slide가 `layout: default`로 drift.
- 평가 기준: stable id, 표준 content 배열, chart data 배열, `chartData.data`, citation 보존, elements 배열, cover layout 보존.
- 실제 결과: candidate가 legacy replacement보다 높은 계약 점수로 통과.
- 구현 위치: `src/lib/slide-regeneration-contract.test.ts`.
- 1차 검증: `npx vitest run src/lib/slide-regeneration-contract.test.ts src/presentation-normalizer.test.ts src/lib/slide-citations.test.ts` 통과, 3개 파일 10개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `reviewAndFixPresentation`도 전체 presentation 정규화 계약을 통과하도록 강화.
- 재생성 후 품질 감사 패널에 보존된 출처/전략 목표를 표시.
- 사용자가 출처 또는 전략 목표를 의도적으로 삭제하고 싶을 때 명시적 삭제 명령을 구분.
- 슬라이드 재생성 결과가 outline title과 충돌하면 outline contract를 선택적으로 재적용.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/slide-regeneration-contract.ts` 재생성 병합/정규화 계약.
- 반영됨: `src/hooks/usePresentation.ts` 재생성 store 반영 경로에 contract 적용.
- 반영됨: `src/lib/slide-regeneration-contract.test.ts` A/B 테스트와 cover drift 방지 테스트 추가.
- 검증 완료: `npx vitest run src/lib/slide-regeneration-contract.test.ts src/presentation-normalizer.test.ts src/lib/slide-citations.test.ts` 통과, 3개 파일 10개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 18개 파일 60개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
