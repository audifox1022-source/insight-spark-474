// ============================================================
// src/lib/export-docx.ts (Work AI - Word 내보내기 엔진)
// ============================================================
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { Presentation } from '@/types/presentation';

function getHeadingLevel(layout: string): typeof HeadingLevel[keyof typeof HeadingLevel] {
  switch (layout) {
    case 'cover': return HeadingLevel.HEADING_1;
    case 'summary': return HeadingLevel.HEADING_1;
    default: return HeadingLevel.HEADING_2;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export async function exportToDocx(presentation: Presentation): Promise<void> {
  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    throw new Error('내보낼 슬라이드 데이터가 없습니다.');
  }

  const sections: any[] = [];

  // 표지 섹션
  const coverSlide = presentation.slides[0];
  if (coverSlide) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: coverSlide.title || presentation.title || '발표자료',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        }),
        ...(coverSlide.subtitle ? [
          new Paragraph({
            text: coverSlide.subtitle,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
        ] : []),
        new Paragraph({
          text: `작성일: ${new Date().toLocaleDateString('ko-KR')}`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
        }),
        new Paragraph({ text: '' }),
      ],
    });
  }

  // 본문 섹션
  const bodySlides = presentation.slides.slice(1);
  const bodyChildren: any[] = [];

  for (const slide of bodySlides) {
    // 슬라이드 제목
    bodyChildren.push(
      new Paragraph({
        text: slide.title || '제목 없음',
        heading: getHeadingLevel(slide.layout || 'default'),
        spacing: { before: 400, after: 200 },
      })
    );

    // 부제목
    if (slide.subtitle) {
      bodyChildren.push(
        new Paragraph({
          text: slide.subtitle,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 200 },
        })
      );
    }

    // 본문 콘텐츠
    if (Array.isArray(slide.content)) {
      for (const item of slide.content) {
        if (item.heading) {
          bodyChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.heading,
                  bold: true,
                }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
        }
        if (item.description) {
          bodyChildren.push(
            new Paragraph({
              text: item.description,
              spacing: { after: 100 },
            })
          );
        }
      }
    } else if (typeof slide.content === 'string' && slide.content) {
      bodyChildren.push(
        new Paragraph({
          text: slide.content,
          spacing: { after: 200 },
        })
      );
    }

    // 전략 목표
    if (slide.strategicGoal) {
      bodyChildren.push(
        new Paragraph({
          text: `전략 목표: ${slide.strategicGoal}`,
          spacing: { before: 200 },
          style: 'Intense Quote',
        })
      );
    }

    // 슬라이드 간 구분선
    bodyChildren.push(
      new Paragraph({
        text: '',
        spacing: { after: 200 },
      })
    );
  }

  if (bodyChildren.length > 0) {
    sections.push({
      properties: {},
      children: bodyChildren,
    });
  }

  // DOCX 문서 생성
  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: {
            font: '맑은 고딕',
            size: 24,
          },
        },
      },
    },
  });

  // 파일 다운로드
  const blob = await Packer.toBlob(doc);
  const safeTitle = (presentation.title || '발표자료').replace(/[^a-z0-9가-힣]/gi, '_');
  saveAs(blob, `${safeTitle}_${Date.now()}.docx`);
}

export { saveAs };
