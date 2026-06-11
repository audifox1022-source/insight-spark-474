# WorkAI Editable Brief Department Field Research

## 연구 목적

WorkAI의 프롬프트 컨텍스트와 저장/즐겨찾기 모델은 `department`를 보존하지만, 설정 화면의 발표 브리프에는 담당 부서를 직접 확인하거나 수정하는 필드가 없었다. 조직 맥락은 발표 청중, 책임 범위, 보고 언어에 영향을 주므로 editable brief 섹션에 담당 부서 필드를 추가하는 변경을 검토했다.

## Source 1

Source URL: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/

Key Summary: NN/g는 폼 입력에서 관련 정보를 구조화하고 명확히 제공하면 사용자의 정신적 작업을 줄일 수 있다고 설명한다. 관련 필드를 그룹화하면 사용자가 입력해야 할 맥락을 더 쉽게 파악한다.

Applicability: 발표 브리프는 생성 전 핵심 맥락을 한 번에 점검하는 섹션이다. 담당 부서가 빠져 있으면 조직 맥락만 별도 recall에 의존하게 된다.

Difference From This Project: NN/g 문서는 일반 폼 원칙이고, WorkAI 변경은 기존 브리프 섹션에 누락된 조직 필드를 추가하는 좁은 UI 보강이다.

Adoption Priority: High

Reflected Status: `PresentationSetupForm`에 `담당 부서` controlled input을 추가했다.

## Source 2

Source URL: https://www.nngroup.com/articles/consistency-and-standards/

Key Summary: NN/g는 같은 시스템 안에서 일관된 개념과 패턴을 유지해야 사용자가 예측 가능한 경험을 한다고 설명한다.

Applicability: `getMeetingInfoContext`, 저장 정규화, 즐겨찾기 저장은 모두 부서를 다룬다. UI만 부서를 빠뜨리면 시스템 내부 데이터 모델과 사용자가 보는 편집 화면 사이의 일관성이 깨진다.

Difference From This Project: NN/g는 UX 일관성 원칙이고, WorkAI는 `MeetingInfo.department`의 UI 노출 누락을 해결한다.

Adoption Priority: High

Reflected Status: 브리프 렌더링 테스트의 candidate field score를 7에서 8로 높여 부서 필드까지 검증한다.

## Source 3

Source URL: https://ai.google.dev/gemini-api/docs/prompting-strategies

Key Summary: Gemini prompt design 문서는 필요한 맥락과 정보를 프롬프트에 포함해야 한다고 설명한다.

Applicability: 부서 정보는 같은 주제라도 전략기획, 영업, 재무 등 조직별 관점과 기대 언어를 바꿀 수 있는 생성 맥락이다. 프롬프트에 넣는 값이라면 UI에서 보강할 수 있어야 한다.

Difference From This Project: Gemini 문서는 모델 프롬프트 원칙이고, WorkAI 변경은 해당 프롬프트 필드의 사용자 편집 가능성을 보장한다.

Adoption Priority: Medium

Reflected Status: `담당 부서` 입력은 기존 `update('department', value)` 경로를 사용해 `MeetingInfo`와 생성 프롬프트로 이어진다.

## Source 4

Source URL: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-writing-prompts-in-microsoft-365-copilot

Key Summary: Microsoft 365 Copilot 문서는 프롬프트에 목표와 맥락을 포함하면 더 구체적인 결과를 얻을 수 있다고 설명한다.

Applicability: 부서는 발표의 내부 맥락이다. 같은 목표라도 담당 조직이 다르면 슬라이드의 책임 주체와 실행 요청이 달라진다.

Difference From This Project: Copilot 문서는 사용자가 직접 프롬프트를 쓰는 방법을 안내한다. WorkAI는 이 맥락을 UI 필드로 수집한다.

Adoption Priority: Medium

Reflected Status: editable brief 섹션에서 목표, 청중, 톤, 기간, 보고자와 함께 부서까지 확인 가능하다.

## 적용 결정

- `PresentationSetupForm`의 발표 브리프 섹션에 `담당 부서` 필드를 추가한다.
- 기존 `MeetingInfo.department`와 `update` helper를 그대로 사용해 별도 상태를 만들지 않는다.
- 컴포넌트 테스트는 브리프 field score를 8로 올리고 담당 부서 값이 렌더링되는지 확인한다.

## 검증

- Targeted test: `npx vitest run src/components/PresentationSetupForm.test.tsx` 통과.
- Type check: `npx tsc --noEmit` 통과.
- Full verification: `npm test` 통과(34파일/90테스트), `npm run build` 통과, `npm run lint` 통과(기존 11 warning, 0 errors).
