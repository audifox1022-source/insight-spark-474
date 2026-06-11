# WorkAI Editable Brief Fields Research

## 연구 목적

WorkAI 설정 단계에는 `MeetingInfo`의 제목, 목표, 청중, 톤, 기간, 보고자, 참고사항을 직접 확인하거나 수정하는 입력 영역이 없었다. 이전 루프에서 프롬프트와 저장 로직은 구조화 메타데이터를 지원하게 되었지만, 파일 업로드나 수동 입력 흐름에서는 사용자가 이를 보강할 UI가 부족했다. 설정 화면에 편집 가능한 발표 브리프 필드를 추가하는 변경을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/

Key Summary: NN/g는 폼 입력이 사용자가 질문을 해석하고 정보를 찾고 형식을 판단해야 하는 정신적 작업이라고 설명한다. 구조, 투명성, 명확성, 지원을 통해 폼의 인지부하를 줄일 수 있으며, 관련 필드를 함께 묶으면 사용자가 전체 맥락을 더 쉽게 이해한다.

Applicability: WorkAI 발표 설정은 긴 생성 전 단계다. 제목, 목표, 청중, 톤, 참고사항을 한 섹션에 모으면 사용자가 AI 생성 맥락을 한 번에 점검하고 빠진 정보를 채울 수 있다.

Difference From This Project: NN/g 문서는 일반 폼 디자인 원칙을 다룬다. WorkAI는 레이아웃 전면 개편이 아니라 기존 설정 화면의 상단에 핵심 브리프 필드를 추가했다.

Adoption Priority: High

Reflected Status: `PresentationSetupForm` 상단에 `0. 발표 브리프` 섹션을 추가하고 관련 필드를 라벨이 있는 controlled input/textarea로 노출했다.

## Source 2

Source URL: https://www.nngroup.com/articles/recognition-and-recall/

Key Summary: NN/g는 recognition이 recall보다 쉽고, 풍부한 맥락이 사용자가 정보와 작업을 떠올리는 데 도움을 준다고 설명한다. recognition 기반 UI는 사용자가 기억해야 할 부담을 줄인다.

Applicability: 프리셋이나 저장 템플릿이 채운 메타데이터를 화면에 보여주면 사용자는 보이지 않는 내부 상태를 기억하지 않아도 된다. 파일 업로드 사용자는 빈 필드를 보고 어떤 맥락이 부족한지도 인식할 수 있다.

Difference From This Project: 해당 원칙은 범용 UX 원칙이다. WorkAI에서는 브리프 필드 노출 여부를 컴포넌트 렌더링 테스트와 A/B field score로 확인했다.

Adoption Priority: High

Reflected Status: `src/components/PresentationSetupForm.test.tsx`에서 legacy field score 0 대비 candidate score 7을 확인한다.

## Source 3

Source URL: https://ai.google.dev/gemini-api/docs/prompting-strategies

Key Summary: Gemini API prompt design 문서는 문제 해결에 필요한 맥락과 정보를 프롬프트에 포함해야 하며, 명확하고 구체적인 지시가 모델 동작을 맞춤화한다고 설명한다.

Applicability: 설정 화면에서 사용자가 목표, 청중, 톤, 참고사항을 직접 보강할 수 있어야 생성 프롬프트와 `Insight Brief`가 더 정확한 맥락을 받는다.

Difference From This Project: Gemini 문서는 모델 프롬프트 지침이고, WorkAI 변경은 그 프롬프트에 들어갈 구조화 정보를 입력받는 UI다.

Adoption Priority: High

Reflected Status: 브리프 입력값은 기존 `update` helper를 통해 `MeetingInfo`에 반영되고, 이후 `Insight Brief`, outline, full generation, 저장/즐겨찾기 경로에서 사용된다.

## Source 4

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 프롬프트가 목표, 맥락, 기대사항, 출처를 포함할 수 있고, 청중과 톤을 명시한 예시를 통해 더 구체적인 산출물을 얻는 방식을 보여준다.

Applicability: WorkAI의 발표 브리프는 사용자가 목표, 청중, 톤, 참고사항을 생성 전 명시하는 곳이다. 이는 Copilot식 prompt 구성요소를 제품 UI의 입력 필드로 전환한 것이다.

Difference From This Project: Copilot 문서는 사용자가 직접 프롬프트를 쓰는 방법을 설명한다. WorkAI는 일반 사용자도 필드 입력만으로 같은 구조를 만들 수 있게 한다.

Adoption Priority: Medium

Reflected Status: `목표/결정 요청`, `핵심 청중`, `발표 어조`, `참고사항/원문 요청` 필드를 추가했다.

## 적용 결정

- 설정 화면 최상단에 발표 브리프 섹션을 추가한다.
- `title`, `objective`, `audience`, `tone`, `week`, `reporter`, `notes`를 라벨이 있는 controlled fields로 노출한다.
- 기존 `update` helper를 재사용해 변경 범위를 컴포넌트 내부 상태 연결에 한정한다.
- A/B 테스트는 기존 화면이 브리프 필드를 노출하지 않는 baseline score 0 대비 후보 화면이 7개 필드를 노출하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/components/PresentationSetupForm.test.tsx` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(32파일/85테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
