# WorkAI Renderable Visualization Data Contract 리서치

작성일: 2026-06-12
대상 제품: WorkAI 차트/표 슬라이드 생성, 정규화, 렌더링
이번 루프 결론: 모델이 차트/표 레이아웃을 선택해도 데이터 구조가 렌더러가 기대하는 형태와 다르면 사용자는 빈 차트 또는 "유효한 데이터 구조 없음" 상태를 보게 된다. 생성 프롬프트만으로 모든 변형을 막기 어렵기 때문에, 정규화 단계에서 차트/표 데이터를 렌더 가능한 표준 계약으로 승격한다.

## 1. 현재 제품 관찰

- `SlideLayoutRenderer`의 차트 경로는 `content_data_chart`가 배열이거나 `chartData.data` 배열일 때만 실제 차트를 그린다.
- 모델은 흔히 `{ labels, datasets }`, `{ data: [...] }`, `{ headers, rows }`처럼 시각화 라이브러리나 테이블 관습이 섞인 구조를 반환할 수 있다.
- 기존 `normalizeSlideLayout`은 chart/table 레이아웃 의도는 보존하지만, 데이터 구조를 렌더러 표준으로 변환하지 않았다.
- 표 렌더러는 `columns + rows` 또는 row object 배열은 처리하지만, `headers + rows`는 처리하지 못해 유효한 데이터가 있어도 빈 상태가 될 수 있었다.
- 품질 감사는 데이터 필드 존재 여부를 보지만, 렌더러가 실제로 읽을 수 있는 구조인지까지 보장하지 못했다.

## 2. 외부 리서치 요약

### 2.1 데이터는 사람이 이해할 수 있고 소프트웨어가 처리할 수 있는 구조 메타데이터를 가져야 한다

- Source URL: https://www.w3.org/TR/dwbp/
- Key Summary: W3C Data on the Web Best Practices는 데이터의 내부 구조와 schema를 설명하는 구조 메타데이터가 사람의 이해와 소프트웨어 처리를 모두 돕는다고 설명한다.
- Applicability: WorkAI의 차트/표 데이터도 `columns`, `rows`, `label`, `value` 같은 명시적 구조가 있어야 렌더러와 내보내기 경로가 안정적으로 처리할 수 있다.
- Difference From This Project: 기존 구현은 구조가 존재하는지만 봤고, 렌더러가 읽는 표준 구조로 통일하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `normalizeTableData`, `normalizeChartData`를 추가해 다양한 AI 응답을 표준 구조로 정규화.

### 2.2 시각화 라이브러리는 기대하는 데이터 형태가 다르므로 변환 계층이 필요하다

- Source URL: https://observablehq.com/blog/reshaping-data-plot-d3
- Key Summary: Observable은 Plot/D3 시각화에 필요한 데이터 형태가 현재 데이터와 다를 수 있으며, tidy data나 기대 shape로 wrangling해야 한다고 설명한다.
- Applicability: WorkAI는 모델 응답을 그대로 렌더러에 넘기는 것이 아니라 Recharts/TableRenderer가 기대하는 배열/행 구조로 변환해야 한다.
- Difference From This Project: 기존에는 layout 정규화는 있었지만 chart/table data wrangling은 없었다.
- Adoption Priority: 높음.
- Reflected Status: `labels/datasets`, `headers/rows`, row object 배열, key-value object를 렌더 가능 구조로 변환.

### 2.3 데이터 표는 헤더와 데이터 셀의 관계가 구조적으로 명확해야 한다

- Source URL: https://www.w3.org/WAI/tutorials/tables/
- Key Summary: W3C WAI는 접근 가능한 데이터 표가 header cell과 data cell의 관계를 명확히 해야 하며, 구조 마크업이 없으면 맥락 이해가 어려워진다고 설명한다.
- Applicability: WorkAI의 표 슬라이드는 `columns`와 `rows`가 명확해야 화면 렌더링뿐 아니라 향후 PDF/PPTX/접근성 개선에도 재사용 가능하다.
- Difference From This Project: 기존 `headers` 변형은 렌더러 기준에서 column header로 인식되지 않았다.
- Adoption Priority: 중간.
- Reflected Status: `headers`를 `columns`와 동기화하고 row object/array를 행렬로 정규화.

### 2.4 좋은 시각화는 데이터 질문에 맞는 차트 형태와 예측 가능한 구조를 사용해야 한다

- Source URL: https://www.tableau.com/visualization/data-visualization-best-practices
- Key Summary: Tableau는 데이터가 답하려는 질문에 맞는 차트 형식을 고르고, 예측 가능한 패턴으로 데이터를 제시해야 메시지가 빠르게 전달된다고 설명한다.
- Applicability: WorkAI는 chart type과 데이터 point가 함께 보존되어야 사용자가 KPI 추이, 비교, 비중을 빠르게 읽을 수 있다.
- Difference From This Project: 기존에는 `visualization_type: line`이 있어도 `labels/datasets`가 배열로 변환되지 않으면 실제 차트가 비어 보였다.
- Adoption Priority: 중간.
- Reflected Status: `chartType`을 보존하고 `labels/datasets`를 `{ label, name, value, series }` 포인트 배열로 변환.

## 3. 제품 개선 결정

선택 기능: `Renderable Visualization Data Contract`

- `src/utils/presentation-normalizer.ts`에 `normalizeChartData`, `normalizeTableData`, `normalizeSlideVisualizationData` 추가.
- 차트 변환 지원:
  - `{ labels, datasets }` -> `content_data_chart: [{ label, name, value, series }]`
  - `{ labels, data }`, `{ labels, values }`, `{ categories, values }` -> chart point 배열
  - row object 배열, table-like rows -> chart point 배열
  - 숫자 문자열, 퍼센트, 콤마 포함 값을 numeric value로 변환
- 표 변환 지원:
  - `{ headers, rows }` -> `{ columns, headers, rows }`
  - row object 배열 -> `columns + rows`
  - array matrix -> header row 추론 또는 `항목/값` 기본 컬럼
  - key-value object -> 2열 표
- `normalizePresentationSlide`가 시각화 데이터를 먼저 정규화한 뒤 content extraction을 수행하도록 변경.
- chart 레이아웃의 generic `content_data`는 표보다 차트로 먼저 해석하도록 우선순위 조정.

## 4. A/B 테스트 설계

- Control A: 기존 렌더 경로. `content_data_chart`가 object인 `labels/datasets` 차트와 `headers/rows` 표는 렌더 가능 점수 0.
- Candidate B: `normalizePresentationSlides` 후 렌더 가능 데이터 계약 적용.
- 샘플 1: `content_data_chart: { labels, datasets }`, `visualization_type: line`.
- 샘플 2: `content_data_table: { headers, rows }`.
- 평가 기준: `SlideLayoutRenderer`와 `TableRenderer`가 읽을 수 있는 구조인지 점수화한다.
- 실제 결과: baseline 0, candidate 2.
- 구현 위치: `src/presentation-normalizer.test.ts`.
- 1차 검증: `npx vitest run src/presentation-normalizer.test.ts src/lib/deck-quality-audit.test.ts` 통과, 2개 파일 9개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- PPTX/PDF export에서도 chart/table 전용 시각 요소를 실제 도형으로 내보내기.
- `deck-quality-audit`가 데이터 필드 존재가 아니라 렌더 가능 구조인지 검사하도록 강화.
- 멀티 시리즈 차트의 series별 색상/legend 렌더링 개선.
- 차트 축 단위, 기준선, 목표값을 schema에 포함해 더 설명력 있는 KPI 차트 생성.

## 6. 이번 루프 반영 상태

- 반영됨: `src/utils/presentation-normalizer.ts` chart/table data contract 정규화.
- 반영됨: `src/presentation-normalizer.test.ts` 렌더 가능성 A/B 테스트 추가.
- 검증 완료: `npx vitest run src/presentation-normalizer.test.ts src/lib/deck-quality-audit.test.ts` 통과, 2개 파일 9개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 17개 파일 58개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
