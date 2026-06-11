# WorkAI PPTX Visual Data Export 리서치

작성일: 2026-06-12
대상 제품: WorkAI PPTX 내보내기, chart/table 슬라이드, 데이터 기반 발표자료
이번 루프 결론: 화면 렌더러는 chart/table 레이아웃을 실제 차트/표로 보여주지만, PPTX 내보내기 경로는 chart/table case가 없어 기본 bullet 슬라이드로 떨어졌다. 사용자가 데이터 기반 슬라이드를 PowerPoint로 내보낼 때도 핵심 수치 구조가 시각적으로 남아야 하므로, PPTX export에 chart/table 전용 렌더링 경로를 추가한다.

## 1. 현재 제품 관찰

- `SlideLayoutRenderer`는 `chart`와 `table` layout을 각각 `ChartRenderer`, `TableRenderer`로 화면에 렌더링한다.
- `pptx-export-service.ts`의 switch는 `cover`, `timeline`, `comparison`, `matrix`, `default` 중심이고 `chart`, `table` case가 없었다.
- 따라서 chart/table 슬라이드는 PowerPoint export에서 기본 bullet layout으로 처리되어, 정규화된 `content_data_chart`/`content_data_table`가 시각 구조로 표현되지 않았다.
- 직전 루프에서 렌더 가능한 chart/table data contract를 만들었으므로, PPTX export도 같은 표준 데이터를 활용할 수 있다.

## 2. 외부 리서치 요약

### 2.1 PowerPoint는 발표 안에서 차트와 그래프를 직접 사용하는 것을 표준 기능으로 제공한다

- Source URL: https://support.microsoft.com/en-us/office/use-charts-and-graphs-in-your-presentation-c74616f1-a5b2-4a37-8695-fbcc043bf526
- Key Summary: Microsoft Support는 PowerPoint에서 Insert > Chart를 통해 발표 안에 차트와 그래프를 만들 수 있다고 안내한다.
- Applicability: WorkAI가 PPTX를 생성한다면 chart/table 슬라이드를 텍스트 목록으로만 내보내기보다 PPT 내부 시각 요소로 표현해야 사용자의 기대에 맞다.
- Difference From This Project: 기존 PPTX export는 chart/table 화면 표현을 PowerPoint 결과물로 유지하지 못했다.
- Adoption Priority: 높음.
- Reflected Status: `pptx-export-service.ts`에 chart/table case를 추가.

### 2.2 데이터 시각화는 빠르게 이해하고 행동할 수 있는 형태여야 한다

- Source URL: https://www.nngroup.com/articles/dashboards-preattentive/
- Key Summary: Nielsen Norman Group은 데이터 시각화가 한눈에 정보를 전달하고 빠르게 행동할 수 있게 해야 한다고 설명한다.
- Applicability: WorkAI의 데이터 기반 슬라이드는 export 후에도 막대형 수치 비교나 표 구조를 유지해야 발표자가 수치를 빠르게 설명할 수 있다.
- Difference From This Project: 기존 export는 데이터 포인트를 bullet text로만 표시해 시각적 비교성이 떨어졌다.
- Adoption Priority: 높음.
- Reflected Status: chart 슬라이드는 PPTX에서 간단한 bar visualization과 인사이트 박스를 함께 출력.

### 2.3 표는 비교와 기록 탐색을 지원해야 한다

- Source URL: https://www.nngroup.com/articles/data-tables/
- Key Summary: NN/g는 데이터 표가 조건에 맞는 기록 찾기, 비교, 단일 행 확인/편집, 행동 수행 같은 주요 사용자 작업을 지원해야 한다고 설명한다.
- Applicability: WorkAI table slide는 PPTX에서도 header와 row가 분리된 표 형태로 유지되어야 비교와 확인이 가능하다.
- Difference From This Project: 기존 export는 table layout을 표가 아니라 일반 bullet list로 처리했다.
- Adoption Priority: 중간.
- Reflected Status: table 슬라이드는 PPTX에서 header row와 data rows를 네이티브 shape/text 그리드로 출력.

### 2.4 발표용 데이터 시각화는 적절한 차트 선택과 예측 가능한 레이아웃이 중요하다

- Source URL: https://www.tableau.com/visualization/data-visualization-best-practices
- Key Summary: Tableau는 데이터 질문에 맞는 chart/graph를 고르고, 예측 가능한 패턴과 색상 단서를 사용해 데이터 스토리를 빠르게 전달하라고 권장한다.
- Applicability: WorkAI export는 `chartType`, label/value, table columns/rows를 유지해 데이터 스토리의 구조를 보존해야 한다.
- Difference From This Project: 기존 PPTX export는 chart/table 데이터 계약을 사용하지 않았다.
- Adoption Priority: 중간.
- Reflected Status: `extractPptxChartData`, `extractPptxTableData`가 표준 데이터 계약을 PPTX 렌더링 입력으로 변환.

## 3. 제품 개선 결정

선택 기능: `PPTX Visual Data Export`

- `src/lib/pptx-export-service.ts`에 `extractPptxChartData`, `extractPptxTableData` helper 추가.
- chart data는 `normalizeChartData`를 재사용해 최대 6개 point로 변환.
- table data는 `normalizeTableData`를 재사용해 최대 5열, 6행으로 제한.
- PPTX chart case는 label, bar, value를 네이티브 shape/text로 그린다.
- PPTX table case는 header row와 data rows를 shape/text grid로 그린다.
- 데이터가 없으면 명시적 fallback text를 출력한다.

## 4. A/B 테스트 설계

- Control A: 기존 PPTX switch. chart/table case가 없어 native visual export score 0.
- Candidate B: chart/table 전용 helper와 switch case.
- 샘플 1: `content_data_chart: { labels, datasets }`.
- 샘플 2: `content_data_table: { headers, rows }`.
- 평가 기준: chart data point 추출, table matrix 추출, dense table capping.
- 실제 결과: baseline 0, candidate 2.
- 구현 위치: `src/lib/pptx-export-service.test.ts`.
- 1차 검증: `npx vitest run src/lib/pptx-export-service.test.ts src/presentation-normalizer.test.ts src/lib/presentation-storage.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- PPTX의 실제 chart 객체(`addChart`) 사용 가능성 검토.
- PDF export에도 chart/table 전용 vector drawing 추가.
- 멀티 시리즈 차트 legend와 색상 매핑 개선.
- table column width 자동 계산과 긴 텍스트 축약 정책 강화.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/pptx-export-service.ts` chart/table PPTX 전용 렌더링.
- 반영됨: `src/lib/pptx-export-service.test.ts` PPTX 시각 데이터 export A/B 테스트 추가.
- 검증 완료: `npx vitest run src/lib/pptx-export-service.test.ts src/presentation-normalizer.test.ts src/lib/presentation-storage.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 21개 파일 66개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
