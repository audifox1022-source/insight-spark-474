# WorkAI Insight Depth Guardrails Research

## 연구 목적

WorkAI의 발표 생성 프롬프트가 단순 요약이나 일반론으로 흐르지 않도록, `Insight Brief`에 관찰, 의미, 행동, 근거, 리스크 기준을 명시하는 변경을 검토했다. 목표는 사용자가 입력한 데이터와 의사결정 맥락을 슬라이드 메시지에 더 직접적으로 연결하는 것이다.

## Source 1

Source URL: https://developers.google.com/ml-kit/genai/prompt/android/prompt-design

Key Summary: Google의 Gemini Prompt API 문서는 프롬프트를 더 효과적으로 만들기 위해 지침, 제약, 예시가 구분된 구조를 사용하고, 구분자를 통해 프롬프트 구성 요소를 분리하라고 권장한다. 반복적이고 장황한 지시보다 초점이 뚜렷한 지시가 더 적합하다고 설명한다.

Applicability: WorkAI는 Gemini 기반 발표 생성을 사용하므로, `Insight Brief`의 구조화된 섹션은 모델이 목표, 제약, 산출 기준을 분리해서 해석하는 데 직접적으로 적용된다.

Difference From This Project: Google 문서는 모바일 Gemini Nano Prompt API에 초점이 있고, WorkAI는 발표자료 생성과 구조화 JSON/PPT 흐름을 다룬다. 따라서 원칙은 적용하되, 실제 기준은 발표 슬라이드의 메시지 품질에 맞게 재정의했다.

Adoption Priority: High

Reflected Status: `formatInsightBriefForPrompt`에 `[인사이트 깊이 기준]` 섹션을 추가해 지침과 실패 패턴을 분리했다.

## Source 2

Source URL: https://www.tableau.com/visualization/data-visualization-best-practices

Key Summary: Tableau는 시각화를 만들기 전 청중, 청중의 질문, 찾고 있는 답, 전달하려는 메시지를 먼저 명확히 하라고 제안한다. 또한 적절한 차트 선택과 명확한 색상/레이아웃을 통해 메시지와 구체적인 takeaways가 빠르게 전달되어야 한다고 설명한다.

Applicability: WorkAI의 슬라이드는 단순 디자인 결과물이 아니라 데이터, 근거, 청중 질문을 기반으로 한 의사결정 도구여야 한다. 따라서 슬라이드마다 관찰과 의미, 행동을 연결하는 기준이 필요하다.

Difference From This Project: Tableau 문서는 사람이 직접 만드는 대시보드와 시각화 모범 사례다. WorkAI에는 LLM이 생성하는 발표자료이므로, 동일 원칙을 프롬프트 강제 규칙과 A/B 테스트 점수로 변환했다.

Adoption Priority: High

Reflected Status: 새 규칙에서 각 슬라이드 제목이 무엇이 변했고 왜 중요한지 드러내도록 요구하고, 본문에 근거/출처 또는 리스크/가정을 연결하도록 했다.

## Source 3

Source URL: https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm

Key Summary: Tableau Blueprint는 좋은 시각화가 청중이 답을 도출하고 행동하도록 돕는다고 설명한다. 또한 목적, 청중, 문맥, 차트 선택을 분명히 해야 복잡한 결정을 쉽게 만들 수 있다고 강조한다.

Applicability: 발표자료 생성의 품질도 청중이 답을 얻고 실행할 수 있는지로 평가해야 한다. `Insight Brief`의 기존 의사결정 질문, 핵심 청중, 기대 행동과 새 깊이 기준을 묶으면 이 기준을 프롬프트 단계에서 강화할 수 있다.

Difference From This Project: Tableau Blueprint는 BI 조직 성숙도와 대시보드 제작 지침까지 포함한다. WorkAI는 전체 BI 운영이 아니라 프롬프트 기반 발표 생성이므로, 실행 가능한 부분만 슬라이드 메시지 요구사항으로 축소 적용했다.

Adoption Priority: High

Reflected Status: `권고 행동`, `근거 연결`, `리스크/가정` 기준을 추가해 슬라이드가 단순 설명에서 실행 가능한 의사결정 메시지로 이동하도록 했다.

## Source 4

Source URL: https://www.nngroup.com/articles/dashboards-preattentive/

Key Summary: Nielsen Norman Group은 대시보드가 한눈에 핵심 정보를 전달하고 사용자가 빠르게 행동할 수 있게 해야 한다고 설명한다. 분석형 대시보드도 의사결정과 분석을 위한 중요한 정보를 빠르게 전달해야 한다고 구분한다.

Applicability: WorkAI 발표자료의 개별 슬라이드도 청중이 빠르게 판단할 수 있는 정보 단위여야 한다. 그래서 일반적인 배경 설명보다 변화, 중요성, 다음 행동을 선명하게 드러내는 기준이 필요하다.

Difference From This Project: NN/g 문서는 대시보드 UX와 시각 지각 중심이다. WorkAI 변경은 UI 차트 렌더링이 아니라 생성 프롬프트 텍스트에 적용했다.

Adoption Priority: Medium

Reflected Status: `일반론 금지` 규칙과 제목 기준을 추가해 슬라이드가 한눈에 판단 가능한 메시지를 갖도록 유도했다.

## 적용 결정

- `Insight Brief`에 `insightDepthRequirements`를 추가한다.
- 프롬프트에 `[인사이트 깊이 기준]` 섹션을 추가해 핵심 관찰, 사업적 의미, 권고 행동, 근거 연결, 리스크/가정을 명시한다.
- 각 기준에는 실패 패턴을 함께 적어 모델이 피해야 할 일반론을 구체적으로 인식하게 한다.
- 생성 강제 규칙을 `일반론 금지` 중심으로 강화한다.
- A/B 테스트는 이전 포맷 대비 새 포맷이 인사이트 깊이 루브릭에서 유의미하게 높은 점수를 받는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/insight-brief.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(28파일/76테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
