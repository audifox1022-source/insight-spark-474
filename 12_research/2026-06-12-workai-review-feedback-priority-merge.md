# WorkAI Review Feedback Priority Merge Research

## 연구 목적

WorkAI의 품질 정밀 검증은 로컬 덱 감사 결과를 먼저 표시하고, 이후 AI 리뷰어 제안을 뒤에 붙인 뒤 상위 12개만 노출했다. 로컬 감사가 이미 12개 이슈를 채우면 AI가 발견한 치명적 제안이 사라질 수 있어, 리뷰 패널의 제한된 공간 안에서 심각도와 critical 신호를 우선하는 병합 기준을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/

Key Summary: NN/g는 severity rating이 가장 심각한 문제에 자원을 배분하고 우선순위 결정을 돕는다고 설명한다. 심각도는 발생 빈도, 영향, 지속성을 함께 고려한 단일 평가로 사용할 수 있다.

Applicability: WorkAI 리뷰 패널도 제한된 12개 추천만 보여준다. 표시 슬롯이 제한된 상황에서는 생성 순서보다 심각도와 critical 여부가 더 높은 우선순위 기준이어야 한다.

Difference From This Project: NN/g 문서는 UX 문제 평가 원칙이고, WorkAI 변경은 로컬 감사와 AI 리뷰 결과 배열을 병합하는 TypeScript helper다.

Adoption Priority: High

Reflected Status: `mergeFeedbackImprovements`가 `critical` 또는 `severity`를 우선순위 점수로 변환해 상위 항목을 선택한다.

## Source 2

Source URL: https://www.nngroup.com/videos/prioritize-ux-findings-severity/

Key Summary: NN/g는 사용성 조사나 휴리스틱 평가 결과를 보고할 때 작은 기준 집합으로 심각도 등급을 부여해 우선순위를 정하라고 설명한다.

Applicability: WorkAI의 로컬 감사와 AI 리뷰어는 서로 다른 평가자처럼 동작한다. 여러 출처의 결과를 합칠 때도 공통 severity 기준이 있어야 중요한 제안이 누락되지 않는다.

Difference From This Project: NN/g는 UX findings 보고 방식이고, WorkAI는 자동 감사 결과와 AI 보강 제안을 하나의 패널에 합친다.

Adoption Priority: High

Reflected Status: 병합 helper는 로컬/AI 출처와 무관하게 같은 priority scoring을 적용하고 같은 우선순위는 기존 순서를 안정적으로 유지한다.

## Source 3

Source URL: https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm

Key Summary: Tableau Blueprint는 시각화가 청중이 답을 찾고 행동하도록 도와야 하며, 복잡한 결정을 쉽게 만드는 단순하고 논리적인 구성이 중요하다고 설명한다.

Applicability: 품질 리뷰 결과도 청중 역할의 사용자에게 바로 행동 가능한 순서로 보여야 한다. 낮은 위험 항목이 먼저 12개를 차지해 핵심 AI 제안을 숨기면 행동 가능성이 떨어진다.

Difference From This Project: Tableau 문서는 대시보드 설계 원칙이고, WorkAI 변경은 발표자료 검토 결과의 우선순위 병합 로직이다.

Adoption Priority: Medium

Reflected Status: 리뷰 패널에 전달되는 `improvements`는 단순 concat-slice 대신 우선순위 기반 helper 결과를 사용한다.

## Source 4

Source URL: https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm

Key Summary: Tableau는 잘 설계된 대시보드가 조직의 정렬, 핵심 인사이트 발견, 빠른 의사결정을 돕는다고 설명하며, 가장 중요한 뷰를 주목도가 높은 위치에 배치하라고 안내한다.

Applicability: WorkAI의 검토 패널은 발표자료의 품질 대시보드 역할을 한다. 중요한 문제가 목록 밖으로 밀리지 않아야 사용자가 빠르게 수정 결정을 내릴 수 있다.

Difference From This Project: Tableau는 데이터 대시보드 레이아웃 원칙이고, WorkAI는 리스트 제한 안에서 critical feedback을 보존하는 병합 정책이다.

Adoption Priority: Medium

Reflected Status: critical/high 항목이 낮은 우선순위 로컬 항목보다 먼저 노출되도록 정렬 후 limit을 적용한다.

## 적용 결정

- `src/lib/review-feedback.ts`에 `mergeFeedbackImprovements` 순수 helper를 추가한다.
- 로컬 감사 결과와 AI 리뷰 결과를 합친 뒤 `critical === true` 또는 `severity === 'high'`를 최우선으로 둔다.
- `severity === 'medium'` 또는 AI의 `critical === false` 제안은 중간 우선순위로 둔다.
- 같은 우선순위끼리는 기존 도착 순서를 유지해 로컬 감사의 안정적인 순서를 깨지 않는다.
- `SlideEditor`의 품질 정밀 검증 결과 병합은 기존 `[...local, ...ai].slice(0, 12)` 대신 helper를 사용한다.
- A/B 테스트는 로컬 감사 12개가 패널을 모두 채운 상황에서 legacy는 critical AI 제안을 잃고, candidate는 이를 첫 번째 항목으로 보존하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/review-feedback.test.ts` 통과(1파일/2테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(35파일/93테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
