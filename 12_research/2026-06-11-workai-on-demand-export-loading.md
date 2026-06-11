# WorkAI On-demand Export Loading 리서치

작성일: 2026-06-11  
대상 제품: WorkAI 디자이너 진입 및 PDF/PPTX 내보내기 경로  
이번 루프 결론: 사용자가 디자이너에 들어오는 시점과 파일을 내보내는 시점은 다르다. PDF/PPTX export 엔진은 버튼 클릭 시점에만 필요하므로 `SlideEditor`의 정적 export import를 dynamic import로 바꾼다.

## 1. 현재 제품 관찰

- `SlideEditor`는 PDF 미리보기와 PPTX 다운로드를 위해 `@/lib/export-presentation`을 정적 import했다.
- `export-presentation`은 `pdf-lib`, `pptxgenjs` 등 무거운 export 의존성을 끌어온다.
- 네 번째 루프에서 초기 HTML preload는 줄였지만, 디자이너 진입 시 export 관련 코드가 따라올 가능성이 남아 있었다.
- 사용자가 디자이너에 진입하더라도 PDF/PPTX 내보내기를 바로 누르지 않는 경우가 많으므로, export 엔진은 클릭 시점 로딩이 더 적합하다.

## 2. 외부 리서치 요약

### 2.1 코드 스플리팅은 사용자 상호작용 이후 필요한 코드를 분리하는 데 적합하다

- Source URL: https://web.dev/learn/performance/code-split-javascript
- Key Summary: web.dev는 초기 페이지 로드에 필요하지 않은 JavaScript를 나중에 로드해 payload를 줄이라고 설명한다.
- Applicability: 내보내기 엔진은 편집 화면 표시에는 필요하지 않고 PDF/PPTX 버튼 클릭 후에만 필요하다.
- Difference From This Project: 워크스페이스 단위 lazy loading보다 더 세밀한 “명령 버튼 단위” lazy loading을 적용한다.
- Adoption Priority: 높음.
- Reflected Status: `SlideEditor`의 `handleExportPDF`, `handleExportPPTX`에서 `import('@/lib/export-presentation')`를 사용.

### 2.2 React 코드 스플리팅은 사용자가 필요한 순간 코드 로드를 유도한다

- Source URL: https://legacy.reactjs.org/docs/code-splitting.html
- Key Summary: React 문서는 bundle을 작게 유지하고 필요한 코드만 로드하기 위해 dynamic import 기반 code splitting을 사용한다고 설명한다.
- Applicability: 버튼 핸들러 내부 dynamic import는 UI 렌더링과 heavy export engine 로딩을 분리한다.
- Difference From This Project: React.lazy 컴포넌트 분리가 아니라 이벤트 핸들러 내부 module import다.
- Adoption Priority: 높음.
- Reflected Status: export 함수 호출 전 dynamic import 적용.

### 2.3 Vite dynamic import는 별도 chunk 생성과 함께 동작한다

- Source URL: https://vite.dev/guide/features
- Key Summary: Vite는 dynamic import를 네이티브 ESM 기반으로 처리하고 빌드 시 별도 chunk로 분리한다.
- Applicability: `export-presentation`를 클릭 시점 chunk로 분리해 디자이너 진입 chunk를 줄일 수 있다.
- Difference From This Project: chunk 분리 성공 여부는 빌드 산출물로 확인해야 한다.
- Adoption Priority: 중간.
- Reflected Status: 빌드 결과 `export-presentation-*.js`가 별도 chunk로 생성됨.

## 3. 제품 개선 결정

선택 기능: `On-demand Export Loading`

- `SlideEditor` 상단의 정적 `exportToPdf`, `exportToPptx` import 제거.
- PDF 미리보기 클릭 시 `exportToPdf`를 dynamic import.
- PPTX 다운로드 클릭 시 `exportToPptx`를 dynamic import.
- 기존 사용자 흐름과 toast 상태는 유지한다.

## 4. A/B 테스트 설계

- Control A: 네 번째 루프 직후 build 산출물.
- Control A SlideEditor chunk: 56.62 kB.
- Candidate B: export 함수 dynamic import 적용 후 build 산출물.
- Candidate B SlideEditor chunk: 50.43 kB.
- 평가 기준: SlideEditor chunk가 52 kB 이하이고 baseline보다 감소해야 한다.
- 실행 명령: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --baseline-initial-kb 4652.62 --max-initial-kb 1500 --chunk-pattern SlideEditor --baseline-chunk-kb 56.62 --max-chunk-kb 52 --min-improvement 0.2`.
- 실제 결과: SlideEditor chunk 50.43 kB, 개선율 10.93%, passed true.

## 5. 후속 개선 백로그

- `TranslatorWorkspace`의 docx/mammoth/file-saver도 파일 타입 또는 저장 형식 선택 시점 dynamic import로 분리.
- `PDFEditorWorkspace`의 html2canvas/jsPDF도 내보내기 버튼 시점으로 지연.
- export 클릭 후 첫 로딩 지연을 줄이기 위해 idle prefetch 전략 검토.

## 6. 이번 루프 반영 상태

- 반영됨: `src/components/designer/SlideEditor.tsx`에서 export 모듈 정적 import 제거.
- 반영됨: `scripts/bundle-ab-check.mjs`에 특정 chunk A/B 검증 옵션 추가.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --baseline-initial-kb 4652.62 --max-initial-kb 1500 --chunk-pattern SlideEditor --baseline-chunk-kb 56.62 --max-chunk-kb 52 --min-improvement 0.2` 통과.
- 검증 완료: `node --check scripts/bundle-ab-check.mjs` 통과.
- 검증 완료: `npm test` 통과, 13개 파일 43개 테스트 성공.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
