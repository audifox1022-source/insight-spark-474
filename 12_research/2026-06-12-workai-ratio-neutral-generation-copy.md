# WorkAI Ratio Neutral Generation Copy 리서치

작성일: 2026-06-12
대상 제품: WorkAI 목차 승인 화면, 16:9/4:3 비율 지원, 사용자 안내 문구
이번 루프 결론: WorkAI는 이제 편집, 저장, 내보내기, 썸네일 흐름에서 16:9와 4:3을 모두 지원한다. 하지만 목차 승인 버튼 문구는 여전히 “이 구성으로 16:9 슬라이드 생성”으로 고정되어 있어, 사용자가 4:3 덱을 저장/복원하거나 편집할 수 있는 현재 제품 상태와 맞지 않았다. 생성 단계의 버튼은 특정 비율을 약속하지 않는 중립 문구를 사용해야 한다.

## 1. 현재 제품 관찰

- 4:3 비율은 `SlideEditor`에서 전환할 수 있고, PDF/PPTX export와 저장 히스토리에도 반영된다.
- 목차 승인 화면의 CTA는 비율 상태를 받지 않으면서도 “16:9 슬라이드 생성”이라고 고정 표시했다.
- 실제 생성 직후에는 디자이너로 이동해 비율을 선택할 수 있으므로, 해당 문구는 제품이 16:9 전용이라는 오해를 줄 수 있었다.
- 버튼 문구는 핵심 행동의 약속이므로 현재 기능 계약과 맞아야 한다.

## 2. 외부 리서치 요약

### 2.1 PowerPoint slide size는 16:9와 4:3 같은 선택 가능한 문서 속성이다

- Source URL: https://support.microsoft.com/en-us/office/change-the-page-layout-49030c0f-9cd9-4f92-a894-605bc0671d10
- Key Summary: Microsoft Support는 PowerPoint에서 Slide Size를 선택하거나 custom width/height로 변경할 수 있다고 안내한다.
- Applicability: WorkAI가 16:9와 4:3을 모두 지원한다면 생성 CTA가 특정 비율만 생성된다고 말하면 안 된다.
- Difference From This Project: 기존 CTA는 실제 제품 capability보다 좁은 “16:9” 약속을 했다.
- Adoption Priority: 중간.
- Reflected Status: CTA 문구를 `이 구성으로 슬라이드 생성`으로 변경.

### 2.2 제품 내부 용어와 행동은 일관되어야 한다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 같은 제품 안에서 용어와 동작이 일관되어야 사용자가 결과를 예측할 수 있다고 설명한다.
- Applicability: 저장/내보내기/편집 화면이 4:3을 지원한다면 생성 화면의 CTA도 16:9 전용처럼 표현하지 않아야 한다.
- Difference From This Project: 기존 copy는 최근 추가된 4:3 보존 흐름과 일관되지 않았다.
- Adoption Priority: 높음.
- Reflected Status: 생성 버튼 라벨을 비율 중립 상수로 분리하고 테스트로 고정.

### 2.3 인터페이스는 사용자가 현재 상태와 다음 결과를 정확히 이해하게 해야 한다

- Source URL: https://www.nngroup.com/articles/ten-usability-heuristics/
- Key Summary: NN/g의 usability heuristics는 시스템 상태와 사용자가 기대하는 결과를 명확히 전달하는 것이 중요하다고 설명한다.
- Applicability: CTA가 “16:9”라고 쓰이면 사용자는 4:3 지원 여부를 의심할 수 있으므로, 실제 결과 범위와 맞는 문구가 필요하다.
- Difference From This Project: 기존 버튼은 상태가 아니라 과거 기본값을 문구로 고정했다.
- Adoption Priority: 중간.
- Reflected Status: label 상수와 copy regression test 추가.

## 3. 제품 개선 결정

선택 기능: `Ratio Neutral Generation Copy`

- `GENERATE_SLIDES_BUTTON_LABEL` 상수를 추가한다.
- 목차 승인 버튼은 `이 구성으로 슬라이드 생성`을 표시한다.
- 문구는 16:9/4:3 중 어느 한쪽도 언급하지 않는다.
- 이후 생성 단계에서 실제 비율 선택/내보내기는 디자이너의 aspect ratio control과 저장된 deck metadata가 담당한다.

## 4. A/B 테스트 설계

- Control A: 기존 CTA `이 구성으로 16:9 슬라이드 생성`. Ratio-neutral copy score 0.
- Candidate B: 새 CTA `이 구성으로 슬라이드 생성`. Ratio-neutral copy score 1.
- 샘플: 문자열 상수와 legacy 문자열.
- 평가 기준: CTA가 `슬라이드 생성` 행동은 유지하되 `16:9`/`4:3`을 포함하지 않아야 한다.
- 실제 결과: baseline 0, candidate 1.
- 구현 위치: `src/components/presentation-labels.test.ts`.
- 1차 검증: `npx vitest run src/components/presentation-labels.test.ts src/components/designer/slide-thumbnail-layout.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 6개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- 생성 전 단계에서 사용자가 기본 deck ratio를 선택할 수 있게 할지 검토.
- Help/Guide 문서에서 16:9/4:3 선택 위치와 저장/내보내기 보존 범위 설명.
- UI copy 상수를 더 모아 regression test가 쉬운 구조로 정리.

## 6. 이번 루프 반영 상태

- 반영됨: `src/components/presentation-labels.ts` 생성 CTA 라벨 상수.
- 반영됨: `src/components/PresentationTab.tsx` 목차 승인 버튼 비율 중립 문구 적용.
- 반영됨: `src/components/presentation-labels.test.ts` ratio-neutral copy A/B 테스트.
- 검증 완료: `npx vitest run src/components/presentation-labels.test.ts src/components/designer/slide-thumbnail-layout.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 6개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 26개 파일 73개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
