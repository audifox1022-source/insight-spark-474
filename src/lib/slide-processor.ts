import { Slide } from '@/types/presentation';

const MAX_BODY_ITEMS = 6;
const MAX_CHAR_COUNT = 300;

/**
 * 슬라이드 데이터가 너무 많을 경우 여러 장으로 분할하는 유틸리티
 */
export function processAndSplitSlides(slides: Slide[]): Slide[] {
  const result: Slide[] = [];
  const MAX_BODY_ITEMS = 5; 
  const MAX_CHAR_COUNT = 350;
  let currentNum = 1;

  for (const slide of slides) {
    const rawContent = slide.content || slide.points || slide.bullets || [];
    const content = Array.isArray(rawContent) ? rawContent : [];
    const totalChars = content.join('').length;
    
    // 분할이 필요한지 확인
    if (content.length > MAX_BODY_ITEMS || totalChars > MAX_CHAR_COUNT) {
      // 본문 내용을 묶음으로 나눔
      const chunks: string[][] = [];
      for (let i = 0; i < content.length; i += MAX_BODY_ITEMS) {
        chunks.push(content.slice(i, i + MAX_BODY_ITEMS));
      }

      chunks.forEach((chunk, index) => {
        const titleSuffix = index > 0 ? ` (${index + 1})` : '';
        result.push({
          ...slide,
          id: `${slide.id || 'slide'}-${currentNum}`,
          slideNumber: currentNum++,
          title: `${slide.title}${titleSuffix}`,
          content: chunk,
          subhead: index === 0 ? slide.subhead : slide.subhead, // Keep subhead for context or clear it? User said (2) for same title.
        });
      });
    } else {
      result.push({
        ...slide,
        slideNumber: currentNum++,
        id: slide.id || `slide-${currentNum}`,
      });
    }
  }

  return result;
}

/**
 * 부분 수정을 위한 조각(Fragment)이 오면 스키마 보정 및 유효성 검사 수행
 */
export function sanitizeSlideFragment(fragment: any): Partial<Slide> {
  if (!fragment || typeof fragment !== 'object') return {};

  const sanitized: any = { ...fragment };
  
  // 1. 필수 매핑 (layout_type -> type 등 레거시 대응)
  if (fragment.layout_type && !sanitized.type) sanitized.type = fragment.layout_type;
  if (fragment.subtitle && !sanitized.subhead) sanitized.subhead = fragment.subtitle;
  if (fragment.kpis && !sanitized.keyMetrics) sanitized.keyMetrics = fragment.kpis;
  
  // 2. 다양한 본문 필드명을 content로 통합
  const contentKeys = ['content_bullets', 'points', 'bullets', 'items', 'list', 'body'];
  for (const key of contentKeys) {
    if (fragment[key] && Array.isArray(fragment[key]) && !sanitized.content) {
      sanitized.content = fragment[key].map((item: any) => 
        typeof item === 'object' ? (item.text || item.title || JSON.stringify(item)) : String(item)
      );
      break; 
    }
  }

  return sanitized;
}
