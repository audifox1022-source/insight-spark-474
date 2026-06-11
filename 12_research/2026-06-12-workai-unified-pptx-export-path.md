# WorkAI Unified PPTX Export Path 리서치

작성일: 2026-06-12
대상 제품: WorkAI 최종 보기 화면, PowerPoint 내보내기, export 경로 일관성
이번 루프 결론: 직전 루프에서 강화한 `lib/export-presentation` 기반 PPTX visual data export가 디자이너 경로에는 적용되었지만, 최종 보기 메뉴는 여전히 오래된 `utils/pptxExporter`를 직접 사용했다. 같은 제품의 두 내보내기 버튼이 서로 다른 export 엔진을 쓰면 chart/table 보존 품질이 화면 위치에 따라 달라지므로, 최종 보기 메뉴도 단일 강화 exporter로 통합한다.

## 1. 현재 제품 관찰

- `EditorHeader`와 `SlideEditor`의 PPTX 내보내기는 `@/lib/export-presentation`의 `exportToPptx`를 사용한다.
- `ViewExportMenu`는 JSON은 `@/lib/export-presentation.tsx`에서 가져오지만 PPTX만 `@/utils/pptxExporter`에서 가져왔다.
- `utils/pptxExporter`는 별도 legacy exporter이며 직전 루프의 chart/table visual data export 개선을 받지 않는다.
- 결과적으로 최종 preview 화면에서 PowerPoint를 내보내면 chart/table 전용 처리와 dense table capping이 적용되지 않는 불일치가 생길 수 있었다.

## 2. 외부 리서치 요약

### 2.1 제품 내부 일관성은 사용자 예측 가능성과 품질 신뢰의 기본이다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 같은 제품 안에서 용어와 동작이 일관되어야 사용자가 결과를 예측하고 학습 부담을 줄일 수 있다고 설명한다.
- Applicability: WorkAI의 "PowerPoint로 내보내기"는 위치가 달라도 같은 품질과 같은 데이터 보존 규칙을 따라야 한다.
- Difference From This Project: 기존 구현은 최종 보기 메뉴와 디자이너 메뉴가 서로 다른 PPTX exporter를 사용했다.
- Adoption Priority: 높음.
- Reflected Status: `ViewExportMenu`가 `@/lib/export-presentation.tsx`의 `exportToPptx`를 사용하도록 통합.

### 2.2 PowerPoint 발표자료에서는 차트/그래프가 핵심 데이터 표현 수단이다

- Source URL: https://support.microsoft.com/en-us/office/use-charts-and-graphs-in-your-presentation-c74616f1-a5b2-4a37-8695-fbcc043bf526
- Key Summary: Microsoft Support는 PowerPoint에서 차트와 그래프를 삽입해 발표 안에서 데이터를 표현하는 것을 표준 기능으로 안내한다.
- Applicability: WorkAI가 chart/table 슬라이드를 생성했다면 어떤 PPTX export入口에서도 그 시각 데이터를 보존해야 한다.
- Difference From This Project: legacy `utils/pptxExporter` 경로는 새 visual data export contract를 사용하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: 최종 보기 메뉴도 강화된 PPTX visual export 경로를 호출.

### 2.3 데이터 시각화는 빠르게 이해 가능한 형태로 유지되어야 한다

- Source URL: https://www.tableau.com/visualization/data-visualization-best-practices
- Key Summary: Tableau는 적절한 chart/graph 선택, 예측 가능한 레이아웃, 명확한 색상 단서가 데이터 스토리를 빠르게 전달한다고 설명한다.
- Applicability: chart/table 데이터 보존은 최종 export 산출물의 핵심 품질이다.
- Difference From This Project: 기존 최종 보기 export는 강화된 chart/table helper를 우회해 데이터 표현 일관성이 약했다.
- Adoption Priority: 중간.
- Reflected Status: `ViewExportMenu` 클릭 테스트가 `lib/export-presentation` exporter 호출을 검증.

## 3. 제품 개선 결정

선택 기능: `Unified PPTX Export Path`

- `src/components/ViewExportMenu.tsx`에서 `@/utils/pptxExporter` 직접 import 제거.
- JSON/PPTX 모두 `@/lib/export-presentation.tsx`에서 가져오도록 통합.
- 최종 보기 메뉴의 PowerPoint export도 직전 루프에서 추가한 `PPTX Visual Data Export` 개선을 사용.
- legacy exporter 파일은 다른 참조 여부를 더 확인한 뒤 별도 루프에서 제거 또는 래핑 검토.

## 4. A/B 테스트 설계

- Control A: 최종 보기 메뉴가 `@/utils/pptxExporter`를 직접 호출.
- Candidate B: 최종 보기 메뉴가 `@/lib/export-presentation.tsx`의 unified exporter를 호출.
- 샘플: chart slide가 포함된 presentation을 `ViewExportMenu`에 렌더링하고 PowerPoint 메뉴 클릭.
- 평가 기준: mocked `@/lib/export-presentation.tsx.exportToPptx`가 presentation과 함께 호출되어야 한다.
- 실제 결과: legacy path score 0, unified path score 1.
- 구현 위치: `src/components/ViewExportMenu.test.tsx`.
- 1차 검증: `npx vitest run src/components/ViewExportMenu.test.tsx src/lib/pptx-export-service.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 6개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `src/utils/pptxExporter.ts`가 더 이상 product path에서 필요 없는지 전체 검증 후 제거.
- PDF export도 최종 보기/디자이너에서 같은 품질 경로를 쓰는지 audit.
- export menu에 현재 export 엔진과 지원되는 데이터 보존 범위를 내부 telemetry로 기록.

## 6. 이번 루프 반영 상태

- 반영됨: `src/components/ViewExportMenu.tsx` PPTX import 경로 통합.
- 반영됨: `src/components/ViewExportMenu.test.tsx` unified exporter 호출 A/B 테스트 추가.
- 검증 완료: `npx vitest run src/components/ViewExportMenu.test.tsx src/lib/pptx-export-service.test.ts src/presentation-final-screen.test.tsx` 통과, 3개 파일 6개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 22개 파일 67개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
