# WorkAI UTF-8 Truncation Artifact Cleanup Research

## 연구 목적

WorkAI는 업로드 문서와 데이터 파일을 AI 프롬프트에 넣기 전에 `MAX_FILE_BYTES` 기준으로 바이트 단위 잘라내기를 수행한다. 기존 구현은 UTF-8 멀티바이트 문자의 중간에서 잘릴 때 `TextDecoder`가 붙이는 U+FFFD 치환 문자를 그대로 반환할 수 있었다. 이 문자가 프롬프트 끝에 남으면 깨진 텍스트가 모델 입력에 섞이므로, 잘림 경계의 디코딩 아티팩트 제거를 검토했다.

## Source 1

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/fatal

Key Summary: MDN은 `TextDecoder.fatal`이 false일 때 malformed data를 U+FFFD replacement character로 대체한다고 설명한다.

Applicability: WorkAI의 `TextDecoder("utf-8", { fatal: false })`는 파일 바이트를 임의 길이로 자른 뒤 디코딩한다. 자른 위치가 멀티바이트 문자 중간이면 끝에 U+FFFD가 생길 수 있다.

Difference From This Project: MDN 문서는 Web API 동작 설명이고, WorkAI 변경은 프롬프트 입력 정리 함수에서 trailing replacement artifact만 제거하는 좁은 후처리다.

Adoption Priority: High

Reflected Status: `TRAILING_DECODE_ARTIFACT_PATTERN`을 추가해 byte truncation 뒤 문자열 끝의 `\uFFFD`를 제거한다.

## Source 2

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder

Key Summary: MDN은 `TextDecoder()`의 기본 encoding이 UTF-8이며, `fatal` 옵션의 기본값 false는 malformed data를 replacement character로 대체한다고 설명한다.

Applicability: WorkAI는 기본 UTF-8 텍스트 처리에 의존한다. 정상적인 본문 내부 문자를 수정할 필요는 없지만, 잘림 경계에서 생긴 끝부분 치환 문자는 입력 품질을 떨어뜨린다.

Difference From This Project: MDN 문서는 생성자 옵션 설명이고, WorkAI는 이미 사용 중인 decoder의 결과를 프롬프트 친화적으로 정리한다.

Adoption Priority: High

Reflected Status: 기존 `\\u`, `\\x`, trailing backslash 제거 로직 앞에 trailing U+FFFD 제거를 추가했다.

## Source 3

Source URL: https://encoding.spec.whatwg.org/

Key Summary: WHATWG Encoding Standard는 UTF-8 decode가 replacement error mode를 사용할 수 있고, UTF-8 decoder가 필요한 바이트를 다 보지 못한 상태로 end-of-queue를 만나면 error를 반환한다고 설명한다.

Applicability: 파일 바이트를 고정 크기로 자르면 decoder 입장에서는 end-of-queue가 문자 중간에서 온 것처럼 보일 수 있다. 이때 생기는 replacement는 원본 의미가 아니라 truncation side effect다.

Difference From This Project: WHATWG 문서는 표준 알고리즘이고, WorkAI는 모델 프롬프트에 넘기기 전 사용자 입력을 깨끗하게 유지하는 애플리케이션 레벨 처리다.

Adoption Priority: Medium

Reflected Status: A/B 테스트는 `MAX_FILE_BYTES - 1` ASCII 뒤 emoji를 붙여 멀티바이트 경계 절단을 재현한다.

## Source 4

Source URL: https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder

Key Summary: MDN은 `TextDecoder`가 byte array를 JavaScript string으로 디코딩하는 인터페이스라고 설명한다.

Applicability: WorkAI의 `truncateFileData`는 byte length 제한과 string prompt 사이의 변환 지점이다. 이 지점에서 깨진 경계 문자를 제거해야 downstream outline/generation prompt 품질이 안정적이다.

Difference From This Project: MDN 문서는 API 개요이고, WorkAI 변경은 파일 입력 관문에서만 적용되는 품질 보정이다.

Adoption Priority: Medium

Reflected Status: candidate output은 U+FFFD를 포함하지 않으면서 encoded byte length가 `MAX_FILE_BYTES` 이하임을 테스트한다.

## 적용 결정

- `truncateFileData`가 `MAX_FILE_BYTES` 이하 입력은 기존처럼 원문 그대로 반환한다.
- 바이트 절단이 발생한 경우에만 디코딩된 문자열의 trailing U+FFFD를 제거한다.
- 기존 trailing `\\u`, `\\x`, `\\` cleanup은 유지한다.
- 정상 본문 내부의 replacement character까지 전역 제거하지 않고 끝부분 아티팩트만 제거한다.
- A/B 테스트는 legacy truncation이 U+FFFD로 끝나는 반면 candidate는 U+FFFD를 포함하지 않고 byte limit을 유지하는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/services/ai/utils.test.ts` 통과(1파일/1테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(36파일/96테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
