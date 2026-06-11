# WorkAI Vendor Preload Diet 리서치

작성일: 2026-06-11  
대상 제품: WorkAI 초기 HTML modulepreload 및 vendor chunk 구조  
이번 루프 결론: 단순 lazy loading 이후에도 `index.html`이 무거운 export/document/chart/pdf chunk를 modulepreload로 당겨오고 있었다. `manualChunks`와 `modulePreload.resolveDependencies`를 함께 조정해 첫 화면 초기 JS preload 총량을 줄인다.

## 1. 현재 제품 관찰

- 세 번째 루프에서 entry JS는 349.55 kB에서 166.52 kB로 줄었다.
- 그러나 `dist/index.html`에는 `vendor` 4,063.71 kB와 `pdfjs` 421.18 kB가 modulepreload로 남아 있었다.
- 즉, 첫 HTML 기준 초기 JS preload 총량은 약 4,652.62 kB로 여전히 컸다.
- 원인은 `vite.config.ts`가 `node_modules` 전체를 단일 `vendor` chunk로 강제 묶고, Vite modulepreload가 lazy dependency chunk까지 선로딩한 점이다.

## 2. 외부 리서치 요약

### 2.1 Vite는 modulepreload dependency 목록을 커스터마이즈할 수 있다

- Source URL: https://vite.dev/config/build-options
- Key Summary: Vite build options는 `build.modulePreload.resolveDependencies`를 통해 dynamic import에 대해 preload할 dependency 목록을 조정할 수 있다고 설명한다.
- Applicability: WorkAI는 lazy chunk의 무거운 의존성을 첫 HTML preload에서 제외해야 한다.
- Difference From This Project: 기본 Vite 동작은 dynamic import 의존성을 적극 preload하므로, 워크스페이스 단위 지연 로딩 의도와 충돌할 수 있다.
- Adoption Priority: 높음.
- Reflected Status: `vite.config.ts`에 `modulePreload.resolveDependencies`를 추가해 `audio-tools`, `chart-tools`, `document-tools`, `export-tools`, `pdfjs`를 첫 HTML preload에서 제외.

### 2.2 코드 스플리팅의 목적은 첫 로드에 필요한 JS를 줄이는 것이다

- Source URL: https://web.dev/learn/performance/code-split-javascript
- Key Summary: web.dev는 코드 스플리팅이 페이지 로드 시 필요한 코드와 이후 필요한 코드를 분리해 초기 JavaScript payload를 줄이는 전략이라고 설명한다.
- Applicability: 초기 HTML이 lazy workspace 전용 chunk를 preload하면 코드 스플리팅의 효과가 약해진다.
- Difference From This Project: entry chunk만 보지 않고 `index.html`이 실제로 선로딩하는 JS 합계를 측정해야 한다.
- Adoption Priority: 높음.
- Reflected Status: `scripts/bundle-ab-check.mjs`가 entry 크기뿐 아니라 초기 JS preload 합계를 계산하도록 확장.

### 2.3 chunk는 사용자 경로별로 나눠야 한다

- Source URL: https://legacy.reactjs.org/docs/code-splitting.html
- Key Summary: React code splitting 문서는 사용자가 현재 필요한 코드만 로드하도록 bundle을 분할하는 접근을 설명한다.
- Applicability: WorkAI의 export, document, chart, audio, pdfjs 도구는 첫 발표자료 입력 화면에는 필요하지 않다.
- Difference From This Project: React lazy만으로 충분하지 않아 Vite chunk 분류와 preload 필터까지 필요했다.
- Adoption Priority: 높음.
- Reflected Status: `manualChunks`를 `react-vendor`, `ui-vendor`, `supabase`, `export-tools`, `document-tools`, `chart-tools`, `audio-tools`, `pdfjs` 등으로 분리.

## 3. 제품 개선 결정

선택 기능: `Vendor Preload Diet`

- 모든 `node_modules`를 단일 `vendor`로 묶는 전략을 폐기한다.
- 첫 화면에 필요한 React/UI/Supabase 계열과, 워크스페이스 전용 heavy tools를 분리한다.
- HTML modulepreload에서는 export/document/chart/audio/pdfjs chunk를 제외한다.
- lazy workspace를 열 때 해당 chunk가 필요 시점에 로드되도록 한다.

## 4. A/B 테스트 설계

- Control A: 세 번째 루프 직후 build 산출물.
- Control A entry JS: 166.52 kB.
- Control A 초기 JS preload 총량: 4,652.62 kB.
- Candidate B: vendor split + modulepreload filter 적용 후 build 산출물.
- Candidate B entry JS: 166.88 kB.
- Candidate B 초기 JS preload 총량: 1,001.00 kB.
- 평가 기준: entry JS 260 kB 이하, 초기 JS preload 1,500 kB 이하, baseline 대비 20% 이상 개선, lazy workspace chunk 4개 이상 유지.
- 실행 명령: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --baseline-initial-kb 4652.62 --max-initial-kb 1500 --min-improvement 0.2`.
- 실제 결과: entry 개선율 52.26%, 초기 preload 개선율 78.49%, passed true.

## 5. 후속 개선 백로그

- 실제 브라우저에서 첫 화면 성능을 Playwright/Lighthouse로 측정하는 게이트 추가.
- HTML CSS 140 kB와 외부 폰트 preload 전략 점검.
- export/document chunk는 여전히 개별 크기가 크므로 export 버튼 클릭 시점 dynamic import로 더 세밀하게 분리.
- `dist/index.html`의 modulepreload 회귀를 CI에서 자동 감지하도록 package script 추가.

## 6. 이번 루프 반영 상태

- 반영됨: `vite.config.ts`의 manualChunks를 사용 경로별로 세분화.
- 반영됨: `vite.config.ts`에 `modulePreload.resolveDependencies` 필터 추가.
- 반영됨: `scripts/bundle-ab-check.mjs`에 초기 JS preload 합계 A/B 검증 추가.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --baseline-initial-kb 4652.62 --max-initial-kb 1500 --min-improvement 0.2` 통과.
- 검증 완료: `node --check scripts/bundle-ab-check.mjs` 통과.
- 검증 완료: `npm test` 통과, 13개 파일 43개 테스트 성공.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
