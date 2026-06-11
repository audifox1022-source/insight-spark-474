# WorkAI Remove Legacy PPTX Exporter 리서치

작성일: 2026-06-12
대상 제품: WorkAI PPTX export 경로, legacy exporter, 유지보수 안전성
이번 루프 결론: 최종 보기 메뉴와 디자이너 export가 모두 `lib/export-presentation`/`pptx-export-service` 경로로 통합된 뒤에도 `src/utils/pptxExporter.ts` legacy exporter 파일이 남아 있었다. 이 파일은 현재 import가 없고, chart/table data export와 4:3 ratio 개선을 받지 않는 오래된 구현이다. 남겨두면 새 코드나 유지보수 과정에서 잘못된 경로를 다시 import할 위험이 있으므로 삭제하고 hygiene 테스트로 회귀를 막는다.

## 1. 현재 제품 관찰

- `rg` 기준 실제 import는 `@/lib/export-presentation.tsx`와 `@/lib/pptx-export-service` 경로에만 남아 있다.
- `src/utils/pptxExporter.ts`는 더 이상 product path에서 참조되지 않는다.
- legacy exporter는 항상 `LAYOUT_16x9`를 사용하고, 최근 추가한 chart/table visual data export와 deck aspect ratio contract를 반영하지 않는다.
- 파일이 남아 있으면 이후 “PPTX exporter”를 찾는 개발자가 오래된 파일을 다시 사용할 가능성이 있다.

## 2. 외부 리서치 요약

### 2.1 기술 부채는 미래 변경 비용과 혼란을 만든다

- Source URL: https://martinfowler.com/bliki/TechnicalDebt.html
- Key Summary: Martin Fowler는 technical debt가 현재는 빠른 선택일 수 있지만 이후 변경 비용과 이자를 만든다고 설명한다.
- Applicability: 더 이상 쓰지 않는 legacy exporter는 당장 실행되지 않아도 향후 잘못된 재사용과 기능 불일치를 만들 수 있다.
- Difference From This Project: 기존 파일은 chart/table/ratio 개선과 동떨어진 오래된 export 구현이었다.
- Adoption Priority: 중간.
- Reflected Status: unused legacy `src/utils/pptxExporter.ts` 삭제.

### 2.2 죽은 코드는 유지보수자가 읽고 판단해야 하는 비용이다

- Source URL: https://testing.googleblog.com/2017/01/code-health-to-comment-or-not-to-comment.html
- Key Summary: Google Testing Blog의 code health 글은 코드와 주석이 오래되면 유지보수자가 실제 의도와 현재 동작을 구분해야 하는 부담을 만든다는 점을 다룬다.
- Applicability: 사용되지 않는 exporter가 남으면 현재 공식 export path와 혼동되고, 어떤 경로가 최신인지 계속 판단해야 한다.
- Difference From This Project: 이전 루프에서 공식 PPTX export path를 통합했지만 파일 레벨 정리는 하지 않았다.
- Adoption Priority: 중간.
- Reflected Status: export path hygiene test로 legacy 파일 부활을 검지.

### 2.3 일관된 경로는 사용자 결과의 예측 가능성을 지킨다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 제품 내부 일관성이 사용자가 결과를 예측하고 학습 부담을 줄이는 데 중요하다고 설명한다.
- Applicability: WorkAI의 PowerPoint 내보내기는 어느 UI에서 호출하든 같은 exporter와 같은 품질 계약을 따라야 한다.
- Difference From This Project: legacy exporter가 남아 있으면 UI 경로가 다시 분기될 수 있는 구조적 위험이 있었다.
- Adoption Priority: 높음.
- Reflected Status: 단일 공식 exporter만 남기고 legacy exporter 파일을 삭제.

## 3. 제품 개선 결정

선택 기능: `Remove Legacy PPTX Exporter`

- `src/utils/pptxExporter.ts` 삭제.
- 현재 제품 export는 `src/lib/export-presentation.tsx`에서 `exportToPptx`를 re-export하고, 실제 구현은 `src/lib/pptx-export-service.ts`가 담당한다.
- `src/lib/export-path-hygiene.test.ts`를 추가해 legacy exporter 파일이 다시 생기면 실패하도록 한다.
- 기존 `ViewExportMenu.test.tsx`의 unified exporter 검증은 유지한다.

## 4. A/B 테스트 설계

- Control A: legacy duplicate exporter file exists. Duplicate exporter debt score 1.
- Candidate B: `src/utils/pptxExporter.ts`가 없고 공식 export path만 남는다. Duplicate exporter debt score 0.
- 샘플: `existsSync(resolve(process.cwd(), 'src/utils/pptxExporter.ts'))`.
- 평가 기준: legacy exporter 파일이 존재하지 않아야 한다.
- 실제 결과: baseline 1, candidate 0.
- 구현 위치: `src/lib/export-path-hygiene.test.ts`.
- 1차 검증: `npx vitest run src/lib/export-path-hygiene.test.ts src/components/ViewExportMenu.test.tsx src/lib/pptx-export-service.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `PresentationMode`, `SlideRenderer`, `SlideThumbnail`의 실제 사용 여부를 별도 루프에서 확인하고 유지/삭제 결정.
- export 관련 public API를 `lib/export-presentation.tsx` 하나로 문서화.
- code owner 관점에서 export path 변경 시 테스트 매트릭스 정리.

## 6. 이번 루프 반영 상태

- 반영됨: `src/utils/pptxExporter.ts` 삭제.
- 반영됨: `src/lib/export-path-hygiene.test.ts` legacy PPTX exporter 제거 A/B 테스트.
- 검증 완료: `npx vitest run src/lib/export-path-hygiene.test.ts src/components/ViewExportMenu.test.tsx src/lib/pptx-export-service.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 28개 파일 75개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
