# WorkAI Feedback Recommendation Display Research

## 연구 목적

WorkAI의 품질 리뷰 패널은 개선점의 제목과 설명은 보여주지만, 실제 수정 권고인 `suggestion`과 문제 위치인 `slideNumber`/`slideIndex`를 충분히 드러내지 않았다. 리뷰 결과가 행동으로 이어지려면 사용자가 어떤 슬라이드에서 무엇을 어떻게 고칠지 바로 파악해야 하므로, 권고 수정과 슬라이드 위치를 표시하는 개선을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/actionable-usability-findings/

Key Summary: NN/g는 사용성 결과가 가치 있으려면 이슈를 명확히 식별하고 팀이 디자인 해결책으로 이동할 수 있게 해야 한다고 설명한다. 모호한 발견은 팀이 무엇을 고쳐야 하는지 알기 어렵게 만들며, 발견은 구체적이어야 한다.

Applicability: WorkAI 리뷰 패널도 사용성 보고서처럼 사용자가 바로 수정할 수 있는 구체성을 가져야 한다. `description`만 보이고 `suggestion`이 숨겨지면 “어떻게 고칠지”가 약해진다.

Difference From This Project: NN/g 문서는 리서치 보고서 작성법이고, WorkAI 변경은 발표자료 리뷰 패널의 recommendation view-model과 렌더링 개선이다.

Adoption Priority: High

Reflected Status: `buildFeedbackRecommendationView`가 title, description, suggestion, slideLabel을 분리해 UI가 권고 수정과 위치를 표시할 수 있게 했다.

## Source 2

Source URL: https://www.nngroup.com/articles/lean-agile-documentation/

Key Summary: NN/g는 적절한 세부 정보를 올바른 위치에 간결하게 문서화하면 정보 과부하를 줄이고, 팀이 제품 개선에 집중할 수 있다고 설명한다.

Applicability: 리뷰 패널은 긴 보고서가 아니라 빠르게 스캔하는 사이드바다. 모든 원문을 길게 노출하기보다 위치, 문제, 권고 수정이라는 핵심 세부 정보만 구조화해 보여주는 편이 적합하다.

Difference From This Project: NN/g 문서는 Agile UX 문서화 원칙이고, WorkAI는 런타임 리뷰 데이터를 UI 카드용 view-model로 정규화한다.

Adoption Priority: Medium

Reflected Status: 권고 카드에 slide label, category, title, description, recommended fix를 별도 시각 단위로 배치했다.

## Source 3

Source URL: https://learn.microsoft.com/en-us/power-platform/well-architected/experience-optimization/user-interface-content

Key Summary: Microsoft Learn은 UI 콘텐츠가 짧고 스캔 가능해야 하며, 사용자가 작업을 완료하거나 의사결정을 내리는 데 필요한 맥락 중심 정보를 제공해야 한다고 설명한다.

Applicability: 발표자료 리뷰 사용자는 사이드바에서 빠르게 수정 대상을 찾는다. 슬라이드 위치와 권고 수정이 짧은 블록으로 표시되어야 편집 작업으로 이어지기 쉽다.

Difference From This Project: Microsoft 문서는 일반 UI 콘텐츠 작성 권고이고, WorkAI 변경은 품질 리뷰 recommendation 카드의 표시 필드 정규화와 렌더링이다.

Adoption Priority: High

Reflected Status: `suggestion`은 `Recommended Fix` 블록으로 분리하고, `slideIndex`/`slideNumber`는 `Slide N` 라벨로 표시한다.

## Source 4

Source URL: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/

Key Summary: NN/g는 severity rating이 우선순위와 의사결정에 쓰인다고 설명한다. 심각한 문제를 식별할 수 있어야 팀이 자원을 집중할 수 있다.

Applicability: WorkAI의 추천 카드는 이미 critical/careful 뱃지를 보여준다. 이 심각도 신호와 함께 위치 및 권고 수정을 제공해야 사용자가 우선순위 높은 항목을 실제로 처리할 수 있다.

Difference From This Project: NN/g 문서는 severity 평가 원칙이고, WorkAI는 기존 severity/critical 표시를 유지하면서 누락된 행동 필드를 추가한다.

Adoption Priority: Medium

Reflected Status: 기존 critical/careful 뱃지는 유지하고, 같은 카드 안에 슬라이드 라벨과 권고 수정 블록을 추가했다.

## 적용 결정

- `buildFeedbackRecommendationView`를 추가해 임의의 로컬/AI feedback item에서 표시용 title, description, suggestion, slideLabel을 만든다.
- legacy 표시가 title/description 2개 필드에 그치던 것과 달리 candidate는 title, description, suggestion, slideLabel 4개 필드를 보존한다.
- `FeedbackSidebar` recommendation 카드에 `Slide N` 라벨과 `Recommended Fix` 블록을 추가한다.
- 실제 동작이 연결되지 않은 `자동 수정 제안 적용하기` 버튼은 제거해 사용자가 작동하지 않는 명령으로 오해하지 않게 한다.
- A/B 테스트는 legacy visible field score 2 대비 candidate score 4와 `Slide 4`, 권고 수정 문자열 보존을 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/review-feedback.test.ts` 통과(1파일/3테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(35파일/94테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
