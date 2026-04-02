import { measureBulletListHeight } from './textMeasurement';

export interface SlideContent {
  heading: string;
  description: string;
}

export interface RawSlide {
  title: string;
  type?: string;
  layout?: string;
  content: SlideContent[];
  speakerPersona?: string;
  strategicGoal?: string;
  visualization_type?: string;
  citation_url?: string;
  fontSize?: string; // AutoFit으로 계산된 폰트 크기
}

const MAX_CONTENT_HEIGHT = 450; // 16:9 슬라이드에서의 표준 본문 영역 높이
const DEFAULT_FONT_SIZE = 28;
const MIN_FONT_SCALE = 0.8; // 최대 20% 축소

/**
 * 콘텐츠 오버플로우를 감지하여 AutoFit(글꼴 축소) 또는 Smart Splitting(슬라이드 분할)을 수행합니다.
 */
export function smartSplitSlide(slide: RawSlide): RawSlide[] {
  const content = slide.content || [];
  if (content.length === 0) return [slide];

  // 레이아웃별 가용 너비 설정
  let contentWidth = 1000;
  if (slide.layout === 'split') contentWidth = 500;
  if (slide.layout === 'grid') contentWidth = 450; // 카드 내부 너비

  let currentScale = 1.0;
  let finalFontSize = `${DEFAULT_FONT_SIZE}px`;

  // 1. AutoFit: 글꼴을 최대 20%까지 줄여서 맞춰봅니다.
  while (currentScale >= MIN_FONT_SCALE) {
    const testFontSize = `${DEFAULT_FONT_SIZE * currentScale}px`;
    const height = measureBulletListHeight(content, {
      width: contentWidth,
      fontSize: testFontSize,
      lineHeight: '1.4'
    });

    if (height <= MAX_CONTENT_HEIGHT) {
      return [{ ...slide, fontSize: testFontSize }];
    }
    
    currentScale -= 0.05; // 5%씩 점진적 축소
    finalFontSize = testFontSize;
  }

  // 2. 여전히 넘칠 경우: Smart Splitting (슬라이드 분할)
  const result: RawSlide[] = [];
  const remainingContent = [...content];
  let partIndex = 1;

  while (remainingContent.length > 0) {
    const currentChunk: SlideContent[] = [];
    
    // 현재 슬라이드에 들어갈 수 있는 만큼 항목을 채웁니다.
    while (remainingContent.length > 0) {
      const nextItem = remainingContent[0];
      const testChunk = [...currentChunk, nextItem];
      const height = measureBulletListHeight(testChunk, {
        width: contentWidth,
        fontSize: finalFontSize,
        lineHeight: '1.4'
      });

      // 첫 번째 항목은 무조건 넣고(무한 루프 방지), 그 외엔 높이 체크
      if (height <= MAX_CONTENT_HEIGHT || currentChunk.length === 0) {
        currentChunk.push(remainingContent.shift()!);
      } else {
        break; 
      }
    }

    result.push({
      ...slide,
      title: slide.title, // 나중에 넘버링 일괄 적용
      content: currentChunk,
      fontSize: finalFontSize
    });
    
    partIndex++;
  }

  // 3. 분할된 슬라이드에 (1/2), (2/2) 넘버링 적용
  const totalParts = result.length;
  if (totalParts > 1) {
    return result.map((s, i) => ({
      ...s,
      title: `${s.title} (${i + 1}/${totalParts})`
    }));
  }

  return result;
}

/**
 * 전체 프레젠테이션의 모든 슬라이드를 검사하여 최적화합니다.
 */
export function processAllSlides(slides: RawSlide[]): RawSlide[] {
  return slides.flatMap(s => smartSplitSlide(s));
}
