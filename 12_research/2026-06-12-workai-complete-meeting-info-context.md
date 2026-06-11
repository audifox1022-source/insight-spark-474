# WorkAI Complete Meeting Info Context Research

## 연구 목적

발표 생성 프롬프트에 회의/발표 메타데이터를 전달할 때 제목, 목표, 청중, 톤이 누락되면 모델이 사용자의 의도를 일반적인 발표 주제로 해석할 수 있다. `getMeetingInfoContext`를 보강해 핵심 메타데이터를 안정적으로 포함하고, 기존 오타인 `참구사항`을 `참고사항`으로 수정하는 변경을 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/prompting-strategies

Key Summary: Gemini API의 prompt design strategies 문서는 명확하고 구체적인 지시가 모델 동작을 맞춤화하는 효율적인 방법이라고 설명한다. 또한 모델이 필요한 정보를 모두 알고 있다고 가정하지 말고 문제 해결에 필요한 맥락과 정보를 프롬프트에 포함하라고 권장한다.

Applicability: WorkAI는 Gemini 기반 발표 생성 경로를 사용한다. 발표 제목, 목표, 청중, 톤은 모델이 슬라이드 내용을 어느 관점에서 구성할지 정하는 핵심 맥락이므로 프롬프트 helper에서 누락되면 안 된다.

Difference From This Project: Gemini 문서는 일반적인 prompt design 전략을 다루며, WorkAI는 발표자료 생성이라는 좁은 도메인이다. 따라서 일반 원칙을 발표 메타데이터 필드 보존으로 변환했다.

Adoption Priority: High

Reflected Status: `getMeetingInfoContext`가 제목, 목표, 핵심 청중, 톤, 주차/기간, 부서, 보고자, 참고사항을 구조화된 줄 단위 컨텍스트로 반환하도록 수정했다.

## Source 2

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 프롬프트가 목표, 맥락, 기대사항, 출처를 포함할 수 있다고 설명한다. 예시에서도 청중과 문서 톤을 명시하면 더 구체적인 결과를 얻을 수 있음을 보여준다.

Applicability: WorkAI의 발표자료 생성 입력도 목표, 청중, 톤, 참고 자료가 함께 전달될수록 사용자의 발표 목적에 맞는 산출물이 나온다. 특히 임원 보고체와 실무 보고체는 슬라이드 제목과 본문 밀도에 직접 영향을 준다.

Difference From This Project: Copilot 문서는 Microsoft 365 사용자 프롬프트 작성 가이드다. WorkAI는 코드 내부 helper가 프롬프트 컨텍스트를 자동 조립하므로, 사용자 작성법 대신 제품 내부 필드 매핑 기준으로 적용했다.

Adoption Priority: High

Reflected Status: 누락되던 `objective`, `audience`, `tone`을 helper 출력에 추가하고, 오타 라벨을 `참고사항`으로 정정했다.

## Source 3

Source URL: https://cloud.google.com/discover/what-is-prompt-engineering

Key Summary: Google Cloud의 prompt engineering 설명은 모델에 맥락, 지시, 예시를 제공하면 의도를 이해하고 의미 있는 응답을 생성하는 데 도움이 된다고 설명한다. 또한 문맥과 관련 예시가 더 정확하고 관련성 높은 출력을 돕는다고 정리한다.

Applicability: 발표 생성에서 제목과 목표는 의도, 청중과 톤은 응답 스타일, 참고사항은 세부 제약과 근거로 작동한다. 이 필드를 빠뜨리지 않는 것이 관련성 높은 덱 생성에 직접 연결된다.

Difference From This Project: Google Cloud 문서는 개념 설명에 가깝고 제품 코드 변경 지침은 아니다. WorkAI에는 이를 정량적인 metadata completeness A/B 테스트로 바꾸어 적용했다.

Adoption Priority: Medium

Reflected Status: `src/services/ai/prompts.test.ts`에 legacy context 대비 candidate context가 더 많은 핵심 메타데이터를 보존하는지 확인하는 테스트를 추가했다.

## Source 4

Source URL: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering

Key Summary: Microsoft Learn의 prompt engineering 문서는 프롬프트 구성 요소를 지시, 주요 콘텐츠, 예시, 단서 등으로 나누어 생각할 수 있다고 설명하고, 더 복잡한 지시에서는 회사명, 지난 회의, 톤 같은 세부 맥락을 포함한 예시를 제시한다.

Applicability: WorkAI의 레거시 생성 경로도 `[참고 정보]` 섹션을 이미 사용하고 있으므로, JSON 문자열보다 일관된 라벨 기반 컨텍스트를 제공하면 모델이 핵심 정보를 더 쉽게 구분할 수 있다.

Difference From This Project: 해당 문서는 Azure OpenAI/GPT 모델 중심이다. WorkAI는 Gemini 경로를 주로 쓰지만 LLM 프롬프트 구성 원칙은 동일하게 적용할 수 있다.

Adoption Priority: Medium

Reflected Status: `src/lib/ai-service.ts`의 레거시 생성 prompt가 `JSON.stringify(meetingInfo)` 대신 `getMeetingInfoContext`를 사용하도록 연결했다.

## 적용 결정

- `getMeetingInfoContext`의 입력 타입을 `Partial<MeetingInfo> | null | undefined`로 명확히 한다.
- 기존 `week`, `department`, `reporter`, `notes` 외에 `title`, `objective`, `audience`, `tone`을 포함한다.
- `참구사항` 오타를 `참고사항`으로 수정한다.
- 빈 값은 출력하지 않아 프롬프트 잡음을 줄인다.
- 레거시 `src/lib/ai-service.ts` 경로도 동일 helper를 사용해 참고 정보 형식을 통일한다.

## 검증

- Targeted test: `npx vitest run src/services/ai/prompts.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(29파일/78테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
