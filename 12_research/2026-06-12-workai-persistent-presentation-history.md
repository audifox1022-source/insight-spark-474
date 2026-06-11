# WorkAI Persistent Presentation History 리서치

작성일: 2026-06-12
대상 제품: WorkAI 발표자료 저장, 저장 목록, 불러오기/삭제
이번 루프 결론: 제품에는 저장 버튼, 저장 목록 버튼, `presentation-storage.ts`, `HistoryPanel`이 이미 존재했지만 `handleSave`는 실제 저장 없이 1초 대기 후 성공 toast만 표시했다. 사용자가 생성/편집한 발표자료를 세션 이후에도 다시 열 수 있어야 제품 완성도가 올라가므로, 기존 localStorage 저장 모듈과 히스토리 패널을 실제 흐름에 연결한다.

## 1. 현재 제품 관찰

- `src/lib/presentation-storage.ts`는 `savePresentation`, `loadPresentations`, `deletePresentation`을 이미 제공한다.
- `HistoryPanel`은 저장된 발표자료 목록 UI, 불러오기, 삭제 버튼을 이미 갖고 있다.
- `Index`의 헤더에는 "저장 목록" 버튼이 있고 `usePresentation.openHistory`를 호출한다.
- 하지만 `HistoryPanel`은 메인 페이지에 렌더링되지 않았고, `handleSave`는 실제 저장 없이 `setTimeout` 후 toast만 표시했다.
- 결과적으로 사용자는 "저장 완료" 메시지를 봐도 새로고침/재방문 후 발표자료를 복구할 수 없었다.

## 2. 외부 리서치 요약

### 2.1 저장 버튼은 사용자가 명시적으로 제어하는 문서 작업의 핵심 기대다

- Source URL: https://www.nngroup.com/articles/efficiency-vs-expectations/
- Key Summary: Nielsen Norman Group은 Save 버튼을 없애거나 기대와 다르게 동작시키면 사용자가 인터페이스 통제감을 잃을 수 있다고 설명한다.
- Applicability: WorkAI에 저장 버튼이 있다면 실제로 사용자의 현재 발표자료 상태를 저장해야 한다.
- Difference From This Project: 기존 구현은 Save UI와 성공 toast는 있었지만 지속 저장이 없어 기대와 결과가 불일치했다.
- Adoption Priority: 높음.
- Reflected Status: `handleSave`가 실제 `savePresentation`을 호출하고 저장 목록을 갱신하도록 변경.

### 2.2 localStorage는 같은 origin에서 세션을 넘어 데이터를 유지할 수 있다

- Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Key Summary: MDN은 `localStorage`가 document origin에 연결된 Storage 객체이며 브라우저 세션을 넘어 저장 데이터를 유지한다고 설명한다.
- Applicability: WorkAI의 개인 작업 초안, 최근 생성물, local-first 저장 목록은 localStorage로 시작하기에 적합하다.
- Difference From This Project: 저장 모듈은 있었지만 실제 UI workflow에 연결되지 않았다.
- Adoption Priority: 높음.
- Reflected Status: 저장 버튼, 저장 목록 버튼, HistoryPanel의 load/delete 흐름을 localStorage 저장 모듈에 연결.

### 2.3 브라우저 저장소는 best-effort 성격이므로 critical data에는 한계를 명확히 봐야 한다

- Source URL: https://web.dev/articles/storage-for-the-web
- Key Summary: web.dev는 웹 저장소가 best-effort와 persistent bucket으로 나뉘며, best-effort 데이터는 브라우저 상황에 따라 제거될 수 있다고 설명한다.
- Applicability: WorkAI localStorage 저장은 서버 저장 전 단계의 로컬 작업 복구 기능으로 유용하지만, 장기/공식 보관까지 보장하는 저장소로 과장하면 안 된다.
- Difference From This Project: 이번 루프는 서버 동기화가 아니라 이미 존재하는 localStorage 저장 기능을 실제 product workflow에 연결하는 범위다.
- Adoption Priority: 중간.
- Reflected Status: 저장 실패 시 toast/error를 표시하고, 현재 범위는 local-first 히스토리로 제한.

### 2.4 사용자는 실수하거나 마음을 바꿀 수 있으므로 이전 상태로 돌아갈 방법이 필요하다

- Source URL: https://www.nngroup.com/articles/user-control-and-freedom/
- Key Summary: NN/g의 사용자 제어와 자유 휴리스틱은 사용자가 이전 상태로 돌아가거나 실수에서 회복할 수 있어야 한다고 설명한다.
- Applicability: 저장 목록에서 이전 발표자료를 불러오거나 삭제할 수 있는 기능은 생성/편집 실패 후 회복 경로가 된다.
- Difference From This Project: 기존에는 저장 목록 버튼이 있어도 실제 목록 패널과 연결되지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `HistoryPanel`을 `Index`에 렌더링하고 `loadSavedPresentation`, `deleteSavedPresentation`을 연결.

## 3. 제품 개선 결정

선택 기능: `Persistent Presentation History`

- `usePresentation.handleSave`를 실제 `savePresentation(presentation, info, settings, template)` 호출로 변경.
- 저장 후 `loadPresentations`로 저장 목록 상태를 갱신.
- `openHistory`는 패널을 열고 저장 목록을 로드.
- `loadSavedPresentation`은 저장된 slides를 `normalizePresentationSlides`로 정규화한 뒤 preview 상태로 복원.
- `deleteSavedPresentation`은 localStorage에서 삭제하고 목록 상태를 즉시 갱신.
- `Index`에 `HistoryPanel`을 렌더링해 헤더의 "저장 목록" 버튼이 실제 UI를 열도록 연결.

## 4. A/B 테스트 설계

- Control A: 기존 no-op 저장. 저장 성공 toast는 있지만 storage에 기록 없음.
- Candidate B: `savePresentation`/`loadPresentations`/`deletePresentation` workflow.
- 샘플: 1장짜리 발표자료, meetingInfo, settings, template.
- 평가 기준: 저장 목록 1개 생성, id/title/slides/meetingInfo/settings/template/updatedAt 보존, 삭제 후 빈 목록, 같은 id 재저장 시 중복 없이 update.
- 실제 결과: baseline score 0, candidate score 8.
- 구현 위치: `src/lib/presentation-storage.test.ts`.
- 1차 검증: `npx vitest run src/lib/presentation-storage.test.ts src/lib/presentation-review-contract.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 7개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- localStorage 용량 초과 시 사용자에게 JSON/PPTX export를 제안.
- Supabase 계정 기반 클라우드 저장과 localStorage fallback 동기화.
- 저장 목록에 검색, 정렬, 즐겨찾기 제공.
- 저장된 발표자료를 불러올 때 현재 덱 덮어쓰기 확인 모달 제공.

## 6. 이번 루프 반영 상태

- 반영됨: `src/hooks/usePresentation.ts` 실제 저장/목록 로드/불러오기/삭제 workflow 연결.
- 반영됨: `src/pages/Index.tsx`에 `HistoryPanel` 렌더링.
- 반영됨: `src/lib/presentation-storage.test.ts` 저장 workflow A/B 테스트 추가.
- 검증 완료: `npx vitest run src/lib/presentation-storage.test.ts src/lib/presentation-review-contract.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 7개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 20개 파일 64개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
