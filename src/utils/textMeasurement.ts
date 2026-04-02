/**
 * 가상 DOM을 이용한 텍스트 및 콘텐츠 높이 측정 유틸리티
 */

interface MeasureOptions {
  width: number;
  fontSize: string;
  lineHeight?: string;
  fontWeight?: string;
  fontFamily?: string;
}

/**
 * 특정 너비에서 텍스트의 실제 픽셀 높이를 측정합니다.
 */
export function measureTextHeight(
  text: string,
  options: MeasureOptions
): number {
  if (typeof document === 'undefined') return 0;

  const { width, fontSize, lineHeight = '1.5', fontWeight = 'normal', fontFamily = 'sans-serif' } = options;
  
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.width = `${width}px`;
  div.style.fontSize = fontSize;
  div.style.lineHeight = lineHeight;
  div.style.fontWeight = fontWeight;
  div.style.fontFamily = fontFamily;
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';
  div.style.padding = '0';
  div.style.margin = '0';
  
  // HTML sanitization is skipped here as it's for internal measurement
  div.innerText = text;
  
  document.body.appendChild(div);
  const height = div.scrollHeight;
  document.body.removeChild(div);
  
  return height;
}

/**
 * 불릿 포인트 리스트의 총 높이를 측정합니다.
 */
export function measureBulletListHeight(
  items: Array<{ heading: string; description?: string }>,
  options: MeasureOptions,
  spacingPx: number = 24
): number {
  if (typeof document === 'undefined') return 0;

  let totalHeight = 0;
  
  items.forEach((item, index) => {
    // Heading height
    const hHeight = measureTextHeight(item.heading, { ...options, fontWeight: 'bold' });
    totalHeight += hHeight;
    
    // Description height
    if (item.description) {
      const dHeight = measureTextHeight(item.description, { ...options, fontSize: `calc(${options.fontSize} * 0.7)` });
      totalHeight += dHeight;
    }
    
    // Spacing between items
    if (index < items.length - 1) {
      totalHeight += spacingPx;
    }
  });

  return totalHeight;
}
