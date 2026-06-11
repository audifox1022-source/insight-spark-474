# WorkAI Brief Context Generation Prompts Research

## 연구 목적

WorkAI는 설정 화면과 프리셋에서 구조화된 `MeetingInfo`를 만들 수 있게 되었지만, 실제 plan/outline 생성 문자열은 여전히 `주제/목표/참고` 또는 `notes` 중심으로 구성되어 있었다. 생성 요청 자체에 발표 제목, 목표, 청중, 톤, 기간, 부서, 보고자, 참고사항을 같은 형식으로 전달하도록 개선하는 변경을 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/prompting-strategies

Key Summary: Gemini API의 prompt design strategies는 모델이 필요한 정보를 알고 있다고 가정하지 말고, 문제 해결에 필요한 맥락과 정보를 프롬프트에 포함하라고 설명한다. 또한 명확하고 구체적인 지시가 모델 동작을 맞춤화하는 효율적인 방법이라고 정리한다.

Applicability: WorkAI의 plan/outline 생성은 Gemini 기반 서비스 호출로 이어진다. UI와 저장소에만 메타데이터가 있고 실제 프롬프트 문자열에 없으면 모델이 청중과 톤을 반영하기 어렵다.

Difference From This Project: Gemini 문서는 일반 prompt design 가이드다. WorkAI에는 이를 plan/outline 요청 문자열의 공통 브리프 섹션으로 적용했다.

Adoption Priority: High

Reflected Status: `buildPresentationBriefPromptContext`를 추가해 `getMeetingInfoContext` 출력을 `[발표 브리프]` 섹션으로 감싼다.

## Source 2

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 프롬프트가 목표, 맥락, 기대사항, 출처로 구성될 수 있으며, 청중과 톤을 명시한 예시를 보여준다.

Applicability: WorkAI의 발표 브리프 필드는 목표, 청중, 톤, 참고자료를 그대로 담고 있다. 이 구조를 생성 프롬프트에 반영해야 사용자가 입력한 의도가 모델 응답에 직접 영향을 준다.

Difference From This Project: Copilot 문서는 사용자가 직접 프롬프트를 작성하는 상황이다. WorkAI는 제품이 내부적으로 prompt context를 조립하므로, 사용자의 필드 입력을 자동으로 좋은 프롬프트 구조로 변환해야 한다.

Adoption Priority: High

Reflected Status: `handleGenerateOutline`의 plan 생성 문자열과 outline용 `integratedText`가 공통 브리프 컨텍스트를 사용하도록 연결했다.

## Source 3

Source URL: https://cloud.google.com/discover/what-is-prompt-engineering

Key Summary: Google Cloud는 프롬프트가 모델에 맥락, 지시, 예시를 제공해 의도를 이해하고 의미 있는 응답을 만들게 한다고 설명한다. 관련 맥락과 예시를 제공하면 더 정확하고 관련성 높은 출력에 도움이 된다고 정리한다.

Applicability: 발표 제목, 목표, 청중, 톤, 기간은 모델이 슬라이드 구조와 메시지 밀도를 정하는 맥락이다. notes만 넣는 방식은 관련성 있는 출력을 만들기에는 정보가 불완전하다.

Difference From This Project: Google Cloud 문서는 개념적 안내고, WorkAI 변경은 실제 hook 코드에서 생성 요청 문자열을 바꾼다.

Adoption Priority: Medium

Reflected Status: `src/lib/presentation-prompt-context.test.ts`에서 legacy context score 4 미만 대비 candidate score 9를 확인한다.

## Source 4

Source URL: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering

Key Summary: Microsoft Learn은 프롬프트를 지시, 주요 콘텐츠, 예시, 단서 등 구성 요소로 나누어 생각할 수 있다고 설명하고, 복잡한 지시에는 회사명, 이전 회의, 톤 같은 구체 맥락을 포함한 예시를 제시한다.

Applicability: WorkAI의 생성 요청도 단일 notes 문자열보다 라벨이 있는 브리프 섹션을 제공하는 편이 모델이 정보를 더 명확히 구분하게 한다.

Difference From This Project: 해당 문서는 Azure OpenAI/GPT 예시지만, WorkAI의 Gemini 호출에도 prompt construction 원칙은 적용 가능하다.

Adoption Priority: Medium

Reflected Status: plan 생성과 outline 생성 모두 `[발표 브리프]` 라벨 섹션을 공유하게 했다.

## 적용 결정

- `src/lib/presentation-prompt-context.ts`에 공통 브리프 프롬프트 helper를 추가한다.
- 명시적 제목이 없으면 `자동 생성` fallback을 사용해 title context가 빠지지 않게 한다.
- `handleGenerateOutline`의 plan 생성 요청을 기존 `주제/목표/참고` 문자열에서 공통 브리프 컨텍스트로 교체한다.
- outline 생성용 `integratedText`도 `notes`만이 아니라 공통 브리프 컨텍스트로 시작하게 한다.
- A/B 테스트는 legacy request context 대비 candidate가 브리프 라벨과 8개 메타데이터 라벨을 모두 포함하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/presentation-prompt-context.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(33파일/87테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
