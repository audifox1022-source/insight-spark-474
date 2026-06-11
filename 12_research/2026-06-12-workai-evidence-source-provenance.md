# WorkAI Evidence Source Provenance 리서치

작성일: 2026-06-12
대상 제품: WorkAI AI 발표자료 생성, 정규화, 품질 감사, PDF/PPTX 내보내기
이번 루프 결론: 인사이트가 높은 발표자료는 수치와 주장뿐 아니라 검증 가능한 출처를 함께 보존해야 한다. AI가 `citation_url`, `source_url`, `references`, 본문 항목 citation 등 다양한 형태로 출처를 반환해도 하나의 citation 모델로 정규화하고, 화면/내보내기/품질 감사가 동일하게 활용하도록 개선한다.

## 1. 현재 제품 관찰

- `prompts.ts`는 외부 자료 인용 시 `citation_url` 병기를 요구하지만, JSON schema에는 `citation_url`과 `source_label` 필드가 없었다.
- AI 응답은 `source_url`, `url`, `references`, `citations`, 본문 항목의 `citationUrl`처럼 변형될 가능성이 높지만 기존 정규화 경로는 이를 표준화하지 않았다.
- `SlideCanvas`에는 `citation_url` 표시가 있었지만 현재 주 편집/미리보기 경로인 `SlideLayoutRenderer`에는 출처 배지가 없었다.
- PDF/PPTX export는 별도 렌더링 경로라 화면에 출처가 있어도 다운로드 결과에 출처가 빠질 수 있었다.
- 로컬 품질 감사는 수치/KPI 근거를 점검하지만, 근거가 검증 가능한 URL로 추적되는지는 별도 평가하지 않았다.

## 2. 외부 리서치 요약

### 2.1 신뢰성은 투명한 정보 공개와 외부 연결에서 나온다

- Source URL: https://www.nngroup.com/articles/trustworthy-design/
- Key Summary: Nielsen Norman Group은 신뢰성 평가 요소로 디자인 품질, 정보의 사전 공개, 포괄적이고 최신인 콘텐츠, 외부 웹과의 연결을 제시한다.
- Applicability: WorkAI 덱이 외부 근거를 사용했다면 사용자가 검증할 수 있도록 출처 URL을 표시해야 한다.
- Difference From This Project: 기존 제품은 출처를 요구했지만 생성 응답 변형과 실제 렌더링/내보내기 경로에서 일관되게 보존하지 못했다.
- Adoption Priority: 높음.
- Reflected Status: `slide-citations` 유틸리티로 출처 URL을 추출하고, 화면과 export에 한 줄 출처 배지를 추가.

### 2.2 데이터 시각화 텍스트에는 sources와 notes도 포함된다

- Source URL: https://www.datawrapper.de/blog/text-in-data-visualizations
- Key Summary: Datawrapper는 차트/지도에는 제목, 설명, notes, sources, labels 같은 텍스트 요소가 포함되며, 독자가 필요한 곳에 정보를 배치해야 한다고 설명한다.
- Applicability: WorkAI 차트/표 슬라이드는 데이터 자체뿐 아니라 데이터가 어디서 왔는지 짧게 보여줘야 한다.
- Difference From This Project: 이전 루프에서 chart/table 렌더링을 연결했지만, 데이터 출처 표시와 검증 신호는 아직 별도 처리되지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `SlideLayoutRenderer` 하단에 compact source badge를 추가하고 PDF/PPTX에도 source footer를 추가.

### 2.3 차트에는 데이터 출처가 항상 포함되어야 한다

- Source URL: https://www150.statcan.gc.ca/n1/pub/89-26-0005/892600052022001-eng.htm
- Key Summary: Statistics Canada의 데이터 시각화 가이드는 차트 구성 요소에 Sources를 포함하고, 독자가 필요하면 데이터를 찾을 수 있을 만큼 구체적이어야 한다고 설명한다.
- Applicability: WorkAI가 chart/table 데이터를 생성할 때 출처가 빠지면 의사결정자가 수치의 신뢰도를 확인하기 어렵다.
- Difference From This Project: 기존 audit는 시각화 데이터 존재 여부는 보지만 출처 URL 존재 여부는 평가하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `deck-quality-audit`에 `sourceSignals`와 `근거 출처 누락` 개선 항목 추가.

### 2.4 슬라이드는 간결해야 하지만 외부 작업에는 적절한 credit이 필요하다

- Source URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8638955/
- Key Summary: PLOS Computational Biology의 발표 슬라이드 규칙은 슬라이드의 텍스트를 줄이되, 외부 연구나 작업을 사용할 때는 적절한 citation/reference를 포함하라고 설명한다.
- Applicability: WorkAI는 출처를 장황한 참고문헌 블록으로 만들기보다 하단 한 줄로 신뢰 신호를 보존해야 한다.
- Difference From This Project: 기존 UX는 출처가 있더라도 주요 렌더러에는 표시되지 않아 편집자와 청중이 놓칠 수 있었다.
- Adoption Priority: 중간.
- Reflected Status: source badge는 compact footer 형태로 표시하고 thumbnail에서는 숨겨 레이아웃 밀도를 유지.

## 3. 제품 개선 결정

선택 기능: `Evidence Source Provenance`

- `src/lib/slide-citations.ts` 추가: `citation_url`, `citationUrl`, `source_url`, `sourceUrl`, `reference_url`, `references`, `citations`, `sources`, 본문 항목 citation을 하나의 `{ url, label }` 모델로 정규화.
- `normalizePresentationSlide`에서 변형 출처 필드를 `citation_url`, `source_label`로 보존.
- `SLIDE_SCHEMA`와 생성 프롬프트에 `citation_url`, `source_label` 표준 필드를 명시.
- `SlideLayoutRenderer`에 compact source badge 추가.
- PDF와 PPTX export footer에 동일한 출처 표시 추가.
- `deck-quality-audit`에 `sourceSignals`와 `근거 출처 누락` 감사 항목 추가.

## 4. A/B 테스트 설계

- Control A: 기존 `citation_url` 직접 필드만 인정하는 legacy logic.
- Candidate B: alias, references 배열, nested content citation까지 회수하는 `extractSlideCitation`.
- 샘플: 직접 `citation_url` 1장, `source_url` 1장, `references[{ url }]` 1장, 본문 항목 `citationUrl` 1장.
- 평가 기준: baseline은 1개만 회수하고 candidate는 4개 모두 회수해야 한다.
- 구현 위치: `src/lib/slide-citations.test.ts`.
- 추가 감사 게이트: `src/lib/deck-quality-audit.test.ts`에서 근거가 풍부하지만 출처 URL이 없는 덱은 `Source` 카테고리 개선 항목을 받아야 한다.
- 실제 결과: `npx vitest run src/lib/slide-citations.test.ts src/lib/deck-quality-audit.test.ts` 통과, 2개 파일 7개 테스트 성공.

## 5. 후속 개선 백로그

- 여러 출처가 있는 경우 슬라이드별 primary source 외 reference list 슬라이드 자동 생성.
- chart/table 개별 데이터 포인트별 source 또는 extraction date 표시.
- export된 PPTX/PDF에서 source footer 위치가 긴 제목/4:3 비율과 충돌하지 않는지 Playwright 또는 파일 렌더링 기반 스냅샷 추가.
- 웹 검색 사용 시 citation URL 품질을 도메인 신뢰도와 freshness로 평가.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/slide-citations.ts` 출처 정규화 유틸리티 추가.
- 반영됨: `src/utils/presentation-normalizer.ts` 생성 슬라이드 citation/source_label 표준화.
- 반영됨: `src/components/designer/SlideLayoutRenderer.tsx` source badge 렌더링.
- 반영됨: `src/lib/export-presentation.tsx`, `src/lib/pptx-export-service.ts`, `src/utils/pptxExporter.ts` export source footer 추가.
- 반영됨: `src/lib/deck-quality-audit.ts` sourceSignals와 근거 출처 누락 감사 추가.
- 검증 완료: `npx vitest run src/lib/slide-citations.test.ts src/lib/deck-quality-audit.test.ts` 통과, 2개 파일 7개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 15개 파일 51개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
