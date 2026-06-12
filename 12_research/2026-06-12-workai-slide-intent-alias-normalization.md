# WorkAI Slide Intent Alias Normalization Research

## 연구 목적

WorkAI의 후속 품질 감사와 리뷰 로직은 슬라이드의 `strategicGoal`과 `speakerNotes`를 읽어 발표 의도와 행동 신호를 판단한다. 그러나 AI 응답은 `strategic_goal`, `goal`, `objective`, `speaker_notes`처럼 다른 필드명으로 같은 의미를 반환할 수 있다. 기존 normalizer는 원본 필드는 남기지만 canonical 필드로 승격하지 않아 downstream 감사가 발표 의도를 놓칠 수 있으므로 alias 정규화를 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/structured-output

Key Summary: Gemini API 문서는 구조화 출력이 제공된 JSON Schema를 따르는 예측 가능하고 type-safe한 결과를 만들도록 돕는다고 설명한다.

Applicability: WorkAI도 모델에 `strategicGoal`을 요청하지만, 실제 생성 응답은 모델/프롬프트/레거시 경로에 따라 snake_case나 일반 goal 필드를 포함할 수 있다. 앱 경계에서 canonical field를 보장해야 후속 로직이 안정적이다.

Difference From This Project: Gemini 문서는 응답 생성 제어 방법이고, WorkAI 변경은 이미 수신한 slide object를 렌더러와 감사 로직이 읽는 형태로 정규화한다.

Adoption Priority: High

Reflected Status: `normalizePresentationSlide`가 `strategic_goal`, `goal`, `objective`, `intent`를 `strategicGoal`로 승격한다.

## Source 2

Source URL: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output

Key Summary: Google Cloud 문서는 response schema로 출력 형식을 지정할 수 있고, required를 지정하지 않으면 필드가 선택적으로 생성될 수 있다고 설명한다.

Applicability: WorkAI의 슬라이드 의도 필드는 사용자가 승인한 목차와 품질 감사에 중요하지만 항상 동일한 이름으로 오리라는 보장은 약하다. 선택적/변형 필드를 canonical로 흡수하는 후처리가 필요하다.

Difference From This Project: Google Cloud 문서는 스키마 기반 생성 설정이고, WorkAI 변경은 schema drift가 발생해도 생성 결과를 제품 내부 계약에 맞춘다.

Adoption Priority: High

Reflected Status: `speaker_notes`, `presenter_notes`, `notes`를 `speakerNotes`로 정규화한다.

## Source 3

Source URL: https://tour.json-schema.org/content/03-Objects/02-Additional-Properties

Key Summary: JSON Schema는 정의되지 않은 추가 속성의 처리 방식을 `additionalProperties`로 제어할 수 있다고 설명한다. 기본적으로 추가 속성을 허용하거나 별도 제약을 줄 수 있다.

Applicability: AI 응답의 alias 필드는 버릴 데이터가 아니라 같은 의미의 추가 속성이다. 원본을 보존하면서 canonical 필드를 추가하면 정보 손실 없이 내부 계약을 강화할 수 있다.

Difference From This Project: JSON Schema 문서는 스키마 설계 원칙이고, WorkAI는 추가 속성을 그대로 보존하면서 후속 로직용 필드를 보강한다.

Adoption Priority: Medium

Reflected Status: 반환 slide는 `...rawSlide`를 유지하면서 `strategicGoal`과 `speakerNotes`만 canonical 값으로 추가/덮어쓴다.

## Source 4

Source URL: https://zod.dev/basics

Key Summary: Zod 문서는 입력을 스키마로 검증하고 실패 시 에러 정보를 제공하는 방식을 설명한다. 런타임 데이터는 명시적 검증/정규화를 거쳐 사용해야 한다.

Applicability: WorkAI normalizer는 AI의 유연한 입력을 내부 타입으로 바꾸는 검증 경계다. 단순 passthrough가 아니라 의미 있는 alias를 명시적으로 정규화해야 downstream 타입 가정이 맞다.

Difference From This Project: Zod 문서는 범용 데이터 검증이고, WorkAI 변경은 가벼운 문자열 field normalization이다.

Adoption Priority: Medium

Reflected Status: A/B 테스트는 legacy canonical intent score 0 대비 candidate가 `strategicGoal`과 `speakerNotes`를 모두 채우는지 확인한다.

## 적용 결정

- `normalizePresentationSlide`에서 `strategicGoal`, `strategic_goal`, `goal`, `objective`, `intent` 순서로 첫 유효 문자열을 선택한다.
- `speakerNotes`, `speaker_notes`, `presenter_notes`, `notes` 순서로 첫 유효 문자열을 선택한다.
- 선택된 값은 기존 raw slide를 유지한 상태에서 canonical `strategicGoal`, `speakerNotes` 필드로 추가한다.
- content normalization, citation normalization, layout normalization에는 영향을 주지 않는다.
- A/B 테스트는 snake_case AI 응답에서 legacy canonical field score가 0이고 candidate가 두 canonical field를 모두 보존하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/presentation-normalizer.test.ts` 통과(1파일/6테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(36파일/97테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
