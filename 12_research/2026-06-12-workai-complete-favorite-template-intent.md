# WorkAI Complete Favorite Template Intent Research

## 연구 목적

WorkAI의 발표 설정 즐겨찾기가 템플릿, 설정, 부서, 보고자만 저장하고 발표 제목, 목표, 청중, 톤, 참고사항을 보존하지 않는 문제를 검토했다. 사용자가 반복 업무용 설정을 저장했을 때 실제 발표 의도까지 복원되어야 인사이트 품질 게이트와 프롬프트 컨텍스트가 일관되게 작동한다.

## Source 1

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API

Key Summary: MDN은 Web Storage API가 브라우저에서 key/value 데이터를 저장하고, `localStorage`는 브라우저를 닫았다가 다시 열어도 데이터를 유지한다고 설명한다. 또한 객체나 배열은 문자열로 변환해 저장해야 한다고 안내한다.

Applicability: WorkAI 즐겨찾기는 `localStorage`에 JSON 직렬화된 설정 객체를 저장한다. 저장 스냅샷이 누락된 필드를 갖고 있으면 브라우저 저장소 자체는 정상이어도 복원되는 사용자 의도가 불완전해진다.

Difference From This Project: MDN은 저장소 API 사용법 자체를 설명한다. WorkAI 변경은 저장소 API가 아니라 저장할 데이터 모델의 완전성과 병합 로직을 개선한다.

Adoption Priority: High

Reflected Status: `createFavoriteMeetingInfoSnapshot`을 추가해 `MeetingInfo`의 발표 제목, 목표, 청중, 톤, 주차/기간, 부서, 보고자, 참고사항을 하나의 저장 스냅샷으로 보존했다.

## Source 2

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

Key Summary: MDN의 `localStorage` 문서는 저장된 데이터가 브라우저 세션 간 유지되며, 같은 origin의 저장소 객체를 통해 접근된다고 설명한다. 또한 사용자나 브라우저 정책이 persistence를 제한할 수 있다고 언급한다.

Applicability: 즐겨찾기 템플릿은 사용자가 다음 세션에서도 반복 설정을 재사용하기 위한 기능이다. 따라서 저장되는 데이터가 실제 재사용 의도를 대표해야 한다.

Difference From This Project: MDN 문서는 persistence 동작을 다루고, WorkAI는 persistence 대상 필드의 품질을 다룬다.

Adoption Priority: Medium

Reflected Status: 기존 저장 포맷과 호환되도록 partial favorite을 병합하면서도 새 저장은 전체 `MeetingInfo`를 포함하게 했다.

## Source 3

Source URL: https://www.nngroup.com/articles/recognition-and-recall/

Key Summary: Nielsen Norman Group은 recognition이 recall보다 쉽고, 인식 기반 UI는 사용자가 정보를 기억해내는 부담을 줄인다고 설명한다. 더 풍부한 맥락은 사용자가 이전 작업이나 항목을 떠올리는 데 도움이 된다고 정리한다.

Applicability: 발표 설정 즐겨찾기는 사용자가 매번 제목, 목표, 청중, 톤을 다시 기억해서 입력하지 않도록 돕는 recognition 기반 기능이다. 일부 필드만 복원되면 사용자는 핵심 의도를 다시 recall해야 한다.

Difference From This Project: NN/g 문서는 일반 UX 원칙이고, WorkAI는 발표 생성 폼의 저장/복원 동작이다. 원칙을 즐겨찾기 데이터 완전성 테스트로 변환했다.

Adoption Priority: High

Reflected Status: A/B 테스트에서 legacy snapshot completeness score 2 대비 candidate score 8을 확인하도록 했다.

## Source 4

Source URL: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/

Key Summary: NN/g는 폼 입력이 해석, 정보 회수, 포맷 판단을 요구하는 정신적 작업이며, 구조, 투명성, 명확성, 지원이 인지부하를 줄인다고 설명한다. 관련 필드를 함께 그룹화하고 적절한 지원을 제공하면 사용자가 더 적은 노력으로 폼을 완료할 수 있다.

Applicability: 발표 설정 폼은 긴 다단계 입력 흐름이다. 즐겨찾기 불러오기가 전체 의도를 한 번에 복원하면 반복 입력과 context switching을 줄인다.

Difference From This Project: 해당 문서는 폼 디자인 원칙 전반을 다룬다. WorkAI는 UI 레이아웃 변경보다 저장/복원 지원 기능을 개선했다.

Adoption Priority: Medium

Reflected Status: `mergeFavoriteMeetingInfo`를 추가해 구형 partial favorite도 안전하게 병합하고, 폼은 한 번의 `onChange` 호출로 전체 메타데이터를 복원한다.

## 적용 결정

- 즐겨찾기 저장 시 `department`, `reporter`만 저장하던 동작을 전체 `MeetingInfo` 스냅샷 저장으로 바꾼다.
- 구형 즐겨찾기는 partial 데이터로 간주해 현재 입력값과 안전하게 병합한다.
- 즐겨찾기 불러오기에서 `onChange`를 여러 번 호출하지 않고, 병합된 `MeetingInfo`로 한 번만 호출한다.
- A/B 테스트는 legacy snapshot이 2개 필드만 보존하는 반면 candidate가 8개 메타데이터 필드를 보존하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/favorite-templates.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(30파일/80테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
