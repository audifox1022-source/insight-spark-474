// ============================================================
// src/lib/pdf-export-lib.ts (Work AI - Professional PDF Export Engine)
// [Enterprise] Advanced Layout Sync & Multi-line Text Rendering (v1.2)
// [Update] Word Wrap (Automatic Line Braking) based on Element Width
// ============================================================
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { PdfElement } from '@/store/usePdfEditorStore';

/**
 * 헥스 컬러값을 pdf-lib RGB 객체로 변환
 */
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
}

/**
 * 텍스트를 지정된 너비에 맞춰 줄바꿈 처리
 */
function splitTextIntoLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // 한국어 등 공백이 없는 텍스트를 위한 2차 처리 (너무 긴 단어 강제 줄바꿈)
  const finalLines: string[] = [];
  for (const line of lines) {
    if (font.widthOfTextAtSize(line, fontSize) <= maxWidth) {
      finalLines.push(line);
      continue;
    }
    
    // 단어 자체가 너무 긴 경우 글자 단위로 쪼개기
    let subLine = '';
    for (const char of line) {
      const testSub = subLine + char;
      if (font.widthOfTextAtSize(testSub, fontSize) > maxWidth && subLine) {
        finalLines.push(subLine);
        subLine = char;
      } else {
        subLine = testSub;
      }
    }
    if (subLine) finalLines.push(subLine);
  }

  return finalLines.length > 0 ? finalLines : [text];
}

/**
 * 캔버스 좌표를 PDF 좌표계로 변환하여 병합된 PDF 생성
 */
export const exportModifiedPdf = async (
  originalPdfBytes: ArrayBuffer,
  elements: PdfElement[],
  canvasWidth: number,
  canvasHeight: number
): Promise<Uint8Array> => {
  // 1. [CRITICAL FIX] PDF 로드 전 버퍼 복제
  const pdfDoc = await PDFDocument.load(originalPdfBytes.slice(0));
  const pages = pdfDoc.getPages();
  
  // 폰트 매핑 (한국어 폰트는 실제 임베딩 바이트가 필요하나, 구조적 우선순위 반영)
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  
  // 2. 레이어 순서 정렬 (마스킹 -> 드로잉 -> 텍스트)
  const sortedElements = [...elements].sort((a, b) => {
    const order = { mask: 1, drawing: 2, text: 3 };
    return (order[a.type as keyof typeof order] || 9) - (order[b.type as keyof typeof order] || 9);
  });

  for (const el of sortedElements) {
    const pageIndex = (el.page || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // 캔버스 대비 PDF 배율 계산
    const scaleX = pageWidth / canvasWidth;
    const scaleY = pageHeight / canvasHeight;

    // [CRITICAL] PDF 좌표계 (좌하단 0,0) 변환 공식
    const pdfX = el.x * scaleX;
    const pdfY = pageHeight - (el.y * scaleY) - (el.height * scaleY);

    if (el.type === 'mask') {
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: el.width * scaleX,
        height: el.height * scaleY,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
    } 
    else if (el.type === 'text' && el.content) {
      // 폰트 선택 로직
      let activeFont = fontHelveticaBold;
      if (el.fontFamily === 'Batang') activeFont = fontTimes;
      else if (el.fontFamily === 'Gulim' || el.fontFamily === 'Dotum') activeFont = fontHelvetica;

      const fontSize = (el.fontSize || 16) * scaleY;
      const maxWidth = el.width * scaleX;
      
      // [NEW] 자동 줄바꿈 처리
      const lines = splitTextIntoLines(el.content, activeFont, fontSize, maxWidth - (10 * scaleX));
      const lineHeight = fontSize * 1.2;

      lines.forEach((line, index) => {
        page.drawText(line, {
          x: pdfX + (5 * scaleX),
          y: pdfY + (el.height * scaleY) - (fontSize * 0.9) - (index * lineHeight),
          size: fontSize,
          font: activeFont,
          color: hexToRgb(el.color || '#000000'),
        });
      });
    } 
    else if (el.type === 'drawing' && el.points && el.points.length > 1) {
      for (let i = 0; i < el.points.length - 1; i++) {
        const start = el.points[i];
        const end = el.points[i+1];
        page.drawLine({
          start: { 
            x: (el.x + start.x) * scaleX, 
            y: pageHeight - (el.y + start.y) * scaleY 
          },
          end: { 
            x: (el.x + end.x) * scaleX, 
            y: pageHeight - (el.y + end.y) * scaleY 
          },
          thickness: (el.type === 'drawing' ? 2 : 1) * scaleY,
          color: hexToRgb(el.color || '#6366f1'),
          opacity: 1,
        });
      }
    }
  }

  // 3. 고해상도 직렬화 및 반환
  return await pdfDoc.save();
};
