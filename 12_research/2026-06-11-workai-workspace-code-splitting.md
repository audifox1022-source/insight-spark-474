# WorkAI 워크스페이스 코드 스플리팅 리서치

작성일: 2026-06-11  
대상 제품: WorkAI 첫 화면 로딩 및 워크스페이스 전환 구조  
이번 루프 결론: 발표자료 첫 화면에 필요하지 않은 번역, 오디오, PDF, 디자이너 워크스페이스를 초기 entry bundle에서 분리한다. 한 번 방문한 워크스페이스는 계속 마운트해 상태 보존을 유지한다.

## 1. 현재 제품 관찰

- `src/pages/Index.tsx`가 Translator, Audio Lab, PDF Editor, Slide Designer를 모두 정적 import했다.
- 실제 첫 화면은 발표자료 생성 탭이지만, 보조 워크스페이스 코드가 초기 JS에 함께 포함됐다.
- 빌드 기준 entry JS는 `dist/assets/index-BXLOCGmM.js` 349.55 kB였다.
- Vite 빌드가 대용량 chunk 경고를 지속적으로 출력했다.

## 2. 외부 리서치 요약

### 2.1 초기 로딩에 필요 없는 JavaScript는 나중에 불러야 한다

- Source URL: https://web.dev/learn/performance/code-split-javascript
- Key Summary: web.dev는 코드 스플리팅이 페이지 로드 시 필요한 JavaScript와 사용자 상호작용 이후에 로드할 JavaScript를 나눠 초기 payload를 줄일 수 있다고 설명한다.
- Applicability: WorkAI는 첫 화면과 보조 워크스페이스가 명확히 나뉘므로 lazy loading에 적합하다.
- Difference From This Project: 라우트 기반 앱은 아니지만 내부 탭/워크스페이스 기준으로 같은 원리를 적용할 수 있다.
- Adoption Priority: 높음.
- Reflected Status: `Index.tsx`에서 보조 워크스페이스 4개를 `React.lazy` dynamic import로 전환.

### 2.2 React lazy loading은 현재 필요한 코드만 로드하게 한다

- Source URL: https://legacy.reactjs.org/docs/code-splitting.html
- Key Summary: React 문서는 code splitting과 lazy loading이 사용자가 현재 필요로 하는 코드만 로드하게 해 초기 로딩에 필요한 코드량을 줄인다고 설명한다.
- Applicability: Translator, Audio Lab, PDF Editor, Slide Designer는 사용자가 해당 모드를 열 때만 필요하다.
- Difference From This Project: 단순 conditional render만 쓰면 상태가 사라질 수 있으므로, 한 번 열린 앱은 `loadedApps`에 기록해 계속 마운트한다.
- Adoption Priority: 높음.
- Reflected Status: `loadedApps` 상태와 `shouldRenderApp` 게이트로 상태 보존형 lazy mount 구현.

### 2.3 Vite는 dynamic import 기반 chunk splitting을 지원한다

- Source URL: https://vite.dev/config/build-options
- Key Summary: Vite build 옵션 문서는 async JS chunk의 CSS code splitting 등 빌드 산출물 분리 전략을 다룬다.
- Applicability: React lazy의 dynamic import가 Vite/Rollup build에서 별도 chunk로 분리되는지 확인해야 한다.
- Difference From This Project: Vite 설정을 바꾸기보다 컴포넌트 import 구조를 바꾸는 낮은 위험 변경으로 시작했다.
- Adoption Priority: 중간.
- Reflected Status: `npm run build` 결과 `AudioLabWorkspace`, `PDFEditorWorkspace`, `TranslatorWorkspace`, `SlideEditor` 별도 JS chunk 생성 확인.

## 3. 제품 개선 결정

선택 기능: `Workspace Lazy Mount Code Splitting`

- 발표자료 탭은 기존처럼 즉시 렌더링한다.
- Translator, Audio Lab, PDF Editor, Slide Designer는 `React.lazy`로 동적 import한다.
- 사용자가 한 번 연 앱은 `loadedApps` Set에 기록해 hidden 상태로 계속 유지한다.
- 이 방식은 초기 entry bundle을 줄이면서, 앱 전환 후 사용자가 입력한 상태가 사라지는 문제를 줄인다.

## 4. A/B 테스트 설계

- Control A: 두 번째 루프 직후 build 산출물. entry JS 349.55 kB.
- Candidate B: 워크스페이스 lazy import 적용 후 build 산출물. entry JS 166.53 kB.
- 평가 기준: entry JS가 260 kB 이하이고 baseline 대비 20% 이상 감소하며, 보조 워크스페이스 lazy chunk가 4개 이상 생성되어야 한다.
- 실행 명령: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --min-improvement 0.2`.
- 실제 결과: entry JS 166.53 kB, 개선율 52.36%, lazy chunks 4개, passed true.

## 5. 후속 개선 백로그

- vendor chunk가 4,063 kB로 여전히 크므로 PDF, docx, recharts, editor 계열 vendor를 사용 경로별로 추가 분리.
- `vite.config.ts`의 manualChunks 전략을 실제 lazy route별 성능 데이터 기반으로 재검토.
- Playwright/Lighthouse로 첫 화면 TTI, LCP, total blocking time을 측정하는 실제 브라우저 성능 게이트 추가.
- 사전 로딩이 필요한 경우 hover 또는 idle 시점 prefetch 전략 검토.

## 6. 이번 루프 반영 상태

- 반영됨: `src/pages/Index.tsx`에서 보조 워크스페이스 4개를 lazy import로 전환.
- 반영됨: `scripts/bundle-ab-check.mjs` 번들 A/B 체크 스크립트 추가.
- 검증 완료: `npm run build` 통과, entry JS 349.55 kB -> 166.52 kB.
- 검증 완료: `node scripts/bundle-ab-check.mjs --baseline-kb 349.55 --max-kb 260 --min-improvement 0.2` 통과.
- 검증 완료: `npm test` 통과, 13개 파일 43개 테스트 성공.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
