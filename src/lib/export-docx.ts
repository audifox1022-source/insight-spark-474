// ============================================================
// src/lib/export-docx.ts (Work AI - Word export engine)
// ============================================================
import { Presentation } from '@/types/presentation';

function getHeadingLevel(layout: string): 'TITLE' | 'HEADING_1' | 'HEADING_2' {
  switch (layout) {
    case 'cover':
    case 'summary':
      return 'HEADING_1';
    default:
      return 'HEADING_2';
  }
}

export async function exportToDocx(presentation: Presentation): Promise<void> {
  if (!presentation?.slides?.length) {
    throw new Error('내보낼 슬라이드 데이터가 없습니다.');
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const { default: saveAs } = await import('file-saver');

  const sections: any[] = [];
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
        ...(coverSlide.subtitle
          ? [
              new Paragraph({
                text: coverSlide.subtitle,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
            ]
          : []),
        new Paragraph({
          text: `작성일: ${new Date().toLocaleDateString('ko-KR')}`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
        }),
        new Paragraph({ text: '' }),
      ],
    });
  }

  const bodyChildren: any[] = [];

  for (const slide of presentation.slides.slice(1)) {
    bodyChildren.push(
      new Paragraph({
        text: slide.title || '제목 없음',
        heading: getHeadingLevel(slide.layout || 'default'),
        spacing: { before: 400, after: 200 },
      }),
    );

    if (slide.subtitle) {
      bodyChildren.push(
        new Paragraph({
          text: slide.subtitle,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 200 },
        }),
      );
    }

    if (Array.isArray(slide.content)) {
      for (const item of slide.content) {
        if (item.heading) {
          bodyChildren.push(
            new Paragraph({
              children: [new TextRun({ text: item.heading, bold: true })],
              spacing: { before: 200, after: 100 },
            }),
          );
        }

        if (item.description) {
          bodyChildren.push(
            new Paragraph({
              text: item.description,
              spacing: { after: 100 },
            }),
          );
        }
      }
    } else if (typeof slide.content === 'string' && slide.content) {
      bodyChildren.push(
        new Paragraph({
          text: slide.content,
          spacing: { after: 200 },
        }),
      );
    }

    if (slide.strategicGoal) {
      bodyChildren.push(
        new Paragraph({
          text: `전략 목표: ${slide.strategicGoal}`,
          spacing: { before: 200 },
          style: 'Intense Quote',
        }),
      );
    }

    bodyChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  if (bodyChildren.length > 0) {
    sections.push({
      properties: {},
      children: bodyChildren,
    });
  }

  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: {
            font: 'Malgun Gothic',
            size: 24,
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = (presentation.title || 'presentation').replace(/[^a-z0-9_-]/gi, '_');
  saveAs(blob, `${safeTitle}_${Date.now()}.docx`);
}

export { saveAs };
