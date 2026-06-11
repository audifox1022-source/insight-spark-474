# WorkAI Slide Count Contract 리서치

작성일: 2026-06-12
대상 제품: WorkAI AI 발표자료 생성 설정, 목차 승인, 최종 슬라이드 정규화
이번 루프 결론: 사용자가 입력한 슬라이드 개수와 승인한 outline 길이는 생성 결과의 핵심 계약이다. 모델 프롬프트에 "정확히 N장"을 넣는 것만으로는 충분하지 않으므로, 생성 직후 deterministic post-processing으로 과다/부족 생성을 보정한다.

## 1. 현재 제품 관찰

- `PresentationSetupForm`은 사용자가 `slideCount`를 1~50장 범위로 직접 입력할 수 있게 한다.
- `usePresentation`은 `settings.slideCount`를 outline/full generation payload에 넘기지만, 최종 `normalizePresentationSlides(result)` 이후 실제 장수를 보정하지 않았다.
- `geminiService.generatePresentation`은 schema/JSON 생성은 보강했지만, `slides.length`가 설정 또는 승인 outline 길이와 일치하는지는 검사하지 않았다.
- `src/lib/ai-service.ts` 보조 생성 경로도 prompt에 `[정확한 장수]`를 넣지만 응답 후 mismatch를 그대로 반환했다.
- 결과적으로 사용자가 5장을 요청했는데 7장이 생성되거나, 승인 outline 4개 중 2개만 생성돼도 앱은 성공 toast를 표시할 수 있었다.

## 2. 외부 리서치 요약

### 2.1 사용자 제어감은 사용자가 선택한 설정이 실제 결과에 반영될 때 유지된다

- Source URL: https://www.nngroup.com/articles/user-control-and-freedom/
- Key Summary: Nielsen Norman Group은 좋은 UX가 사용자가 UI를 통제하고 있다는 느낌을 키워야 하며, 기대와 다르게 동작하면 불만족이 생긴다고 설명한다.
- Applicability: WorkAI에서 "슬라이드 10장" 설정은 사용자의 명시적 제어 입력이므로 최종 결과가 이를 따라야 한다.
- Difference From This Project: 기존 구현은 설정을 모델에 전달했지만 결과를 검증하거나 보정하지 않아 사용자 제어감이 깨질 수 있었다.
- Adoption Priority: 높음.
- Reflected Status: `slide-count-contract`가 설정/승인 outline에서 요청 장수를 계산하고 최종 slides 배열을 맞춘다.

### 2.2 JSON mode는 유효 JSON만 보장하며 스키마/계약 검증은 별도로 필요하다

- Source URL: https://developers.openai.com/api/docs/guides/structured-outputs
- Key Summary: OpenAI 문서는 JSON mode가 유효 JSON을 보장하더라도 특정 schema 일치까지 보장하지 않으며, 필요하면 Structured Outputs 또는 validation library를 사용하라고 설명한다.
- Applicability: WorkAI는 Gemini JSON 응답을 파싱하더라도 `slides.length === requestedCount` 같은 제품 계약을 별도 검증해야 한다.
- Difference From This Project: 기존 코드는 JSON 파싱과 슬라이드 정규화는 했지만 장수 계약 검증은 없었다.
- Adoption Priority: 높음.
- Reflected Status: 생성 경로에서 `enforceSlideCountContract`를 호출해 JSON 파싱 이후 제품 계약을 적용.

### 2.3 구조화 출력도 다운스트림 처리를 위해 유효성과 일관성이 중요하다

- Source URL: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Key Summary: Anthropic 문서는 structured outputs가 다운스트림 처리에 필요한 valid/parseable output을 보장하는 목적이라고 설명하며, 구조 위반이 앱을 깨뜨릴 수 있음을 지적한다.
- Applicability: WorkAI의 다운스트림은 store, editor, export, review로 이어지므로 생성 직후 shape와 count가 안정적이어야 한다.
- Difference From This Project: 모델 응답이 parseable이어도 수량이 틀리면 승인한 흐름과 export 결과가 달라진다.
- Adoption Priority: 중간.
- Reflected Status: `geminiService`, `lib/ai-service`, `usePresentation` 최종 경로에 동일한 count contract를 적용.

### 2.4 슬라이드 수는 발표 시간과 인지 부하를 관리하는 설계 단위다

- Source URL: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009554
- Key Summary: PLOS Computational Biology의 발표 슬라이드 규칙은 한 슬라이드가 하나의 아이디어를 전달하고, 발표 시간 계획과 맞물려야 한다고 설명한다.
- Applicability: 사용자가 5장, 10장, 20장을 선택하는 것은 단순 양이 아니라 발표 시간과 메시지 단위를 조절하는 행위다.
- Difference From This Project: 기존 결과 장수 불일치는 발표 시간과 정보 밀도 계획을 깨뜨릴 수 있었다.
- Adoption Priority: 중간.
- Reflected Status: 과다 생성은 첫/마지막 흐름을 보존하며 줄이고, 부족 생성은 승인 outline 항목을 바탕으로 보강 슬라이드를 만든다.

## 3. 제품 개선 결정

선택 기능: `Slide Count Contract`

- `src/lib/slide-count-contract.ts` 추가.
- `resolveRequestedSlideCount`: 승인 outline 길이를 우선하고 없으면 `settings.slideCount`를 사용.
- 과다 생성 시 첫 슬라이드와 마지막 슬라이드를 보존하고 중간 슬라이드를 균등 샘플링하여 목표 장수로 축소.
- 부족 생성 시 승인 outline의 title/layout/description/strategicGoal을 사용해 `slide_count_repaired` 보강 슬라이드 생성.
- `usePresentation.handleGenerateFull`, `src/services/ai/geminiService.ts`, `src/lib/ai-service.ts`에 동일 계약 적용.
- Gemini generation system prompt에 요청 장수를 명시하는 `SLIDE COUNT CONTRACT` 지시 추가.

## 4. A/B 테스트 설계

- Control A: 기존 방식. `normalizePresentationSlides` 이후 생성된 장수를 그대로 사용.
- Candidate B: `enforceSlideCountContract` 적용.
- 샘플 1: 5장을 요청했지만 7장이 생성된 덱. baseline은 7장, candidate는 5장이고 cover/closing을 보존해야 한다.
- 샘플 2: 승인 outline 4개 중 2장만 생성된 덱. candidate는 outline 기반으로 4장까지 보강해야 한다.
- 평가 기준: candidate의 `actualCount`가 requested count와 일치하고, 보강 슬라이드는 outline title/layout을 반영해야 한다.
- 구현 위치: `src/lib/slide-count-contract.test.ts`.
- 실제 결과: `npx vitest run src/lib/slide-count-contract.test.ts src/lib/presentation-result.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 10개 테스트 성공.

## 5. 후속 개선 백로그

- count repair가 발생한 경우 품질 패널에 "장수 보정됨" 이벤트를 표시.
- 부족 생성 시 AI 재요청으로 누락 슬라이드만 생성하는 선택지를 제공.
- 사용자가 outline에서 직접 삭제/추가한 이력을 저장해 장수 계약의 근거를 더 명확히 표시.
- 너무 작은 장수(1~2장)에서는 cover/closing 우선순위를 다르게 적용하는 UX 정책 추가.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/slide-count-contract.ts` 요청 장수 계산과 trim/pad 보정.
- 반영됨: `src/hooks/usePresentation.ts` 최종 생성 결과에 count contract 적용.
- 반영됨: `src/services/ai/geminiService.ts`, `src/lib/ai-service.ts` 서비스 생성 경로에 count contract 적용.
- 반영됨: `src/lib/slide-count-contract.test.ts` A/B 테스트와 outline 보강 테스트 추가.
- 검증 완료: `npx vitest run src/lib/slide-count-contract.test.ts src/lib/presentation-result.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 10개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 16개 파일 54개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
