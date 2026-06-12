# WorkAI Chart Business Field Inference Research

## 연구 목적

WorkAI의 차트 렌더러와 내보내기 경로는 `label/name`과 `value`를 가진 표준 chart point를 기대한다. 그러나 실제 AI 응답은 업무 원자료에 가까운 `{ month, revenue }`, `{ region, conversion_rate }` 같은 필드명을 그대로 반환할 수 있다. 기존 normalizer는 고정 value alias만 읽어 이런 차트 데이터를 빈 데이터로 만들 수 있으므로, label 후보와 숫자 measure 후보를 보수적으로 추론하는 정규화를 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/structured-output

Key Summary: Gemini API 문서는 JSON Schema 기반 구조화 출력이 예측 가능하고 type-safe한 응답을 만들며 데이터 추출과 도구 입력에 유용하다고 설명한다.

Applicability: WorkAI도 구조화된 차트 데이터를 요청하지만 모델 응답이 항상 `label`과 `value`라는 정확한 키를 쓰리라는 보장은 약하다. 앱 경계에서 유연한 필드명을 표준 chart point로 보정해야 한다.

Difference From This Project: Gemini 문서는 모델 출력 제어 방법이고, 이번 변경은 이미 수신한 차트 row를 렌더러/내보내기 계약에 맞게 정규화하는 후처리다.

Adoption Priority: High

Reflected Status: `normalizeChartPoint`가 고정 `value` alias 외에도 object row의 첫 번째 업무 숫자 필드를 chart value로 승격한다.

## Source 2

Source URL: https://observablehq.com/blog/reshaping-data-plot-d3

Key Summary: Observable은 Plot과 D3가 기대하는 데이터 형태를 설명하면서, wide/nested/messy data를 시각화에 맞는 tidy 형태로 바꾸는 전처리가 중요하다고 설명한다.

Applicability: AI가 생성한 `{ month, revenue }` row는 업무 친화적인 wide-ish 데이터이고, WorkAI 렌더러는 `{ label, value }` 형태를 기대한다. normalizer가 이 변환을 수행해야 차트가 비지 않는다.

Difference From This Project: Observable 문서는 JavaScript 시각화 라이브러리의 데이터 재구성 설명이고, WorkAI 변경은 발표 슬라이드 chart point 변환에 한정한다.

Adoption Priority: High

Reflected Status: `month`, `quarter`, `region`, `product`, `channel` 등 dimension 후보를 label로 읽고, label/metadata가 아닌 숫자 필드를 measure로 읽는다.

## Source 3

Source URL: https://vega.github.io/vega-lite/docs/type.html

Key Summary: Vega-Lite 문서는 quantitative type이 수량을 표현하는 숫자 데이터이고, nominal/ordinal/temporal field와 의미가 다르다고 설명한다.

Applicability: 차트 point를 만들 때 label은 dimension 역할이고 value는 quantitative measure 역할이다. 숫자로 파싱 가능한 업무 필드를 value로 승격하되, `month/year/region` 같은 dimension 후보는 measure 추론에서 제외해야 한다.

Difference From This Project: Vega-Lite는 시각화 문법 전체의 field type 설명이고, WorkAI는 렌더러가 읽는 간단한 `{label,value}` 객체로 정규화한다.

Adoption Priority: Medium

Reflected Status: label 후보 키와 metadata 키를 measure 스캔에서 제외해 `year` 같은 dimension을 잘못된 value로 쓰지 않도록 했다.

## Source 4

Source URL: https://help.tableau.com/current/pro/desktop/en-us/what_chart_example.htm

Key Summary: Tableau 문서는 시간에 따른 변화를 보려면 변화 대상이 되는 value와 date field를 이해해야 한다고 설명한다.

Applicability: 월별 매출, 분기별 전환율 같은 WorkAI 발표 차트는 시간 dimension과 business measure 조합이 흔하다. `month`를 label로, `revenue`를 value로 변환하면 생성 결과가 곧바로 차트로 표시된다.

Difference From This Project: Tableau 문서는 차트 선택과 분석 관점이고, WorkAI 변경은 AI 응답 field alias를 렌더 가능한 데이터 계약으로 바꾸는 구현이다.

Adoption Priority: Medium

Reflected Status: A/B 테스트는 legacy가 `{ month, revenue }` chart row를 0개만 렌더 가능하게 보는 반면 candidate가 두 chart point를 생성함을 확인한다.

## 적용 결정

- `CHART_LABEL_KEYS`를 도입해 `month`, `quarter`, `region`, `product`, `channel` 등 업무 dimension field를 label 후보로 읽는다.
- `value/amount/count/score/y/result/total` 같은 명시 value alias를 우선한다.
- 명시 value alias가 없으면 label 후보와 metadata를 제외한 object field 중 첫 번째 숫자 파싱 가능 값을 chart value로 사용한다.
- 추론된 value field는 `valueField`에 보존해 디버깅과 후속 확장을 쉽게 한다.
- 원본 row 필드는 그대로 보존해 정보 손실 없이 `label`, `name`, `value`만 추가한다.

## 검증

- Targeted test: `npx vitest run src/presentation-normalizer.test.ts` 통과(1파일/7테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(36파일/98테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
