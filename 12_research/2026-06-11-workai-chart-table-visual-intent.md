# WorkAI Chart/Table Visual Intent 보존 리서치

작성일: 2026-06-11
대상 제품: WorkAI AI 발표자료 생성 후 슬라이드 정규화 및 디자이너 렌더링
이번 루프 결론: AI 프롬프트가 chart/table 레이아웃과 정형 데이터를 생성하도록 요구하고 있으나, normalizer와 renderer가 이를 보존하지 않으면 데이터 스토리텔링 품질이 떨어진다. `chart`와 `table` 레이아웃을 보존하고 실제 렌더링 경로에 연결한다.

## 1. 현재 제품 관찰

- `prompts.ts`는 수치/KPI가 있으면 chart, table, comparison 레이아웃과 `content_data`를 생성하도록 요구한다.
- `normalizeSlideLayout`의 supported layout에는 `chart`, `table`이 없어서 AI가 `type: chart`를 반환해도 `default`로 떨어질 수 있었다.
- `SlideLayoutRenderer`에는 `ChartRenderer`, `TableRenderer` 파일이 있었지만 실제 switch case에 연결되어 있지 않았다.
- 결과적으로 데이터가 있어도 사용자는 차트/표가 아닌 일반 불릿형 슬라이드를 보게 되어 인사이트 밀도가 낮아진다.

## 2. 외부 리서치 요약

### 2.1 데이터 스토리텔링은 내러티브와 시각화를 함께 사용해야 한다

- Source URL: https://online.hbs.edu/blog/post/data-storytelling
- Key Summary: Harvard Business School Online은 데이터 스토리텔링을 데이터셋의 인사이트를 내러티브와 시각화로 전달하는 능력으로 설명한다.
- Applicability: WorkAI가 수치/KPI를 분석했으면 슬라이드에서 그 수치가 차트나 표로 드러나야 한다.
- Difference From This Project: 기존 normalizer는 chart/table 의도를 보존하지 않아 프롬프트의 데이터 시각화 요구가 렌더링 단계에서 약해졌다.
- Adoption Priority: 높음.
- Reflected Status: `normalizeSlideLayout`이 `chart`, `table`을 보존하고 `SlideLayoutRenderer`가 실제 렌더링한다.

### 2.2 차트 유형은 목표와 맥락에 맞게 선택해야 한다

- Source URL: https://www.nngroup.com/articles/choosing-chart-types/
- Key Summary: Nielsen Norman Group은 대부분의 UX 목적에서 bar, line, scatter 같은 기본 차트를 맥락에 맞게 선택하라고 설명한다.
- Applicability: WorkAI는 AI가 추천한 `visualization_type`을 잃지 않고 차트 렌더러에 전달해야 한다.
- Difference From This Project: 현재 구현은 bar/line/pie를 지원하는 기존 `ChartRenderer`가 있었지만 디자이너에 연결되지 않았다.
- Adoption Priority: 높음.
- Reflected Status: chart 레이아웃에서 `visualization_type`, `chartType`, `type`을 차트 유형으로 전달.

### 2.3 시각화는 빠른 이해를 돕도록 설계되어야 한다

- Source URL: https://www.nngroup.com/articles/dashboards-preattentive/
- Key Summary: NN/G는 시각화가 길이와 2D 위치 같은 인지적으로 빠른 단서를 활용해 정량 정보를 전달해야 한다고 설명한다.
- Applicability: 숫자를 일반 불릿으로만 보여주는 것보다 차트와 표가 더 빠른 비교와 이해를 돕는다.
- Difference From This Project: 이번 변경은 복잡한 신규 차트 엔진을 만드는 것이 아니라 이미 있는 렌더러를 생성 결과 흐름에 연결한다.
- Adoption Priority: 중간.
- Reflected Status: chart/table 렌더링 영역과 우측/하단 요약 카드로 데이터와 해석을 함께 제공.

## 3. 제품 개선 결정

선택 기능: `Chart/Table Visual Intent Preservation`

- normalizer supported layout에 `chart`, `table` 추가.
- `bar_chart`, `line_chart`, `graph` 등 chart 계열 레이아웃을 `chart`로 정규화.
- `comparison-table`, `data-table` 등 table 계열 레이아웃을 `table`로 정규화.
- `SlideLayoutRenderer`에 `chart` case 추가: 차트 영역과 핵심 해석 카드 동시 표시.
- `SlideLayoutRenderer`에 `table` case 추가: 표 영역과 핵심 요약 카드 동시 표시.
- 기존 `ChartRenderer`, `TableRenderer`를 재사용해 새 의존성 없이 연결.

## 4. A/B 테스트 설계

- Control A: 기존 normalizer 방식. supported layout에 chart/table이 없어 두 레이아웃 모두 default로 fallback.
- Candidate B: chart/table 보존 방식.
- 샘플: cover 1장, chart 1장, table 1장.
- 평가 기준: candidate가 chart/table visual intent 2개를 모두 보존해야 하고, baseline은 0개여야 한다.
- 구현 위치: `src/presentation-normalizer.test.ts`.
- 실제 결과: `npx vitest run src/presentation-normalizer.test.ts` 통과, 1개 파일 4개 테스트 성공.

## 5. 후속 개선 백로그

- 차트 축 라벨, 단위, 출처 필드를 slide schema에 추가.
- table 컬럼이 많은 경우 자동 열 축소 또는 요약 행 생성.
- chart/table 슬라이드에 citation_url이 있으면 하단 출처로 렌더링.
- Playwright 스크린샷으로 실제 chart/table 렌더링 픽셀 검증 추가.

## 6. 이번 루프 반영 상태

- 반영됨: `src/utils/presentation-normalizer.ts` chart/table layout 보존.
- 반영됨: `src/components/designer/SlideLayoutRenderer.tsx` chart/table 렌더링 case 추가.
- 반영됨: `src/presentation-normalizer.test.ts` A/B 테스트와 layout mapping 테스트 추가.
- 검증 완료: `npx vitest run src/presentation-normalizer.test.ts` 통과, 1개 파일 4개 테스트 성공.
- 검증 완료: `npm test` 통과, 14개 파일 47개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
