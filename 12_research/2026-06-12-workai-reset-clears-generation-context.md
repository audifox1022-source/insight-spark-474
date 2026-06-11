# WorkAI Reset Clears Generation Context Research

## 연구 목적

WorkAI의 reset은 화면 단계를 upload로 돌리고 일부 데이터 상태를 비웠지만, `MeetingInfo`, template, `sourceFileData`, reference 상태, 현재 슬라이드 인덱스 일부가 남을 수 있었다. 브리프 필드와 생성 프롬프트 컨텍스트가 강화된 이후에는 reset 후 이전 발표의 제목, 목표, 원문이 다음 생성에 섞일 위험이 커진다. reset이 생성 컨텍스트를 명확히 초기화하도록 개선하는 변경을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/user-control-and-freedom/

Key Summary: NN/g는 사용자가 실수하거나 방향을 바꿀 때 명확한 탈출구와 상태 복구 수단이 필요하다고 설명한다. 사용자는 시스템 상태를 직접 통제할 수 있어야 한다.

Applicability: WorkAI에서 홈/초기화 동작은 새 발표 작업을 시작하는 명확한 상태 전환이다. 이전 브리프와 소스 데이터가 남으면 사용자가 reset을 눌러도 실제 생성 컨텍스트는 통제되지 않는다.

Difference From This Project: NN/g 문서는 일반 UX 휴리스틱이다. WorkAI 변경은 reset 함수의 구체적인 state clearing 계약이다.

Adoption Priority: High

Reflected Status: `reset`에서 `info`, `template`, `sourceFileData`, `referenceFileName`, `referenceStructure`, `aiParts`, `currentSlideIndex`까지 초기화하도록 확장했다.

## Source 2

Source URL: https://www.nngroup.com/articles/consistency-and-standards/

Key Summary: NN/g는 사용자가 같은 UI 패턴에서 같은 결과를 기대할 수 있어야 하며, 시스템 내부 일관성이 학습과 예측 가능성을 높인다고 설명한다.

Applicability: reset은 사용자가 새 시작 상태를 기대하는 공통 패턴이다. 일부 컨텍스트만 지우고 일부는 남기는 동작은 상태 일관성을 해친다.

Difference From This Project: 해당 리서치는 UX 원칙이고, WorkAI는 hook state와 designer store state를 함께 정리하는 구현 계약을 만든다.

Adoption Priority: High

Reflected Status: 기존 designer store reset에 더해 hook generation context도 동일 reset 동작 안에서 정리한다.

## Source 3

Source URL: https://www.nngroup.com/articles/recognition-and-recall/

Key Summary: NN/g는 UI가 사용자가 숨은 상태를 기억하거나 추론하게 만들지 않아야 하며, 현재 상태가 인식 가능해야 한다고 설명한다.

Applicability: reset 후 보이지 않는 `sourceFileData`나 브리프 메타데이터가 남으면 사용자는 다음 생성 결과가 왜 이전 자료를 반영했는지 알기 어렵다. 숨은 상태를 제거하는 편이 예측 가능하다.

Difference From This Project: NN/g는 인지 원칙이고, WorkAI 변경은 숨은 생성 입력 상태를 reset 때 제거하는 코드 변경이다.

Adoption Priority: Medium

Reflected Status: `src/hooks/usePresentation-reset.test.tsx`에서 legacy context score 1 대비 candidate score 5를 확인한다.

## Source 4

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

Key Summary: MDN은 `localStorage` 데이터가 세션 간 지속된다고 설명한다. 지속 상태와 런타임 상태는 앱이 명확하게 관리해야 한다.

Applicability: WorkAI는 저장 목록 같은 지속 상태와 현재 생성 중인 런타임 상태를 함께 다룬다. reset은 저장 목록이 아니라 현재 생성 컨텍스트만 정리해야 한다.

Difference From This Project: MDN은 저장소 API이고, WorkAI 변경은 reset 시 현재 런타임 상태를 정리하는 로직이다.

Adoption Priority: Medium

Reflected Status: reset은 `savedPresentations` 같은 저장 목록 상태는 건드리지 않고 현재 생성 컨텍스트만 초기화한다.

## 적용 결정

- reset 시 `MeetingInfo`를 `createDefaultMeetingInfo()`로 복원한다.
- template은 `auto`, currentSlideIndex는 0으로 복원한다.
- `sourceFileData`, `aiParts`, reference 파일명/구조를 비운다.
- 기존 dataFiles/dataSummary/presentation/outline/designer store 초기화는 유지한다.
- A/B 테스트는 기존 reset에서 남던 generation context 대비 후보 reset이 default info, auto template, empty source/data, slide index 0을 만족하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/hooks/usePresentation-reset.test.tsx` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(34파일/90테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
