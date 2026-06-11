# WorkAI PDF Visual Data Export 리서치

작성일: 2026-06-12
대상 제품: WorkAI PDF 내보내기, chart/table 슬라이드, 데이터 기반 발표자료
이번 루프 결론: PPTX 내보내기에는 chart/table 전용 시각 데이터 export가 추가되었지만, `lib/export-presentation`의 PDF 엔진은 여전히 chart/table layout을 기본 bullet layout으로 처리했다. PDF는 편집보다 공유와 검토에 많이 쓰이는 정적 산출물이므로, 화면에서 생성된 데이터 구조가 PDF에서도 막대 차트와 표 구조로 남아야 한다.

## 1. 현재 제품 관찰

- `SlideLayoutRenderer`는 `chart`와 `table` layout을 화면에서 전용 렌더러로 보여준다.
- `pptx-export-service.ts`는 직전 루프에서 chart/table case를 갖게 되었지만, `export-presentation.tsx`의 `exportToPdf`는 `grid`, `matrix`, `timeline`, `comparison`, `cover`, `default` 중심이었다.
- 따라서 디자이너/편집 경로에서 PDF를 만들면 chart/table 슬라이드가 데이터 시각화가 아니라 일반 bullet 콘텐츠처럼 보일 수 있었다.
- 이미 `normalizeChartData`, `normalizeTableData` 계약이 있으므로 PDF 엔진도 같은 표준 데이터를 재사용할 수 있다.

## 2. 외부 리서치 요약

### 2.1 데이터 시각화는 한눈에 읽히는 형태를 유지해야 한다

- Source URL: https://www.nngroup.com/articles/dashboards-preattentive/
- Key Summary: Nielsen Norman Group은 데이터 시각화가 한 화면에서 빠르게 정보를 전달하고 사용자가 행동할 수 있게 해야 한다고 설명한다.
- Applicability: WorkAI PDF의 chart slide는 수치를 텍스트 목록으로만 내보내기보다 label, bar, value가 분리된 시각 구조를 유지해야 한다.
- Difference From This Project: 기존 PDF export는 chart layout을 별도 처리하지 않아 데이터 비교 신호가 약했다.
- Adoption Priority: 높음.
- Reflected Status: `exportToPdf`에 chart case를 추가하고 표준 chart data를 막대형 도형으로 출력.

### 2.2 데이터 표는 찾기와 비교를 지원하는 명확한 구조가 필요하다

- Source URL: https://www.nngroup.com/articles/data-tables/
- Key Summary: NN/g는 데이터 표가 기록 찾기, 비교, 단일 행 확인, 행동 수행 같은 주요 사용자 작업을 지원해야 한다고 설명한다.
- Applicability: PDF로 공유된 WorkAI table slide도 header row와 data rows가 분리되어야 검토자가 항목을 비교할 수 있다.
- Difference From This Project: 기존 PDF export는 table layout을 native table-like drawing으로 보존하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `exportToPdf`에 table case를 추가하고 header/data row를 도형과 텍스트로 출력.

### 2.3 발표용 데이터 시각화는 관련 데이터만 남기고 예측 가능한 패턴을 써야 한다

- Source URL: https://www.tableau.com/visualization/data-visualization-best-practices
- Key Summary: Tableau는 적절한 chart/graph 선택, 예측 가능한 레이아웃, 관련 데이터 중심의 표현을 데이터 시각화 best practice로 제시한다.
- Applicability: PDF 한 장에 너무 많은 point와 row를 넣으면 읽기 어려우므로 chart/table export에서 표시 개수를 제한해야 한다.
- Difference From This Project: 기존 PDF export는 chart/table 데이터량 제한 정책이 없었다.
- Adoption Priority: 중간.
- Reflected Status: chart point는 최대 6개, table은 최대 5열/7행으로 제한.

### 2.4 표는 레이아웃 장식이 아니라 데이터 그리드로 다뤄야 한다

- Source URL: https://www.w3.org/WAI/tutorials/tables/
- Key Summary: W3C WAI는 표가 데이터 그리드를 표시하는 용도이며, 시각적 레이아웃 용도로 쓰는 것과 구분해야 한다고 안내한다.
- Applicability: PDF 자체는 HTML table semantics를 담지 않지만, 산출물의 시각 구조도 header와 cell 관계를 유지하는 편이 데이터 해석에 유리하다.
- Difference From This Project: 기존 PDF export는 table data contract를 시각적 그리드로 변환하지 않았다.
- Adoption Priority: 중간.
- Reflected Status: PDF table export가 header row, cell border, alternating row background를 갖는 구조로 변경됨.

## 3. 제품 개선 결정

선택 기능: `PDF Visual Data Export`

- `src/lib/export-presentation.tsx`에 `extractPdfChartData`, `extractPdfTableData` helper 추가.
- chart data는 `normalizeChartData`를 재사용해 최대 6개 point로 변환.
- table data는 `normalizeTableData`를 재사용해 최대 5열, 7행으로 제한.
- PDF chart case는 label, bar, value를 `pdf-lib` rectangle/text로 그린다.
- PDF table case는 header row와 data rows를 `pdf-lib` rectangle/text grid로 그린다.
- chart/table 데이터가 없으면 빈 시각화 대신 해당 데이터가 없다는 fallback 문구를 출력하고 기존 footer/citation 흐름은 유지한다.

## 4. A/B 테스트 설계

- Control A: 기존 PDF layout 분기. chart/table case가 없어 native visual export score 0.
- Candidate B: chart/table 전용 helper와 PDF drawing branch.
- 샘플 1: `content_data_chart: { labels, datasets }`.
- 샘플 2: `content_data_table: { headers, rows }`.
- 평가 기준: chart data point 추출, table matrix 추출, dense table capping.
- 실제 결과: baseline 0, candidate 2.
- 구현 위치: `src/lib/export-presentation.test.ts`.
- 1차 검증: `npx vitest run src/lib/export-presentation.test.ts src/lib/pptx-export-service.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- 실제 PDF 렌더링 스냅샷을 생성해 bar/table 위치를 이미지로 비교하는 회귀 테스트.
- chart slide에서 multi-series legend와 색상 매핑 강화.
- PDF table column width를 텍스트 길이에 따라 조정.
- 최종 보기의 DOM capture PDF와 editor PDF engine의 품질 차이 audit.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/export-presentation.tsx` chart/table PDF 전용 렌더링.
- 반영됨: `src/lib/export-presentation.test.ts` PDF 시각 데이터 export A/B 테스트 추가.
- 검증 완료: `npx vitest run src/lib/export-presentation.test.ts src/lib/pptx-export-service.test.ts src/presentation-normalizer.test.ts` 통과, 3개 파일 9개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 23개 파일 69개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
