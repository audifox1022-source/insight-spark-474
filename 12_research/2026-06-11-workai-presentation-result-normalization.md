# WorkAI 발표자료 결과 정규화 리서치

작성일: 2026-06-11  
대상 제품: WorkAI AI 발표자료 생성 완료 흐름  
이번 루프 결론: AI 서비스가 배열 또는 객체 등 여러 형태의 결과를 반환할 수 있으므로, 화면/저장/내보내기에 들어가기 전에 `Presentation` 객체로 정규화하는 단일 관문이 필요하다.

## 1. 현재 제품 관찰

- `aiService.generatePresentation`은 내부에서 `normalizePresentationSlides`를 거쳐 슬라이드 배열을 반환한다.
- `usePresentation.handleGenerateFull`은 결과가 객체라고 가정하고 `...(result?.presentation || result)`를 실행했다.
- 결과가 배열이면 배열 인덱스가 객체 키 `0`, `1`처럼 섞이고, `id`와 `title`이 누락될 수 있다.
- 이 데이터는 Zustand store, 디자이너, 저장, PDF/PPTX export로 이어지므로 생성 완료 직후 무결성이 중요하다.

## 2. 외부 리서치 요약

### 2.1 구조화 출력도 스키마와 edge case 처리가 필요하다

- Source URL: https://developers.openai.com/api/docs/guides/structured-outputs
- Key Summary: OpenAI 문서는 JSON mode가 유효 JSON을 보장하더라도 edge case를 탐지하고 처리해야 하며, Structured Outputs는 스키마 일치를 강화한다고 설명한다.
- Applicability: WorkAI는 Gemini 기반이지만 AI JSON 결과가 배열/객체/중첩 객체로 달라질 수 있으므로 생성 후 스키마 관문이 필요하다.
- Difference From This Project: 모델 API의 strict schema를 바꾸는 대신, 프론트엔드 수신부에서 Presentation 객체를 안정적으로 구성한다.
- Adoption Priority: 높음.
- Reflected Status: `src/lib/presentation-result.ts`에 `buildPresentationFromResult` 추가.

### 2.2 런타임 검증은 TypeScript 외부 데이터를 안전하게 다루는 방식이다

- Source URL: https://zod.dev/
- Key Summary: Zod는 TypeScript-first validation library로, 단순 문자열부터 복잡한 객체까지 스키마를 정의해 데이터를 검증할 수 있다고 설명한다.
- Applicability: AI 응답은 컴파일 타임 타입을 신뢰할 수 없는 외부 데이터이므로 런타임 검증이 필요하다.
- Difference From This Project: 전체 슬라이드 스키마를 강제하기보다 `id`, `title`, `presentation_title`, `brandColor` 같은 presentation shell metadata만 검증한다.
- Adoption Priority: 높음.
- Reflected Status: `RawPresentationSchema.safeParse`로 presentation metadata를 검증하고, 실패 시 안전한 기본값을 사용.

### 2.3 Zod parse는 검증된 결과를 타입 안전하게 반환한다

- Source URL: https://zod.dev/basics
- Key Summary: Zod 기본 문서는 `.parse` 또는 관련 API가 입력을 검증하고 유효하면 타입 안전한 deep clone을 반환한다고 설명한다.
- Applicability: WorkAI 생성 결과도 검증된 metadata와 이미 정규화된 slides를 결합해야 한다.
- Difference From This Project: throw를 유발하는 `.parse` 대신 `.safeParse`를 써서 생성 흐름 실패보다 fallback 복구를 우선한다.
- Adoption Priority: 중간.
- Reflected Status: 배열 결과, 중첩 presentation 객체, outline-like 객체를 모두 테스트로 검증.

## 3. 제품 개선 결정

선택 기능: `Presentation Result Normalizer`

- `rawResult`가 배열이면 metadata로 spread하지 않는다.
- `rawResult.presentation`이 객체면 해당 metadata를 사용한다.
- `rawResult` 자체가 객체면 metadata 후보로 사용한다.
- `id`가 없으면 `presentation-${Date.now()}` 형태로 생성한다.
- `title`이 없으면 `title`, `presentation_title`, approved outline title, meeting info title, 기본값 순서로 fallback한다.
- 이미 정규화된 `slides` 배열은 항상 명시적으로 주입한다.

## 4. A/B 테스트 설계

- Control A: 기존 배열 spread 방식.
- Candidate B: `buildPresentationFromResult`.
- 샘플: AI 서비스가 슬라이드 배열만 반환하는 케이스.
- 평가 기준: id 존재, title 존재, slides 배열 유지, brandColor 존재, 숫자 키 `0`, `1` 미생성.
- 구현 위치: `src/lib/presentation-result.test.ts`.
- 실제 결과: candidate integrity score가 baseline보다 높고, baseline에 있던 숫자 키가 candidate에는 없음.

## 5. 후속 개선 백로그

- 슬라이드 본문과 content_data에도 Zod 기반 부분 스키마를 적용.
- 저장 히스토리에 presentation schema version을 추가.
- AI 응답 원본과 정규화 결과의 diff를 개발자 모드에서 확인할 수 있게 기록.

## 6. 이번 루프 반영 상태

- 반영됨: `src/lib/presentation-result.ts` 신규 추가.
- 반영됨: `src/hooks/usePresentation.ts`의 전체 생성 완료 단계에서 normalizer 사용.
- 반영됨: `src/lib/presentation-result.test.ts` 단위 테스트와 A/B 테스트 추가.
- 검증 완료: `npx vitest run src/lib/presentation-result.test.ts` 통과, 1개 파일 3개 테스트 성공.
- 검증 완료: `npm test` 통과, 14개 파일 46개 테스트 성공.
- 검증 완료: `npm run build` 통과. 기존과 같은 대용량 chunk 경고가 있으나 빌드 실패는 없음.
- 검증 완료: `npm run lint` 통과. 기존 11개 warning만 있으며 error는 없음.
