# WorkAI Reset Clears Designer Store 리서치

작성일: 2026-06-12
대상 제품: WorkAI 홈/초기화 흐름, 디자이너 Zustand store, stale deck 방지
이번 루프 결론: `usePresentation.reset()`은 hook 내부의 `presentation`, `outline`, data state를 비우지만 디자이너가 실제로 참조하는 `useSlideStore.presentation`은 직접 초기화하지 않았다. 사용자가 홈으로 돌아가거나 플랫폼을 초기화한 뒤 디자이너로 다시 진입하면 이전 deck과 4:3 비율, history가 남을 수 있다. reset은 화면 state와 편집 store를 같은 session boundary로 함께 비워야 한다.

## 1. 현재 제품 관찰

- `Index.handleBack`과 홈 이동 흐름은 `presentationHooks.reset?.()`을 호출한다.
- `SlideEditor`는 prop으로 받은 presentation보다 `useSlideStore()`의 `presentation`을 실제 렌더링 source로 사용한다.
- 기존 `usePresentation.reset()`은 hook state만 비우고 `useSlideStore.reset()`을 호출하지 않았다.
- `useSlideStore.reset()`은 이미 presentation, currentSlideIndex, history, executionPlan, aspectRatio를 초기값으로 되돌리는 기능을 갖고 있었다.

## 2. 외부 리서치 요약

### 2.1 사용자는 현재 상태를 명확히 이해하고 되돌릴 수 있어야 한다

- Source URL: https://www.nngroup.com/articles/ten-usability-heuristics/
- Key Summary: NN/g의 usability heuristics는 시스템 상태 가시성, 사용자 제어와 자유, 오류 방지를 핵심 원칙으로 설명한다.
- Applicability: WorkAI의 reset은 사용자가 세션을 끝내고 새 작업을 시작한다는 명확한 상태 전환이어야 하며, 숨겨진 designer store에 이전 deck이 남으면 안 된다.
- Difference From This Project: 기존 reset은 hook state와 designer store state가 분리되어 stale state가 남을 수 있었다.
- Adoption Priority: 높음.
- Reflected Status: `usePresentation.reset()`이 `useSlideStore.reset()`을 함께 호출.

### 2.2 제품 내부 상태와 화면은 일관된 모델을 공유해야 한다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 같은 제품 안의 동작과 표현이 일관되어야 사용자가 결과를 예측할 수 있다고 설명한다.
- Applicability: 홈 화면에서 발표자료가 초기화되었다면 디자이너 화면도 동일하게 빈 상태여야 한다.
- Difference From This Project: 기존 구현은 presentation hook과 Zustand designer store가 reset 이후 서로 다른 상태를 가질 수 있었다.
- Adoption Priority: 높음.
- Reflected Status: reset 계약 테스트가 hook state와 store state를 함께 검증.

### 2.3 클라이언트 상태 저장은 명시적인 lifecycle 경계가 필요하다

- Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- Key Summary: MDN은 Web Storage가 브라우저에 key-value 데이터를 저장하는 API이며, persistence가 session 흐름과 다를 수 있음을 보여준다.
- Applicability: WorkAI는 Zustand persist를 통해 designer store를 보존하므로, 새 session/reset을 시작할 때 명시적으로 store를 지워야 한다.
- Difference From This Project: 기존 reset은 persisted designer state를 직접 건드리지 않았다.
- Adoption Priority: 중간.
- Reflected Status: reset 테스트가 localStorage를 mock하고 persisted store reset까지 검증.

## 3. 제품 개선 결정

선택 기능: `Reset Clears Designer Store`

- `usePresentation`에서 `useSlideStore((state) => state.reset)`을 구독한다.
- `usePresentation.reset()`이 hook state를 비운 뒤 `resetSlideStore()`를 호출한다.
- 기존 `setExecutionPlan(null)` 호출은 유지해 reset 의도를 명시한다.
- 테스트는 stale deck, 4:3 ratio, history가 있는 designer store를 만든 뒤 reset 이후 모두 초기화되는지 확인한다.

## 4. A/B 테스트 설계

- Control A: 기존 hook-only reset. designer store에 stale presentation, 4:3 ratio, executionPlan/history가 남아 reset cleanliness score 0.
- Candidate B: hook reset이 `useSlideStore.reset()`도 호출해 presentation null, aspectRatio 16:9, executionPlan null, history empty.
- 샘플: 단일 cover slide가 든 stale deck과 4:3 store state.
- 평가 기준: reset 이후 hook presentation은 null, step은 upload, designer store cleanliness score는 4.
- 실제 결과: baseline 0, candidate 4.
- 구현 위치: `src/hooks/usePresentation-reset.test.tsx`.
- 1차 검증: `npx vitest run src/hooks/usePresentation-reset.test.tsx src/components/presentation-labels.test.ts src/lib/presentation-storage.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `Index.handleBack`에서 reset과 active app 전환 순서를 Playwright로 검증.
- reset 이후 persisted storage key가 의도대로 비워졌는지 별도 store-level test 강화.
- PDF/audio/translator workspace도 reset lifecycle이 명확한지 audit.

## 6. 이번 루프 반영 상태

- 반영됨: `src/hooks/usePresentation.ts` reset 시 designer store reset 호출.
- 반영됨: `src/hooks/usePresentation-reset.test.tsx` stale designer store reset A/B 테스트.
- 검증 완료: `npx vitest run src/hooks/usePresentation-reset.test.tsx src/components/presentation-labels.test.ts src/lib/presentation-storage.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 27개 파일 74개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
