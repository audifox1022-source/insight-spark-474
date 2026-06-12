# WorkAI Outline Speaker Notes Contract Research

## 연구 목적

WorkAI는 사용자가 승인한 outline을 최종 생성 슬라이드에 다시 정렬해 제목, 레이아웃, 전략 목표를 보존한다. 그러나 outline 항목에 `speakerNotes`, `speaker_notes`, `presenter_notes`, `notes`가 포함되어도 기존 contract는 이를 최종 slide의 canonical `speakerNotes`로 승격하지 않았다. 발표자 메모는 청중에게 어떤 순서와 강조점으로 말할지 담는 실행 지시이므로, 승인한 목차 의도와 최종 장표가 분리되지 않도록 보존 방식을 검토했다.

## Source 1

Source URL: https://ai.google.dev/gemini-api/docs/structured-output

Key Summary: Gemini API 문서는 구조화 출력에서 object properties를 정의하고 required/additionalProperties 같은 제약을 둘 수 있다고 설명한다.

Applicability: WorkAI outline은 구조화 JSON이지만 생성 경로에 따라 `speakerNotes` 또는 `speaker_notes` 같은 field alias가 섞일 수 있다. 내부 contract는 이 입력을 canonical field로 정규화해야 한다.

Difference From This Project: Gemini 문서는 모델 응답 schema 제어이고, WorkAI 변경은 승인된 outline 데이터를 최종 slide model로 병합하는 앱 내부 계약이다.

Adoption Priority: High

Reflected Status: `outlineSpeakerNotes`가 `speakerNotes`, `speaker_notes`, `presenter_notes`, `notes`를 읽어 `speakerNotes`로 반영한다.

## Source 2

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 좋은 prompt가 goal, context, expectations, source 같은 구성요소를 포함할 수 있다고 설명한다.

Applicability: 발표자 메모는 슬라이드별 기대 발화, 강조 순서, 청중 대응 맥락을 담는다. outline에 포함된 이 맥락이 최종 slide에서 사라지면 생성 결과가 승인 의도와 달라진다.

Difference From This Project: Copilot 문서는 프롬프트 작성 가이드이고, WorkAI 변경은 사용자가 승인한 맥락을 생성 후 결과에 보존하는 contract다.

Adoption Priority: High

Reflected Status: 승인 outline의 speaker note alias가 최종 slide의 `speakerNotes`와 `outline_speaker_notes`에 남는다.

## Source 3

Source URL: https://www.nngroup.com/articles/consistency-and-standards/

Key Summary: NN/g는 일관성과 표준을 지키는 것이 사용자가 시스템을 이해하고 예측 가능하게 쓰는 데 중요하다고 설명한다.

Applicability: 사용자가 outline 단계에서 확인한 발표 의도와 최종 편집 화면의 slide metadata가 일관되어야 한다. 같은 의미의 필드를 다른 이름으로 잃지 않아야 한다.

Difference From This Project: NN/g 문서는 일반 UX 휴리스틱이고, WorkAI 변경은 데이터 계약의 field consistency를 강화한다.

Adoption Priority: Medium

Reflected Status: outline metadata 보존 범위가 `strategicGoal`, `speakerPersona`에서 `speakerNotes`까지 확장됐다.

## Source 4

Source URL: https://cloud.google.com/discover/what-is-prompt-engineering

Key Summary: Google Cloud는 prompt engineering이 모델에 context, instructions, examples를 제공해 원하는 응답으로 안내하는 작업이라고 설명한다.

Applicability: speaker notes는 슬라이드별 context와 instruction에 가깝다. 후속 재생성, 리뷰, 감사가 이 field를 읽을 수 있도록 최종 slide에 남겨야 한다.

Difference From This Project: Google Cloud 문서는 프롬프트 설계 설명이고, WorkAI는 생성 전후 데이터 보존 계약을 구현한다.

Adoption Priority: Medium

Reflected Status: A/B 테스트는 legacy generated slide가 outline의 `speaker_notes`를 잃지만 candidate가 canonical `speakerNotes`로 보존함을 확인한다.

## 적용 결정

- `outlineSpeakerNotes` helper를 추가해 `speakerNotes`, `speaker_notes`, `presenter_notes`, `notes` 순서로 첫 유효 문자열을 선택한다.
- 선택된 speaker notes는 최종 slide의 canonical `speakerNotes`에 반영한다.
- 추적성을 위해 `outline_speaker_notes`에도 같은 값을 남긴다.
- 기존 title/layout/strategicGoal/speakerPersona 정렬 동작은 유지한다.
- A/B 테스트는 snake_case `speaker_notes` outline이 legacy에서는 최종 slide에 없고 candidate에서는 보존되는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/lib/outline-contract.test.ts` 통과(1파일/4테스트).
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(36파일/100테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
