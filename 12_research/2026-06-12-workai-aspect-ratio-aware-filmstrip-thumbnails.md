# WorkAI Aspect Ratio Aware Filmstrip Thumbnails 리서치

작성일: 2026-06-12
대상 제품: WorkAI 디자이너 하단 필름스트립, 16:9/4:3 비율 preview, 슬라이드 탐색
이번 루프 결론: 저장/내보내기 경로는 deck aspect ratio를 보존하도록 개선되었지만, 디자이너 하단 필름스트립 썸네일 프레임은 여전히 `w-64 h-[144px]`로 16:9에 고정되어 있었다. 4:3 덱에서는 실제 축소 렌더링이 960x720인데 바깥 프레임은 256x144라 preview shape가 다르게 보인다. 탐색용 thumbnail도 현재 deck ratio를 따라야 사용자가 4:3 레이아웃의 실제 구도를 빠르게 판단할 수 있다.

## 1. 현재 제품 관찰

- 메인 편집 canvas는 `store.aspectRatio === '4:3'`일 때 `aspect-[4/3]`과 960x720 기준을 사용한다.
- 하단 필름스트립 내부 렌더링도 4:3일 때 `w-[960px] h-[720px] scale-[0.2]`를 사용한다.
- 그러나 바깥 thumbnail button은 항상 `w-64 h-[144px]`이어서 16:9 프레임으로 고정되어 있었다.
- 결과적으로 4:3 덱의 썸네일은 실제 slide shape와 다른 빈 공간/크롭 인상을 줄 수 있었다.

## 2. 외부 리서치 요약

### 2.1 PowerPoint slide size는 16:9/4:3 같은 deck-level shape를 직접 바꾼다

- Source URL: https://support.microsoft.com/en-us/office/change-the-page-layout-49030c0f-9cd9-4f92-a894-605bc0671d10
- Key Summary: Microsoft Support는 PowerPoint의 Slide Size에서 원하는 크기를 선택하거나 width/height를 지정할 수 있다고 설명한다.
- Applicability: WorkAI가 4:3 deck을 지원한다면 main canvas뿐 아니라 slide navigation thumbnail도 같은 deck shape를 반영해야 한다.
- Difference From This Project: 기존 필름스트립은 deck-level slide size와 관계없이 16:9 프레임을 유지했다.
- Adoption Priority: 높음.
- Reflected Status: 4:3일 때 thumbnail frame class를 `w-48 h-[144px]`로 전환.

### 2.2 시각 디자인 원칙은 scale, hierarchy, balance가 사용성을 높인다고 본다

- Source URL: https://www.nngroup.com/articles/principles-visual-design/
- Key Summary: Nielsen Norman Group은 scale, visual hierarchy, balance, contrast, Gestalt 같은 시각 디자인 원칙이 보기 좋은 디자인뿐 아니라 사용성도 높인다고 설명한다.
- Applicability: 슬라이드 thumbnail은 탐색용 미니 preview이므로 실제 slide 비례와 균형을 유지해야 사용자가 현재 deck 구조를 빠르게 파악할 수 있다.
- Difference From This Project: 기존 4:3 thumbnail은 프레임과 내용의 scale/balance가 맞지 않았다.
- Adoption Priority: 중간.
- Reflected Status: thumbnail container size를 ratio-aware helper로 계산.

### 2.3 반응형 이미지/미디어는 aspect ratio를 유지해야 왜곡과 레이아웃 오해를 줄인다

- Source URL: https://www.sitepoint.com/maintain-image-aspect-ratios-responsive-web-design/
- Key Summary: SitePoint는 CSS에서 이미지 비율을 유지하는 여러 기법을 설명하며, 컨테이너에 맞출 때 aspect ratio 보존이 중요하다고 다룬다.
- Applicability: WorkAI thumbnail은 이미지 파일은 아니지만 축소된 slide preview이므로, 외부 컨테이너가 실제 preview 비율을 왜곡하지 않아야 한다.
- Difference From This Project: 기존 thumbnail frame은 내부 4:3 preview와 다른 16:9 컨테이너였다.
- Adoption Priority: 중간.
- Reflected Status: `getFilmstripThumbnailClass`가 ratio별 frame size를 반환.

## 3. 제품 개선 결정

선택 기능: `Aspect Ratio Aware Filmstrip Thumbnails`

- 필름스트립 thumbnail class 생성을 `slide-thumbnail-layout.ts` helper로 분리한다.
- 16:9 deck은 기존 `w-64 h-[144px]` 프레임을 유지한다.
- 4:3 deck은 같은 높이 144px 기준의 `w-48 h-[144px]` 프레임을 사용한다.
- active/inactive border, ring, hover state는 기존과 동일하게 보존한다.
- `SlideEditor` 하단 thumbnail button이 helper를 호출하도록 연결한다.

## 4. A/B 테스트 설계

- Control A: 기존 필름스트립 thumbnail class. 4:3 deck에서도 `w-64 h-[144px]`라 4:3 frame score 0.
- Candidate B: `getFilmstripThumbnailClass(false, '4:3')`가 `w-48 h-[144px]`를 반환.
- 샘플: inactive 4:3 thumbnail, active 16:9 thumbnail.
- 평가 기준: 4:3 class에는 `w-48`이 있고 `w-64`는 없어야 하며, 16:9 active class는 기존 `w-64`와 active border를 유지해야 한다.
- 실제 결과: baseline 0, candidate 1.
- 구현 위치: `src/components/designer/slide-thumbnail-layout.test.ts`.
- 1차 검증: `npx vitest run src/components/designer/slide-thumbnail-layout.test.ts src/components/designer/EditorHeader.test.tsx src/lib/presentation-storage.test.ts` 통과, 3개 파일 5개 테스트 성공.
- 1차 타입 검증: `npx tsc --noEmit` 통과.

## 5. 후속 개선 백로그

- `SlideThumbnail.tsx`가 실제 사용되지 않는 legacy component인지 audit 후 제거 또는 같은 helper 적용.
- 하단 필름스트립 너비 변화에 따른 스크롤 위치/선택 상태의 시각 안정성 Playwright 확인.
- 저장 히스토리 thumbnail에도 4:3/16:9 preview 비율을 반영.

## 6. 이번 루프 반영 상태

- 반영됨: `src/components/designer/slide-thumbnail-layout.ts` ratio-aware thumbnail class helper.
- 반영됨: `src/components/designer/SlideEditor.tsx` 하단 필름스트립 thumbnail class 연결.
- 반영됨: `src/components/designer/slide-thumbnail-layout.test.ts` 4:3/16:9 thumbnail A/B 테스트.
- 검증 완료: `npx vitest run src/components/designer/slide-thumbnail-layout.test.ts src/components/designer/EditorHeader.test.tsx src/lib/presentation-storage.test.ts` 통과, 3개 파일 5개 테스트 성공.
- 검증 완료: `npx tsc --noEmit` 통과.
- 검증 완료: `npm test` 통과, 25개 파일 72개 테스트 성공.
- 검증 완료: `npm run build` 통과.
- 검증 완료: `npm run lint` 통과, 기존 warning 11개와 error 0개.
