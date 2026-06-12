# WorkAI Slide Insight Anatomy Audit Research

## 연구 목적

WorkAI의 덱 품질 감사는 덱 전체의 수치/KPI, 실행 요청, 출처 신호를 확인하지만, 개별 슬라이드가 일반적인 설명만 담고 있어도 다른 슬라이드의 근거와 액션 신호 때문에 통과할 수 있었다. 의사결정형 발표자료는 각 본문 슬라이드가 관찰/근거, 사업적 의미, 권고 행동 중 최소한 두 축을 연결해야 청중이 빠르게 판단할 수 있으므로 슬라이드 단위 인사이트 구조 감사를 검토했다.

## Source 1

Source URL: https://www.tableau.com/visualization/data-visualization-best-practices

Key Summary: Tableau는 시각화를 만들기 전에 청중, 질문, 답변, 전달하려는 메시지를 먼저 정해야 하며, 적절한 차트와 명확한 색/텍스트를 통해 특정하고 유용한 takeaway가 남아야 한다고 설명한다.

Applicability: WorkAI 발표자료는 단순히 데이터를 배치하는 도구가 아니라 청중의 질문에 답하고 판단을 유도해야 한다. 슬라이드마다 근거와 메시지 또는 행동이 연결되지 않으면 takeaway가 흐려진다.

Difference From This Project: Tableau 문서는 데이터 시각화 일반 원칙이고, WorkAI 변경은 생성된 발표 슬라이드를 정적 감사 함수로 평가하는 구현이다.

Adoption Priority: High

Reflected Status: 본문 슬라이드의 인사이트 구조 점수가 2 미만이면 `인사이트 연결 부족` 이슈를 생성한다.

## Source 2

Source URL: https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm

Key Summary: Tableau Blueprint는 좋은 대시보드가 청중이 답을 찾고 행동하도록 돕는다고 설명한다. 문맥, 제목, 캡션, 단위, 해설은 데이터 뷰 이해를 높이며, 좋은 데이터 스토리는 데이터 이상을 포함해야 한다.

Applicability: 발표 슬라이드는 대시보드와 마찬가지로 청중이 답을 빠르게 찾도록 도와야 한다. 제목과 본문이 단순 목록이면 데이터가 있어도 왜 중요한지 또는 다음 행동이 무엇인지 알기 어렵다.

Difference From This Project: Tableau Blueprint는 대시보드 설계 가이드이고, WorkAI는 `Presentation` 객체의 텍스트/정형 데이터/출처/전략 목표 신호를 검사한다.

Adoption Priority: High

Reflected Status: `BUSINESS_MEANING_PATTERN`을 추가해 의미, 영향, 효과, 타당성, 기회, 개선 등 사업적 의미 신호를 별도로 감지한다.

## Source 3

Source URL: https://online.hbs.edu/blog/post/data-storytelling

Key Summary: Harvard Business School Online은 데이터 스토리텔링을 데이터셋의 인사이트를 내러티브와 시각화로 효과적으로 전달하는 능력으로 설명한다. 좋은 데이터 스토리는 데이터, 시각화, 내러티브 요소가 함께 작동해야 한다.

Applicability: WorkAI가 생성하는 사업 보고서형 슬라이드는 숫자만으로 완성되지 않는다. 근거가 있더라도 내러티브 또는 권고 행동과 연결되어야 실제 인사이트로 작동한다.

Difference From This Project: HBS 문서는 분석 커뮤니케이션 교육 자료이고, WorkAI 변경은 휴리스틱 기반 로컬 품질 감사다.

Adoption Priority: Medium

Reflected Status: 인사이트 구조를 관찰/근거, 사업적 의미, 권고 행동의 세 요소로 분해하고, 슬라이드 단위로 최소 두 요소 이상을 요구한다.

## Source 4

Source URL: https://www.nngroup.com/articles/dashboards-preattentive/

Key Summary: NN/g는 대시보드가 빠르게 소비되고 행동으로 이어질 수 있는 핵심 정보를 전달해야 하며, 분석 대시보드도 중요한 정보를 빠르게 커뮤니케이션해야 한다고 설명한다.

Applicability: 발표 품질 감사도 빠른 이해와 행동 가능성을 확인해야 한다. 덱 전체에는 근거와 액션이 있어도 중간 슬라이드가 일반적 설명이면 청중의 판단 흐름이 끊긴다.

Difference From This Project: NN/g 문서는 대시보드 UX 원칙이고, WorkAI는 슬라이드별 텍스트와 데이터 필드의 인사이트 연결성을 검사한다.

Adoption Priority: Medium

Reflected Status: 기존 덱 단위 신호와 별개로 개별 본문 슬라이드를 순회하며 약한 슬라이드를 독립적으로 표시한다.

## 적용 결정

- 덱 전체의 근거/액션 신호만으로 통과시키지 않고, 본문 슬라이드별 인사이트 구조를 검사한다.
- 관찰/근거는 수치/KPI, 시각화 데이터, 출처 URL 중 하나로 판단한다.
- 사업적 의미는 의미, 영향, 효과, 필요성, 타당성, 기회, 개선 등 의사결정 해석 단어로 판단한다.
- 권고 행동은 실행, 도입, 승인, 계획, 추진, 로드맵 등 행동 신호 또는 `strategicGoal`로 판단한다.
- 본문 항목이 있는 표지 외 슬라이드에서 세 요소 중 2개 미만이면 `인사이트 연결 부족` medium 이슈를 추가한다.
- A/B 테스트는 덱 전체에는 근거와 액션이 있어 기존 deck-level 기준은 통과하지만, 개별 일반 슬라이드는 candidate 감사가 잡아내는 mixed deck을 사용한다.

## 검증

- Targeted test: `npx vitest run src/lib/deck-quality-audit.test.ts` 통과(1파일/5테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(34파일/91테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
