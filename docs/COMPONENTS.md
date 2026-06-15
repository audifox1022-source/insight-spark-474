# WorkAI 컴포넌트 문서

## 개요
WorkAI 플랫폼의 핵심 컴포넌트 Props 및 사용법 문서

## 핵심 컴포넌트

### 1. Index (메인 플랫폼)
**경로**: `src/pages/Index.tsx`

| Props | 타입 | 설명 |
|-------|------|------|
| - | - | 메인 플랫폼 진입점 (별도 Props 없음) |

**상태 관리**: `usePresentation` 훅 사용
**모드**: presentation, designer, translator, audiolab, pdfeditor

---

### 2. PresentationTab
**경로**: `src/components/PresentationTab.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| step | string | O | 현재 단계 (upload/info/outline/preview) |
| setStep | function | O | 단계 변경 함수 |
| info | MeetingInfo | O | 발표 정보 |
| setInfo | function | O | 발표 정보 변경 |
| settings | PresentationSettings | O | 생성 설정 |
| setSettings | function | O | 설정 변경 |
| handleGenerateOutline | function | O | 목차 생성 핸들러 |
| handleGenerateFull | function | O | 전체 생성 핸들러 |
| reset | function | O | 초기화 함수 |
| isGenerating | boolean | O | 생성 중 여부 |
| presentation | Presentation | X | 현재 프레젠테이션 |
| outline | any | X | 생성된 목차 |
| switchToDesigner | function | O | 디자이너 전환 |

---

### 3. SlideEditor
**경로**: `src/components/designer/SlideEditor.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| onBack | function | O | 뒤로가기 핸들러 |
| presentation | Presentation | X | 프레젠테이션 데이터 |
| onSave | function | O | 저장 핸들러 |
| isSaving | boolean | O | 저장 중 여부 |
| onRegenerateSlide | function | O | 슬라이드 재생성 |
| onOpenChat | function | O | AI 채팅 열기 |
| onOpenReview | function | O | AI 리뷰 열기 |
| onAutoDesign | function | O | 자동 디자인 |
| dataFiles | array | X | 업로드된 데이터 파일 |
| onDataFileUpload | function | X | 데이터 파일 업로드 |
| onRemoveDataFile | function | X | 데이터 파일 삭제 |

---

### 4. TranslatorWorkspace
**경로**: `src/components/TranslatorWorkspace.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| ref | ref | X | handleBack 함수 노출 |

**지원 언어**: 한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어, 러시아어, 베트남어, 인도네시아어

---

### 5. AudioLabWorkspace
**경로**: `src/components/audio/AudioLabWorkspace.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| - | - | - | Props 없음 (내부 상태 관리) |

**지원 형식**: MP3, WAV, OGG, WebM, FLAC, M4A
**최대 크기**: 500MB

---

### 6. PDFEditorWorkspace
**경로**: `src/components/pdf/PDFEditorWorkspace.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| onBack | function | O | 뒤로가기 핸들러 |

---

### 7. TemplateLibrary
**경로**: `src/components/TemplateLibrary.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| isOpen | boolean | O | 열린 상태 |
| onClose | function | O | 닫기 핸들러 |
| onSelect | function | O | 템플릿 선택 핸들러 |
| selectedId | string | X | 선택된 템플릿 ID |

---

### 8. InteractiveChart
**경로**: `src/components/designer/InteractiveChart.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| data | array | O | 차트 데이터 |
| type | string | O | 차트 유형 (bar/line/pie) |
| colors | array | X | 커스텀 색상 |
| title | string | X | 차트 제목 |
| onExport | function | X | 내보내기 핸들러 |

---

### 9. AISuggestionPanel
**경로**: `src/components/designer/AISuggestionPanel.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| isOpen | boolean | O | 열린 상태 |
| onClose | function | O | 닫기 핸들러 |
| presentation | Presentation | X | 프레젠테이션 데이터 |
| currentSlideIndex | number | O | 현재 슬라이드 인덱스 |
| onApplySuggestion | function | O | 제안 적용 핸들러 |

---

### 10. MobileNav
**경로**: `src/components/MobileNav.tsx`

| Props | 타입 | 필수 | 설명 |
|-------|------|------|------|
| activeApp | string | O | 현재 활성 모드 |
| onAppChange | function | O | 모드 변경 핸들러 |
| onHistoryOpen | function | O | 저장 목록 열기 |
| isDark | boolean | O | 다크모드 여부 |
| onToggleTheme | function | O | 테마 전환 |

---

## 유틸리티 라이브러리

### template-library.ts
| 함수 | 설명 |
|------|------|
| getTemplatesByCategory(category) | 카테고리별 템플릿 목록 |
| searchTemplates(query) | 키워드 검색 |
| getTemplateById(id) | ID로 템플릿 조회 |

### version-management.ts
| 함수 | 설명 |
|------|------|
| createVersion(presentation, desc) | 새 버전 생성 |
| saveVersion(version) | 버전 저장 |
| loadVersions() | 버전 목록 로드 |
| compareVersions(old, new) | 버전 비교 |

### batch-regeneration.ts
| 함수 | 설명 |
|------|------|
| batchRegenerateSlides(presentation, options) | 배치 슬라이드 재생성 |
| selectAllSlides(presentation) | 전체 슬라이드 선택 |
| selectContentSlides(presentation) | 본문 슬라이드만 선택 |

### chart-recommendation.ts
| 함수 | 설명 |
|------|------|
| analyzeData(data) | 데이터 분석 |
| recommendChartType(data) | 차트 유형 추천 |
| getChartTypeLabel(type) | 차트 유형 한글 라벨 |

---

## 스토어

### useSlideStore
| 상태/함수 | 타입 | 설명 |
|-----------|------|------|
| presentation | Presentation | 현재 프레젠테이션 |
| currentSlideIndex | number | 현재 슬라이드 인덱스 |
| aspectRatio | string | 화면 비율 (16:9/4:3) |
| setPresentation | function | 프레젠테이션 설정 |
| addSlide | function | 슬라이드 추가 |
| deleteSlide | function | 슬라이드 삭제 |
| undo/redo | function | 실행 취소/다시 실행 |

### useThemeStore
| 상태/함수 | 타입 | 설명 |
|-----------|------|------|
| theme | string | 테마 (light/dark) |
| appTheme | string | 앱 테마 (blue/navy/purple/green/orange) |
| toggleTheme | function | 테마 전환 |
| setAppTheme | function | 앱 테마 설정 |

---

## 타입 정의

### Presentation
```typescript
interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  brandColor?: string;
}
```

### Slide
```typescript
interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  content: string | SlideContent[];
  layout?: string;
  elements: SlideElement[];
  theme?: SlideTheme;
}
```

### MeetingInfo
```typescript
interface MeetingInfo {
  title: string;
  objective?: string;
  audience?: string;
  tone?: string;
  week?: string;
  reporter?: string;
  department?: string;
  notes?: string;
}
```

### PresentationSettings
```typescript
interface PresentationSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'executive' | 'composer';
  volume: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  slideCount: number;
  generationStyle: 'standard' | 'kimura' | 'gptpark';
  brandColor: string;
}
```

---
*문서 버전: 1.0*
*작성일: 2026-06-15*
