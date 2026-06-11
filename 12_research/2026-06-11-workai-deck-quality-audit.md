# WorkAI 생성 결과물 품질 감사 리서치

작성일: 2026-06-11  
대상 제품: WorkAI 슬라이드 디자이너 품질 검증 흐름  
이번 루프 결론: 생성 전 품질 게이트 다음에는 생성 후 로컬 품질 감사가 필요하다. AI 리뷰 API가 실패해도 사용자가 덱의 구조적 약점을 즉시 볼 수 있어야 한다.

## 1. 현재 제품 관찰

- 디자이너에는 `AI 품질 정밀 검증` 버튼과 우측 피드백 패널이 있다.
- 기존 검증은 `geminiService.runReviewerSubAgent`가 현재 슬라이드를 리뷰해야 결과가 나온다.
- 네트워크/API 실패 시 사용자는 아무 품질 피드백도 받지 못한다.
- 발표자료 생성 제품의 본연 기능은 “생성”뿐 아니라 생성된 덱이 의사결정 자료로 쓸 만한지 확인하는 것이다.

## 2. 외부 리서치 요약

### 2.1 LLM 기능에는 평가 기준이 제품 안에 들어가야 한다

- Source URL: https://developers.openai.com/api/docs/guides/evals
- Key Summary: OpenAI Evals 문서는 LLM 애플리케이션이 기대하는 스타일과 콘텐츠 기준을 테스트해야 한다고 설명한다.
- Applicability: 생성된 슬라이드도 커버, 근거, 실행 요청, 리스크, 시각화 데이터 같은 명시 기준으로 평가해야 한다.
- Difference From This Project: 온라인 평가 플랫폼이 아니라 브라우저 앱 안에서 즉시 실행되는 로컬 deterministic audit가 필요하다.
- Adoption Priority: 높음.
- Reflected Status: `src/lib/deck-quality-audit.ts`에 로컬 감사 루브릭 구현.

### 2.2 데이터 스토리텔링은 결론과 행동을 끌어내야 한다

- Source URL: https://online.hbs.edu/blog/post/data-storytelling
- Key Summary: 데이터 스토리텔링은 데이터 인사이트를 내러티브와 시각화로 전달하는 능력이다.
- Applicability: 덱 품질 감사는 본문이 있는지뿐 아니라 근거 수치와 시각화 데이터가 있는지 봐야 한다.
- Difference From This Project: 기존 normalizer는 형식을 맞추지만 덱이 행동 가능한 데이터 스토리인지 점수화하지 않는다.
- Adoption Priority: 높음.
- Reflected Status: 수치/KPI, chart/table content_data, 실행 요청을 별도 감사 항목으로 추가.

### 2.3 AI 제품은 실패해도 사용자가 통제 가능한 피드백을 받아야 한다

- Source URL: https://pair.withgoogle.com/guidebook/
- Key Summary: Google People + AI Guidebook은 사람 중심 AI 제품에서 피드백, 통제, 신뢰 형성이 중요하다고 설명한다.
- Applicability: AI 리뷰어가 실패해도 로컬 감사 결과를 우선 표시하면 사용자가 다음 행동을 결정할 수 있다.
- Difference From This Project: 기존 버튼은 AI 응답 실패 시 오류 토스트만 보여주는 구조였다.
- Adoption Priority: 높음.
- Reflected Status: `SlideEditor`의 품질 검증 버튼이 로컬 감사 결과를 먼저 열고 AI 결과는 보강으로 병합하도록 변경.

### 2.4 루브릭 기반 평가는 명확한 기준에서 강하다

- Source URL: https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals
- Key Summary: Braintrust는 명확한 기준이 있는 평가에는 루브릭과 pairwise 비교가 적합하다고 설명한다.
- Applicability: 덱 품질은 표지 여부, 중복 제목, 빈 본문, 시각화 데이터 누락, 행동 요청 부재처럼 결정적 규칙으로 볼 수 있다.
- Difference From This Project: 미학적 선호는 AI/사람 리뷰가 필요하지만 구조적 결함은 로컬 규칙으로 먼저 잡을 수 있다.
- Adoption Priority: 중간.
- Reflected Status: `deck-quality-audit.test.ts`에 title-only baseline 대비 actionable signal 증가 A/B 테스트 추가.

## 3. 제품 개선 결정

선택 기능: `Local Deck Quality Audit`

- 전체 덱을 대상으로 커버, 슬라이드 수, 레이아웃 다양성, 본문 밀도, 설명 부족, 중복 제목, 수치/KPI, 실행 요청, 리스크, 시각화 데이터 누락을 검사한다.
- 점수는 0~100으로 계산하고 A+/A/B+/B/C/D 등급으로 표시한다.
- 우측 Quality Review 패널의 기존 데이터 구조에 맞춰 strengths와 improvements를 제공한다.
- AI 리뷰어가 성공하면 로컬 감사 결과에 AI 제안을 병합한다.
- AI 리뷰어가 실패하면 로컬 감사 결과를 유지하고 warning만 보여준다.

## 4. A/B 테스트 설계

- Control A: 기존에 가까운 title-only baseline. 슬라이드 제목 존재 여부만 확인하므로 실제 개선 신호가 거의 없다.
- Candidate B: Local Deck Quality Audit.
- 샘플: 표지 없음, 빈 본문, 중복 제목, chart 데이터 누락, 수치/KPI 부재, 실행 요청 부재를 가진 약한 덱.
- 평가 기준: candidate가 baseline보다 더 많은 actionable suggestion을 제공하고, Action/Evidence 카테고리를 반드시 발견해야 한다.
- 구현 위치: `src/lib/deck-quality-audit.test.ts`.

## 5. 후속 개선 백로그

- Quality Review 패널을 현재 어두운 고정 패널에서 앱 전체 디자인 토큰과 일치하도록 정리.
- 개선 제안을 클릭하면 해당 슬라이드로 이동하고 자동 수정 프롬프트를 생성.
- 생성 직후 자동으로 audit score를 저장해 히스토리에서 품질 변화를 비교.
- 실제 사용자 수정 횟수와 audit score 상관관계 계측.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/deck-quality-audit.ts` 신규 추가.
- 반영됨: `src/components/designer/SlideEditor.tsx` 품질 검증 버튼에 로컬 감사 결과 우선 표시 및 AI 보강 병합 추가.
- 반영됨: `src/lib/deck-quality-audit.test.ts` 단위 테스트와 A/B 테스트 추가.
- 검증 완료: `npx vitest run src/lib/deck-quality-audit.test.ts` 통과, 1개 파일 3개 테스트 성공.
- 검증 완료: `npm test` 통과, 13개 파일 43개 테스트 성공.
- 검증 완료: `npm run build` 통과. 기존과 같은 대용량 번들 경고와 CSS plugin timing 안내가 있으나 빌드 실패는 없음.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
