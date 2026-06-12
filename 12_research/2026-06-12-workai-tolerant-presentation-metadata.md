# WorkAI Tolerant Presentation Metadata Research

## 연구 목적

WorkAI는 AI가 반환한 발표자료 객체에서 `id`, `title`, `presentation_title`, `brandColor` 같은 메타데이터를 읽어 최종 `Presentation`을 만든다. 기존 구현은 이 필드들을 하나의 Zod 객체 스키마로 검증했기 때문에 `id` 하나가 숫자처럼 잘못 오면 전체 파싱이 실패하고, 유효한 `title`과 추가 메타데이터까지 버릴 수 있었다. 생성형 AI 응답은 부분적으로 흔들릴 수 있으므로 필드별로 안전하게 정규화하는 방식을 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/structured-output

Key Summary: Gemini API 문서는 구조화 출력이 JSON Schema를 따르는 예측 가능하고 type-safe한 결과를 만들며, 비정형 텍스트에서 구조 데이터를 추출하는 데 적합하다고 설명한다. JavaScript 예시에서도 Zod 기반 스키마를 사용한다.

Applicability: WorkAI는 Gemini 계열 응답을 받아 발표자료 객체로 변환한다. 구조화 출력은 목표지만, 앱 경계에서는 실제 런타임 값이 필드별 기대 타입을 만족하는지 방어해야 한다.

Difference From This Project: Gemini 문서는 모델 출력 제어 방법이고, WorkAI 변경은 이미 받은 응답을 `Presentation` 타입으로 수용하는 후처리 로직이다.

Adoption Priority: High

Reflected Status: `buildPresentationFromResult`는 전체 객체 parse 성공 여부 대신 `id`, `title`, `presentation_title`, `brandColor`를 필드별 문자열로 정규화한다.

## Source 2

Source URL: https://zod.dev/basics

Key Summary: Zod는 `.safeParse()`가 성공 시 data, 실패 시 ZodError를 담은 결과 객체를 반환한다고 설명한다. 실패 결과에서는 성공적으로 맞은 일부 필드의 data를 그대로 받는 구조가 아니다.

Applicability: 기존 WorkAI 구현은 safeParse 실패 시 `{}`로 대체했다. 이 방식은 잘못된 단일 필드 때문에 유효한 제목과 owner 같은 passthrough 메타데이터까지 잃게 만든다.

Difference From This Project: Zod 문서는 범용 검증 도구 설명이고, WorkAI는 사용자 덱을 살리기 위해 부분 유효 메타데이터를 필드별로 보존한다.

Adoption Priority: High

Reflected Status: `zod` 의존 파싱을 제거하고 `getStringField` helper로 문자열 필드만 안전하게 채택한다.

## Source 3

Source URL: https://tour.json-schema.org/content/03-Objects/02-Additional-Properties

Key Summary: JSON Schema의 `additionalProperties`는 스키마에 정의되지 않은 추가 속성을 어떻게 다룰지 제어한다. 기본적으로 추가 속성은 허용할 수 있고, 별도 제약을 둘 수도 있다.

Applicability: WorkAI 발표자료에는 `owner`, `department`, 기타 생성 메타데이터가 붙을 수 있다. 핵심 필드 타입 하나가 틀렸다고 추가 속성까지 버리면 저장/표시 맥락이 줄어든다.

Difference From This Project: JSON Schema 문서는 스키마 설계 원칙이고, WorkAI는 추가 메타데이터를 보존하되 핵심 문자열 필드는 안전하게 덮어쓴다.

Adoption Priority: Medium

Reflected Status: 반환 객체는 기존처럼 `...source`를 보존하면서 `id`, `title`, `slides`, `brandColor`만 정규화된 값으로 대체한다.

## Source 4

Source URL: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output

Key Summary: Google Cloud 문서는 response schema로 출력 형식을 설명할 수 있고, required를 지정하지 않으면 필드가 선택적으로 생성될 수 있다고 설명한다. nullable 예시처럼 일부 필드는 null 또는 누락될 수 있다.

Applicability: WorkAI가 받는 AI 응답도 필드 누락이나 부분 타입 불일치에 대비해야 한다. 최종 덱 생성은 슬라이드가 유효하면 가능한 많은 메타데이터를 살리는 쪽이 사용자에게 안전하다.

Difference From This Project: Google Cloud 문서는 생성 요청의 schema 설정이고, WorkAI 변경은 응답 수신 후 presentation metadata hydration을 견고하게 만드는 것이다.

Adoption Priority: Medium

Reflected Status: 숫자 `id`는 문자열 fallback id로 대체하지만, 같은 객체의 유효한 `title`과 `owner`는 보존한다.

## 적용 결정

- `buildPresentationFromResult`에서 객체 전체 Zod safeParse를 제거한다.
- `getStringField`로 `id`, `title`, `presentation_title`, `brandColor`를 개별 문자열 필드로 정규화한다.
- `id`가 문자열이 아니면 `presentation-${idSeed || Date.now()}` fallback을 사용한다.
- `title`은 유효한 `title`, `presentation_title`, fallbackTitle, `발표자료` 순서로 결정한다.
- 원본 source의 추가 메타데이터는 유지하되, 정규화된 `id`, `title`, `slides`, `brandColor`로 덮어쓴다.
- A/B 테스트는 숫자 id가 포함된 AI 응답에서 legacy strict metadata path는 fallback title로 떨어지고 owner를 잃지만, candidate는 fallback id를 쓰면서 유효한 title과 owner를 보존하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/presentation-result.test.ts` 통과(1파일/4테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(35파일/95테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
