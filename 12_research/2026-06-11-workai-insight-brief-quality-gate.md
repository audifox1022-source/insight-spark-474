# WorkAI 인사이트 브리프 품질 게이트 리서치

작성일: 2026-06-11  
대상 제품: WorkAI 발표자료 생성 흐름  
이번 루프 결론: 생성 전 입력을 `목표-청중-근거-행동-리스크-시각화`로 구조화하는 인사이트 브리프를 추가하고, 원본 프롬프트 대비 의사결정 준비도 A/B 점수가 개선될 때만 반영한다.

## 1. 현재 제품 관찰

- 핵심 기능은 파일/주제 입력을 받아 AI 실행계획, 목차, 전체 슬라이드를 생성하는 발표자료 자동화다.
- 기존 프롬프트는 고밀도 전략 슬라이드, 업로드 문서 기반 생성, JSON 스키마를 강하게 요구한다.
- 그러나 사용자가 짧은 주제만 입력하면 AI가 일반적인 슬라이드를 만들 위험이 남는다.
- 제품 완성도를 높이는 직접 개선점은 모델 교체보다 생성 입력의 품질을 높이는 전처리 계층이다.

## 2. 외부 리서치 요약

### 2.1 데이터 스토리텔링은 데이터, 내러티브, 시각화가 함께 있어야 한다

- Source URL: https://online.hbs.edu/blog/post/data-storytelling
- Key Summary: Harvard Business School Online은 데이터 스토리텔링을 데이터셋의 인사이트를 내러티브와 시각화로 효과적으로 전달하는 능력으로 설명한다.
- Applicability: WorkAI 발표자료 생성은 단순 요약보다 의사결정자가 이해할 수 있는 흐름과 시각화를 만들어야 한다.
- Difference From This Project: 현재 앱은 슬라이드 생성 프롬프트에 시각화 요구가 있으나, 사용자 입력 단계에서 내러티브/의사결정/행동을 구조화하지 않는다.
- Adoption Priority: 높음.
- Reflected Status: 인사이트 브리프의 `서사 구조`, `근거 기반`, `권장 슬라이드 전략`으로 반영.

### 2.2 데이터 스토리는 행동 가능한 결론으로 이어져야 한다

- Source URL: https://www.clicdata.com/blog/data-storytelling-for-data-analysts/
- Key Summary: 데이터 스토리텔링은 원시 데이터를 의사결정자가 행동할 수 있는 인사이트로 바꾸는 구조적 방식이다.
- Applicability: WorkAI가 생성하는 장표는 “좋은 내용”이 아니라 다음 행동을 끌어내야 한다.
- Difference From This Project: 기존 설정 화면은 생성 스타일과 분량은 고를 수 있지만, 기대 행동이 비어 있는지 점검하지 않는다.
- Adoption Priority: 높음.
- Reflected Status: `기대 행동`, `실행 가능성` 게이트와 생성 강제 규칙에 반영.

### 2.3 AI 제품은 사용자가 결과를 감독할 수 있는 피드백과 통제점을 가져야 한다

- Source URL: https://pair.withgoogle.com/guidebook/
- Key Summary: Google People + AI Guidebook은 사람 중심 AI 제품 설계를 위한 실무 가이드를 제공한다.
- Applicability: 생성형 AI 결과를 바로 만들기보다, 사용자가 입력 품질을 보고 보강할 수 있어야 한다.
- Difference From This Project: 기존 흐름은 계획 승인 단계는 있으나, 계획 생성 전 입력의 약점을 명시적으로 보여주지 않는다.
- Adoption Priority: 높음.
- Reflected Status: 설정 화면에 `인사이트 품질 게이트` UI를 추가해 누락 항목을 노출.

### 2.4 LLM 애플리케이션은 명시적 평가 기준으로 회귀를 막아야 한다

- Source URL: https://developers.openai.com/api/docs/guides/evals
- Key Summary: OpenAI Evals 문서는 스타일과 콘텐츠 기준에 맞는지 모델 출력을 평가해 LLM 애플리케이션 성능을 이해하라고 설명한다.
- Applicability: WorkAI 개선은 느낌이 아니라 평가 기준으로 비교해야 한다.
- Difference From This Project: 이번 루프는 외부 모델 호출이 아니라 로컬 deterministic rubric으로 생성 입력의 의사결정 준비도를 평가한다.
- Adoption Priority: 높음.
- Reflected Status: `src/lib/insight-brief.test.ts`에 원본 프롬프트와 인사이트 브리프 보강 프롬프트를 비교하는 A/B 테스트 추가.

### 2.5 루브릭 기반 비교는 잘 정의된 기준에서 유효하다

- Source URL: https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals
- Key Summary: Braintrust는 지시 준수, 간결성, 사실 근거성처럼 기준이 명확한 항목은 루브릭 기반 평가와 pairwise 비교에 적합하다고 설명한다.
- Applicability: 이번 기능은 최종 슬라이드 미학이 아니라 입력 프롬프트가 의사결정, 청중, 근거, 행동, 리스크, 시각화 단서를 포함하는지 평가한다.
- Difference From This Project: 사람 평가 대신 로컬 테스트를 사용하므로 실제 사용자 만족도는 이후 별도 계측이 필요하다.
- Adoption Priority: 중간.
- Reflected Status: A/B 테스트의 `promptReadinessScore`가 명시 기준을 체크한다.

### 2.6 A/B 테스트는 통제군과 후보군을 같은 기준으로 비교해야 한다

- Source URL: https://docs.growthbook.io/open-guide-to-ab-testing.v1.0.pdf
- Key Summary: GrowthBook의 A/B 테스트 가이드는 통계적 유의성, 샘플 크기, 변형 비교 등 실험 설계의 기본 개념을 다룬다.
- Applicability: 제품 기능을 반영하기 전 baseline과 candidate를 분리하고 같은 루브릭으로 비교해야 한다.
- Difference From This Project: 이번은 온라인 트래픽 실험이 아니라 코드 반영 전 로컬 오프라인 A/B다.
- Adoption Priority: 중간.
- Reflected Status: 테스트명에 `A/B test`를 명시하고, 3개 업무 시나리오에서 candidate가 baseline보다 좋아야 통과하도록 구성.

## 3. 제품 개선 결정

선택 기능: `Insight Brief Quality Gate`

- 생성 전 사용자의 입력을 분석해 100점 만점 품질 점수를 만든다.
- 점수 기준은 의사결정 질문 20점, 청중 맥락 15점, 근거와 데이터 25점, 실행 가능성 20점, 리스크 공개 10점, 시각화 단서 10점이다.
- 같은 브리프를 화면과 AI 프롬프트에 동시에 사용해 UI와 실제 생성 입력이 어긋나지 않게 한다.
- AI 계획 생성, 목차 생성, 전체 슬라이드 생성에 모두 브리프를 주입한다.
- 점수가 낮아도 사용자는 생성할 수 있지만, 보강 항목을 보고 입력 품질을 높일 수 있다.

## 4. A/B 테스트 설계

- Control A: 사용자가 입력한 원본 업무 프롬프트.
- Candidate B: 원본 업무 프롬프트 + 인사이트 브리프.
- 샘플: 영업 성과 보고, 고객지원 자동화 제안, 시장 진입성 검토 3개 업무 시나리오.
- 평가 루브릭: 의사결정 질문, 핵심 청중, 근거 기반, 기대 행동, 서사 구조, 품질 게이트, 권장 슬라이드 전략, 리스크/가정, 시각화 전략, 관찰-의미-행동 규칙 포함 여부.
- 반영 조건: 모든 샘플에서 B가 A보다 높고, 평균 개선폭이 70점 이상이어야 한다.
- 구현 위치: `src/lib/insight-brief.test.ts`.

## 5. 후속 개선 백로그

- 생성된 슬라이드마다 근거 출처를 추적하는 citation/data lineage 필드 강화.
- 목차 승인 화면에 인사이트 브리프의 권장 슬라이드 전략을 직접 편집 가능한 형태로 연결.
- 실제 사용자 행동 로그 기반으로 “보강 항목을 클릭한 뒤 생성 완료율/수정 횟수” 계측.
- 대용량 vendor 번들 코드 스플리팅으로 최초 로딩 속도 개선.
- 온라인 A/B를 위한 feature flag와 익명 이벤트 수집 설계.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/insight-brief.ts` 신규 추가.
- 반영됨: `src/hooks/usePresentation.ts` 생성 파이프라인에 인사이트 브리프 주입.
- 반영됨: `src/components/PresentationSetupForm.tsx` 설정 화면 품질 게이트 추가.
- 반영됨: `src/lib/insight-brief.test.ts` A/B 및 단위 테스트 추가.
- 검증 완료: `npx vitest run src/lib/insight-brief.test.ts` 통과, 1개 파일 3개 테스트 성공.
- 검증 완료: `npm test` 통과, 12개 파일 40개 테스트 성공.
- 검증 완료: `npm run build` 통과. 기존과 같은 Browserslist/대용량 번들 경고가 남아 있으나 빌드 실패는 없음.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
