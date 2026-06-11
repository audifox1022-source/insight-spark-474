# WorkAI Normalize Loaded Meeting Info Research

## 연구 목적

저장된 발표자료를 불러올 때 `setInfo(prev => ({ ...prev, ...(item.meetingInfo || {}) }))` 방식은 구형 저장본처럼 일부 `MeetingInfo` 필드만 가진 데이터를 현재 세션의 제목, 목표, 청중, 톤과 섞을 수 있다. 저장본 복원 시 이전 세션 메타데이터가 새 발표자료에 누출되지 않도록 `MeetingInfo` 정규화 helper를 추가하는 변경을 검토했다.

## Source 1

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

Key Summary: MDN은 `localStorage` 데이터가 브라우저 세션 간 유지되고 같은 origin 저장소를 통해 접근된다고 설명한다. 지속되는 데이터는 다음 세션에서도 앱 상태로 복원될 수 있다.

Applicability: WorkAI 저장 목록은 `localStorage`에 저장된 발표자료와 메타데이터를 다시 앱 상태로 복원한다. 오래 유지되는 데이터일수록 현재 세션 상태와 섞이지 않도록 명확한 정규화가 필요하다.

Difference From This Project: MDN 문서는 저장소 API의 동작을 설명한다. WorkAI 변경은 저장소에서 읽은 데이터가 앱 상태로 들어올 때의 데이터 모델 정규화에 초점을 둔다.

Adoption Priority: High

Reflected Status: `normalizeMeetingInfo`를 추가해 저장본의 `meetingInfo`를 기본값 기반의 완전한 `MeetingInfo` 객체로 만든다.

## Source 2

Source URL: https://www.nngroup.com/articles/consistency-and-standards/

Key Summary: NN/g는 시스템이 내부/외부 일관성을 지켜야 배우고 사용하기 쉽다고 설명한다. 같은 패턴과 기대가 시스템 안에서 유지되어야 사용자가 혼란을 덜 겪는다.

Applicability: 저장된 발표자료를 불러오면 해당 발표자료의 제목, 목표, 청중, 톤이 화면과 생성 컨텍스트에 일관되게 반영되어야 한다. 이전 세션 값이 섞이면 사용자는 저장본의 상태를 신뢰하기 어렵다.

Difference From This Project: NN/g 문서는 UX 일관성 원칙이며, WorkAI 변경은 state restoration 계약을 코드로 고정한다.

Adoption Priority: High

Reflected Status: `loadSavedPresentation`에서 이전 `info`와 merge하지 않고 `normalizeMeetingInfo(item.meetingInfo)`로 교체하도록 수정했다.

## Source 3

Source URL: https://www.nngroup.com/articles/recognition-and-recall/

Key Summary: NN/g는 풍부한 맥락이 사용자가 정보와 작업을 다시 떠올리는 데 도움이 된다고 설명한다. 인터페이스는 사용자가 이전 상태를 기억해서 추론하게 하기보다 현재 상태를 명확히 보여주어야 한다.

Applicability: 저장본을 불러온 후 설정/품질 게이트/프롬프트 컨텍스트에 보이는 메타데이터는 해당 저장본에서 온 값이어야 한다. 누락 필드는 빈 값 또는 기본값으로 보여야 사용자가 보강 여부를 인식할 수 있다.

Difference From This Project: 해당 리서치는 일반 인지 원칙이다. WorkAI에서는 저장본 load 정규화 테스트로 변환했다.

Adoption Priority: Medium

Reflected Status: `src/lib/meeting-info.test.ts`에서 legacy merge가 stale metadata를 누출하는 반면 candidate는 누출 score 0임을 확인한다.

## Source 4

Source URL: https://www.nngroup.com/articles/user-control-and-freedom/

Key Summary: NN/g는 사용자가 시스템 상태를 바꾸는 작업에서 통제감을 가져야 하며, 명확한 복귀/취소/상태 변경 지점이 필요하다고 설명한다.

Applicability: 저장본 불러오기는 앱 상태를 크게 바꾸는 작업이다. 사용자가 선택한 저장본이 현재 작업 상태를 명확히 대체해야 통제감이 유지된다.

Difference From This Project: NN/g 문서는 UX 원칙이고, WorkAI 변경은 상태 변경 함수의 데이터 병합 정책이다.

Adoption Priority: Medium

Reflected Status: 저장본 load 경로가 이전 세션 `info`를 유지하지 않고 저장본 기반 normalized info로 상태를 대체한다.

## 적용 결정

- `createDefaultMeetingInfo`와 `normalizeMeetingInfo`를 새 helper로 추가한다.
- hook의 초기 `info`도 `createDefaultMeetingInfo`로 생성해 기본값을 한 곳에서 관리한다.
- 저장본 load 시 partial `meetingInfo`는 이전 상태와 merge하지 않고 기본값에 overlay한다.
- 구형 저장본은 누락 필드를 빈 값 또는 기본 `professional` tone으로 복원한다.
- A/B 테스트는 legacy merge에서 stale title/objective/audience/tone/notes가 누출되는 반면 candidate는 누출되지 않는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/meeting-info.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(34파일/89테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
