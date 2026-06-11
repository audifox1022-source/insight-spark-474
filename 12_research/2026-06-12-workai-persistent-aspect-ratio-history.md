# WorkAI Persistent Aspect Ratio History 리서치

작성일: 2026-06-12
대상 제품: WorkAI 저장된 발표자료 히스토리, 16:9/4:3 비율 복원, PDF/PPTX export
이번 루프 결론: 직전 루프에서 헤더 export가 현재 `aspectRatio`를 전달하도록 고쳤지만, 저장된 발표자료 레코드에는 덱별 비율이 없었다. 4:3 덱을 저장해도 불러오기 시 현재 전역 store 비율에 의존할 수 있어, preview/export 결과가 저장 당시의 deck shape와 달라질 위험이 있었다. 저장 히스토리는 deck-level artifact이므로 슬라이드와 함께 aspect ratio도 보존해야 한다.

## 1. 현재 제품 관찰

- `useSlideStore`는 `aspectRatio`를 전역 UI 상태로 가지고 있고 Zustand persist에도 포함한다.
- `savePresentation`은 title/slides/settings/meetingInfo/template만 저장하고 `aspectRatio`는 저장하지 않았다.
- `loadSavedPresentation`은 slides/settings를 복원하지만 store의 `setAspectRatio`를 호출하지 않았다.
- 결과적으로 사용자가 여러 덱을 16:9와 4:3으로 번갈아 저장하면, 불러온 덱의 비율이 저장된 덱이 아니라 마지막 전역 UI 상태에 의해 결정될 수 있었다.

## 2. 외부 리서치 요약

### 2.1 PowerPoint slide size는 발표자료 산출물의 핵심 속성이다

- Source URL: https://support.microsoft.com/en-us/office/change-the-page-layout-49030c0f-9cd9-4f92-a894-605bc0671d10
- Key Summary: Microsoft Support는 PowerPoint의 Slide Size에서 크기를 선택하거나 width/height를 지정할 수 있고, 레이아웃 변경 시 content fit까지 고려해야 한다고 안내한다.
- Applicability: WorkAI의 저장된 deck은 slide content뿐 아니라 선택된 slide size도 함께 복원되어야 실제 발표자료 상태를 재현한다.
- Difference From This Project: 기존 저장 모델은 slide size에 해당하는 `aspectRatio`를 deck 레코드에 포함하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `SavedPresentation`에 `aspectRatio`를 추가하고 save/load 흐름에 연결.

### 2.2 저장소에 넣는 데이터는 이후 방문과 작업 복원에 쓰인다

- Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- Key Summary: MDN은 Web Storage가 브라우저에서 key-value 데이터를 저장하고 가져오는 API이며, `localStorage`/`sessionStorage`가 동기적으로 동작한다고 설명한다.
- Applicability: WorkAI의 localStorage 기반 저장 히스토리는 사용자가 다시 불러왔을 때 작업 맥락을 복원해야 하므로 deck-specific UI metadata도 포함해야 한다.
- Difference From This Project: 기존 저장 레코드는 비율 metadata를 누락해 같은 deck을 완전하게 재구성하지 못했다.
- Adoption Priority: 중간.
- Reflected Status: 저장 시 `aspectRatio`를 직렬화하고 legacy/invalid 값은 `16:9`로 정규화.

### 2.3 저장/불러오기 결과도 제품 내부 일관성을 지켜야 한다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 제품 내부에서 같은 개념과 동작이 일관되어야 사용자가 결과를 예측할 수 있다고 설명한다.
- Applicability: 4:3으로 저장한 발표자료는 나중에 불러와도 4:3 preview와 4:3 export를 제공해야 한다.
- Difference From This Project: 기존 load flow는 저장 당시 비율을 모르기 때문에 헤더/편집 export 개선을 안정적으로 활용할 수 없었다.
- Adoption Priority: 높음.
- Reflected Status: `loadSavedPresentation`이 저장된 ratio를 store의 `setAspectRatio`로 복원.

## 3. 제품 개선 결정

선택 기능: `Persistent Aspect Ratio History`

- `SavedPresentation`에 optional `aspectRatio` 필드를 추가한다.
- `savePresentation`에 optional ratio 인자를 추가하고, 저장 레코드에 `16:9` 또는 `4:3`만 기록한다.
- 기존 저장 데이터와 잘못된 값은 `normalizeSavedAspectRatio`로 `16:9` fallback 처리한다.
- `usePresentation.handleSave`는 현재 store의 `aspectRatio`를 함께 저장한다.
- `usePresentation.loadSavedPresentation`은 저장된 `aspectRatio`를 store에 복원한다.
- `HistoryPanel` 목록에 저장된 비율을 표시해 사용자가 deck shape를 미리 확인할 수 있게 한다.

## 4. A/B 테스트 설계

- Control A: 기존 저장 레코드. 저장된 item에 `aspectRatio`가 없어 4:3 preservation score 0.
- Candidate B: 저장 시 `aspectRatio: '4:3'`가 레코드에 남고, 같은 id 업데이트 시 ratio도 갱신.
- 샘플: 단일 cover slide deck, 4:3 저장, 같은 deck 16:9 -> 4:3 업데이트.
- 평가 기준: 저장된 item의 `aspectRatio`가 `4:3`이고, update flow에서 중복 없이 ratio가 갱신되어야 한다.
- 실제 결과: baseline 0, candidate 1.
- 구현 위치: `src/lib/presentation-storage.test.ts`.
- 1차 검증: `npx vitest run src/lib/presentation-storage.test.ts src/components/designer/EditorHeader.test.tsx src/components/ViewExportMenu.test.tsx` 통과, 3개 파일 4개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- 저장된 deck을 실제로 불러온 뒤 editor canvas aspect class가 바뀌는 UI 통합 테스트.
- `Presentation` type 자체에 `aspectRatio`를 둘지, 저장 메타데이터로 유지할지 장기 모델링 검토.
- 4:3/16:9 혼합 히스토리에서 thumbnail 비율도 저장해 목록 가독성 개선.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/presentation-storage.ts` 저장 레코드 aspect ratio 필드와 정규화 helper.
- 반영됨: `src/hooks/usePresentation.ts` save/load 시 store aspect ratio 연결.
- 반영됨: `src/components/HistoryPanel.tsx` 저장된 비율 표시.
- 반영됨: `src/lib/presentation-storage.test.ts` 4:3 저장/업데이트 A/B 검증.
- 검증 완료: `npx vitest run src/lib/presentation-storage.test.ts src/components/designer/EditorHeader.test.tsx src/components/ViewExportMenu.test.tsx` 통과, 3개 파일 4개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 24개 파일 70개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
