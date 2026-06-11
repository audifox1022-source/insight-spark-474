# WorkAI Aspect Ratio Aware Header Export 리서치

작성일: 2026-06-12
대상 제품: WorkAI 디자이너 헤더, PDF/PPTX 내보내기, 16:9/4:3 비율 선택
이번 루프 결론: 슬라이드 편집 화면은 `store.aspectRatio`로 16:9와 4:3을 전환하고, 하단/편집기 export 경로는 해당 값을 exporter에 전달한다. 하지만 상단 `EditorHeader`의 PDF/PPTX 내보내기는 같은 exporter를 호출하면서 비율 인자를 생략해, 4:3 덱도 기본값 16:9로 산출될 수 있었다. 상단 헤더는 사용자가 가장 먼저 누르는 export入口이므로 현재 덱 비율을 반드시 보존해야 한다.

## 1. 현재 제품 관찰

- `SlideEditor`의 `handleExportPDF`, `handleExportPPTX`는 `store.aspectRatio`를 `exportToPdf`/`exportToPptx`에 전달한다.
- `EditorHeader`도 같은 `useSlideStore`와 같은 exporter를 쓰지만 `aspectRatio`를 읽지 않았다.
- `exportToPdf`와 `exportToPptx`는 두 번째 인자가 없으면 기본 `16:9`로 처리한다.
- 결과적으로 사용자가 4:3을 선택한 뒤 상단 헤더 버튼으로 내보내면 화면 preview와 파일 산출물의 페이지 비율이 달라질 수 있었다.

## 2. 외부 리서치 요약

### 2.1 PowerPoint는 slide size를 문서 단위 설정으로 다룬다

- Source URL: https://support.microsoft.com/en-us/office/change-the-page-layout-49030c0f-9cd9-4f92-a894-605bc0671d10
- Key Summary: Microsoft Support는 PowerPoint의 Design 탭에서 Slide Size를 변경하고, 목록이나 width/height로 슬라이드 크기를 선택할 수 있다고 안내한다.
- Applicability: WorkAI가 16:9/4:3 덱 비율을 제공한다면 export 결과도 같은 slide size contract를 따라야 한다.
- Difference From This Project: 기존 `EditorHeader` export는 현재 선택된 slide size를 exporter에 전달하지 않았다.
- Adoption Priority: 높음.
- Reflected Status: `EditorHeader`가 store의 `aspectRatio`를 읽어 PDF/PPTX export에 전달.

### 2.2 같은 기능은 같은 제품 안에서 같은 결과를 내야 한다

- Source URL: https://www.nngroup.com/articles/consistency-and-standards/
- Key Summary: Nielsen Norman Group은 제품 내부 동작과 용어가 일관되어야 사용자가 결과를 예측하고 학습 부담을 줄일 수 있다고 설명한다.
- Applicability: WorkAI의 "PDF 다운로드"와 "PowerPoint로 내보내기"는 버튼 위치가 달라도 현재 덱 비율을 동일하게 반영해야 한다.
- Difference From This Project: 기존 구현은 `SlideEditor` export와 `EditorHeader` export가 같은 덱에서 서로 다른 비율 결과를 만들 수 있었다.
- Adoption Priority: 높음.
- Reflected Status: 헤더 export 클릭 테스트가 PDF/PPTX 모두 `4:3` 인자를 전달하는지 검증.

### 2.3 4:3과 16:9 선택은 발표 환경과 출력 환경에 직접 영향을 준다

- Source URL: https://learn.microsoft.com/en-us/answers/questions/5147051/powerpoint-aspect-ratio-16-9-vs-4-3
- Key Summary: Microsoft Q&A에서는 조직 내 기존 4:3 자료와 신규 16:9 기본값, 가상 회의 및 기기 표시 환경의 차이를 논의한다.
- Applicability: WorkAI 사용자가 4:3을 선택하는 이유는 레거시 자료, 출력, 특정 회의 환경 등일 수 있으므로 export 경로가 이를 임의로 16:9로 바꾸면 안 된다.
- Difference From This Project: 기존 헤더 export는 사용자 선택을 명시적으로 반영하지 않아 기본 16:9로 떨어질 수 있었다.
- Adoption Priority: 중간.
- Reflected Status: `EditorHeader.test.tsx`에서 4:3 선택 상태를 fixture로 고정.

## 3. 제품 개선 결정

선택 기능: `Aspect Ratio Aware Header Export`

- `EditorHeader`가 `useSlideStore()`에서 `aspectRatio`를 함께 읽는다.
- 헤더의 PDF 다운로드는 `exportToPdf(presentation, aspectRatio)`를 호출한다.
- 헤더의 PowerPoint 내보내기는 `exportToPptx(presentation, aspectRatio)`를 호출한다.
- JSON export는 파일 구조 백업이므로 기존대로 비율 인자를 받지 않는다.

## 4. A/B 테스트 설계

- Control A: 기존 헤더 export. PDF/PPTX 모두 `[presentation]`만 호출하므로 4:3 preservation score 0.
- Candidate B: 현재 덱 비율을 읽어 PDF/PPTX 모두 `[presentation, '4:3']`로 호출.
- 샘플: `aspectRatio: '4:3'`인 store mock과 단일 cover slide deck.
- 평가 기준: PDF export와 PPTX export 호출 모두 두 번째 인자로 `4:3`을 전달해야 한다.
- 실제 결과: baseline 0, candidate 2.
- 구현 위치: `src/components/designer/EditorHeader.test.tsx`.
- 1차 검증: `npx vitest run src/components/designer/EditorHeader.test.tsx src/components/ViewExportMenu.test.tsx src/lib/export-presentation.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `ViewExportMenu` PDF 오프스크린 export도 presentation-level aspect ratio를 명시적으로 받을 수 있는지 audit.
- `EditorHeader`와 `SlideEditor`의 중복 export handler를 공통 훅으로 정리할지 검토.
- export telemetry에 ratio와 export entrypoint를 기록해 품질 문제 재현성을 높인다.

## 6. 이번 루프 반영 상태

- 반영됨: `src/components/designer/EditorHeader.tsx` PDF/PPTX export ratio 전달.
- 반영됨: `src/components/designer/EditorHeader.test.tsx` 4:3 header export A/B 테스트 추가.
- 검증 완료: `npx vitest run src/components/designer/EditorHeader.test.tsx src/components/ViewExportMenu.test.tsx src/lib/export-presentation.test.ts` 통과, 3개 파일 4개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 24개 파일 70개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
