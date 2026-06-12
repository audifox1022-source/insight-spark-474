# WorkAI Empty Visual Data Audit Research

## 연구 목적

WorkAI 품질 감사는 차트/표 슬라이드에 시각화 데이터가 없으면 `시각화 데이터 누락`을 알려야 한다. 그러나 기존 구현은 `chartData: { data: [] }`나 `tableData: { columns, rows: [] }`처럼 빈 객체 구조도 truthy 값이라는 이유로 데이터가 있다고 판단할 수 있었다. 품질 패널이 실제로 비어 있는 차트/표를 놓치지 않도록 렌더 가능한 point/row 존재 여부를 기준으로 검수하는 방식을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/empty-state-interface-design/

Key Summary: NN/g는 empty state가 시스템 상태를 사용자에게 전달하고 다음 행동 경로를 제공해야 한다고 설명한다.

Applicability: WorkAI의 품질 패널은 빈 차트/표 상태를 조용히 통과시키는 대신, 사용자가 어떤 데이터를 추가해야 하는지 알려야 한다.

Difference From This Project: NN/g 문서는 UI empty state 설계 원칙이고, 이번 변경은 empty state를 직접 렌더링하지 않고 품질 감사 이슈로 노출한다.

Adoption Priority: High

Reflected Status: `hasVisualizationData`가 빈 chart/table shell을 데이터 있음으로 보지 않고 `시각화 데이터 누락` 이슈를 생성한다.

## Source 2

Source URL: https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm

Key Summary: Tableau Blueprint는 유익한 시각화가 사용자가 답을 얻고 행동할 수 있게 해야 하며, 사용할 수 없는 대시보드는 가치가 떨어진다고 설명한다.

Applicability: chart/table 레이아웃은 실제 point/row가 있어야 의사결정 근거가 된다. 빈 데이터 구조를 근거 신호로 세면 품질 점수가 과대평가된다.

Difference From This Project: Tableau 문서는 대시보드 시각화 원칙이고, WorkAI 변경은 발표 슬라이드의 데이터 존재 검증 로직이다.

Adoption Priority: High

Reflected Status: evidence signal 계산도 렌더 가능한 시각화 데이터가 있을 때만 증가한다.

## Source 3

Source URL: https://vega.github.io/vega-lite/docs/invalid-data.html

Key Summary: Vega-Lite는 null/NaN 같은 invalid data를 어떻게 처리할지 별도 모드로 다룬다. 시각화는 유효하지 않은 데이터 상태를 명시적으로 고려해야 한다.

Applicability: WorkAI도 빈 배열, 빈 rows, 무효 chartData를 유효한 데이터처럼 취급하지 않아야 한다. 데이터 shell과 실제 렌더 가능한 데이터는 구분되어야 한다.

Difference From This Project: Vega-Lite는 렌더링 엔진의 invalid data 처리이고, WorkAI는 감사 단계에서 empty/invalid visual data를 사전에 감지한다.

Adoption Priority: Medium

Reflected Status: `normalizeChartData`와 `normalizeTableData` 결과가 비어 있으면 시각화 데이터 없음으로 판정한다.

## Source 4

Source URL: https://carbondesignsystem.com/patterns/empty-states-pattern/

Key Summary: Carbon Design System은 empty state를 표시할 데이터가 없는 순간으로 정의하고, 데이터가 삭제되었거나 사용할 수 없을 때도 적용된다고 설명한다.

Applicability: 생성형 AI가 차트 shell만 만들고 row를 비우는 경우는 “표시할 데이터가 없는 상태”다. 품질 감사는 이를 명확히 드러내야 한다.

Difference From This Project: Carbon은 디자인 패턴 문서이고, WorkAI는 empty visual state를 검수 항목으로 변환한다.

Adoption Priority: Medium

Reflected Status: A/B 테스트는 legacy truthy visualization score 2 대비 candidate가 빈 chart/table shell 모두를 `시각화 데이터 누락`으로 잡는지 확인한다.

## 적용 결정

- `hasVisualizationData`는 더 이상 객체 존재 여부만 확인하지 않는다.
- chart source는 `normalizeChartData(source).length > 0`일 때만 데이터 있음으로 판단한다.
- table source는 `normalizeTableData(source)`가 columns와 rows를 모두 가진 경우에만 데이터 있음으로 판단한다.
- chart/table 레이아웃의 generic `content_data`도 해당 레이아웃에 맞춰 검사한다.
- timeline 데이터는 의미 있는 배열 항목이 있을 때만 데이터 있음으로 판단한다.
- A/B 테스트는 빈 chart/table shell이 legacy에서는 데이터 있음으로 보이지만 candidate에서는 각각 누락 이슈로 잡히는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/deck-quality-audit.test.ts` 통과(1파일/6테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(36파일/99테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
