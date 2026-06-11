# WorkAI Preset Metadata Hydration Research

## 연구 목적

WorkAI의 AI 주제 프리셋은 사용자가 제품명, 대상, 목표 같은 구조화된 값을 입력하게 하지만, 다음 단계로 넘길 때는 생성된 문장을 `notes`에만 저장했다. 이 때문에 `Insight Brief`, 프롬프트 컨텍스트, 즐겨찾기 저장이 활용할 수 있는 발표 제목, 목표, 청중, 톤 필드가 비어 있었다. 프리셋 데이터를 `MeetingInfo` 메타데이터로 함께 채우는 변경을 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/prompting-strategies

Key Summary: Gemini API prompt design 문서는 명확하고 구체적인 지시가 모델 동작을 맞춤화하는 효율적인 방법이며, 모델이 필요한 정보를 모두 알고 있다고 가정하지 말고 문제 해결에 필요한 맥락을 프롬프트에 포함하라고 설명한다.

Applicability: WorkAI 프리셋은 이미 주제, 목표, 대상 같은 핵심 맥락을 구조화해 받는다. 이를 `notes` 한 문장으로만 넘기면 모델이 각 맥락의 역할을 구분하기 어렵다.

Difference From This Project: Gemini 문서는 prompt 작성 일반 원칙이다. WorkAI는 UI 프리셋에서 얻은 값을 내부 `MeetingInfo` 구조로 보존하는 제품 로직에 적용했다.

Adoption Priority: High

Reflected Status: `buildPresetMeetingInfoPatch`가 프리셋별 입력을 `title`, `objective`, `audience`, `tone`, `notes`로 분해해 반환한다.

## Source 2

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 좋은 프롬프트가 목표, 맥락, 기대사항, 출처를 포함할 수 있고, 예시에서 청중과 톤을 명시하면 더 구체적인 산출물을 얻을 수 있음을 보여준다.

Applicability: WorkAI 프리셋의 `target`, `audience`, `vibe`, `goal` 필드는 각각 청중, 톤, 목표에 해당한다. 이 값을 별도 필드로 보존하면 이후 생성 단계의 prompt context 품질이 좋아진다.

Difference From This Project: Copilot 문서는 사용자에게 직접 프롬프트를 잘 쓰는 법을 설명한다. WorkAI는 사용자가 프리셋만 채워도 제품이 자동으로 좋은 프롬프트 구성요소를 만들어야 한다.

Adoption Priority: High

Reflected Status: 신제품, 제안서, 시장 조사, 프로젝트, 행사 프리셋에서 청중/목표/톤을 가능한 범위에서 구조화했다.

## Source 3

Source URL: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/

Key Summary: NN/g는 폼 입력이 정신적 작업이며, 관련 필드를 구조화하고 적절한 지원을 제공하면 사용자가 더 적은 노력으로 완료할 수 있다고 설명한다.

Applicability: 사용자가 프리셋에서 이미 입력한 값을 설정 단계에서 다시 제목, 목표, 청중으로 입력하게 만들면 중복 작업과 인지부하가 생긴다. 프리셋 입력을 자동으로 메타데이터에 반영하는 편이 더 자연스럽다.

Difference From This Project: NN/g 문서는 폼 디자인 원칙을 설명하고, WorkAI 변경은 UI 레이아웃보다 프리셋 전환 로직을 개선한다.

Adoption Priority: Medium

Reflected Status: 프리셋 CTA에서 `setInfo` 호출 시 `notes`뿐 아니라 구조화된 metadata patch를 함께 병합하도록 했다.

## Source 4

Source URL: https://www.nngroup.com/articles/recognition-and-recall/

Key Summary: NN/g는 recognition이 recall보다 쉽고, 더 풍부한 맥락이 사용자가 정보와 작업을 다시 떠올리는 데 도움을 준다고 설명한다.

Applicability: 프리셋 단계에서 사용자가 제공한 구조화 정보를 다음 단계의 품질 게이트와 저장 기능에서 그대로 볼 수 있어야 한다. 그렇지 않으면 사용자는 같은 의도를 다시 기억해 입력해야 한다.

Difference From This Project: 해당 리서치는 일반 UX 원칙이다. WorkAI에서는 프리셋 입력값이 `MeetingInfo` 필드로 보존되는지를 A/B 테스트로 검증했다.

Adoption Priority: Medium

Reflected Status: `src/components/presentation-preset-metadata.test.ts`에서 legacy notes-only score 1 대비 candidate score 4를 확인한다.

## 적용 결정

- 프리셋 메타데이터 매핑을 UI 컴포넌트 내부 로직이 아니라 순수 helper로 분리한다.
- `newproduct`, `report`, `proposal`, `market`, `project`, `event`, `manual` 프리셋을 각각 가능한 `MeetingInfo` 필드로 매핑한다.
- 수동 입력은 첫 번째 유효 줄을 bounded title fallback으로 사용한다.
- 기존 생성 문장은 `notes`에 계속 보존해 사용자가 입력한 전체 맥락을 잃지 않는다.
- 프리셋 CTA는 `setInfo({ ...info, ...patch })` 한 번으로 설정 단계에 구조화된 컨텍스트를 전달한다.

## 검증

- Targeted test: `npx vitest run src/components/presentation-preset-metadata.test.ts` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(31파일/83테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
