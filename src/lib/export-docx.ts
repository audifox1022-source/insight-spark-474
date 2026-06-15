// ============================================================
// src/lib/export-docx.ts (Work AI - Word ?대낫?닿린 ?붿쭊)
// ============================================================
import { Presentation } from '@/types/presentation';

function getHeadingLevel(layout: string): 'TITLE' | 'HEADING_1' | 'HEADING_2' {
  switch (layout) {
    case 'cover': return 'HEADING_1';
    case 'summary': return 'HEADING_1';
    default: return 'HEADING_2';
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
    throw new Error('?대낫???щ씪?대뱶 ?곗씠?곌? ?놁뒿?덈떎.');
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const { default: saveAs } = await import('file-saver');

  const sections: any[] = [];

  // ?쒖? ?뱀뀡
  const coverSlide = presentation.slides[0];
  if (coverSlide) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: coverSlide.title || presentation.title || '諛쒗몴?먮즺',
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
          text: `?묒꽦?? ${new Date().toLocaleDateString('ko-KR')}`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
        }),
        new Paragraph({ text: '' }),
      ],
    });
  }

  // 蹂몃Ц ?뱀뀡
  const bodySlides = presentation.slides.slice(1);
  const bodyChildren: any[] = [];

  for (const slide of bodySlides) {
    // ?щ씪?대뱶 ?쒕ぉ
    bodyChildren.push(
      new Paragraph({
        text: slide.title || '?쒕ぉ ?놁쓬',
        heading: getHeadingLevel(slide.layout || 'default'),
        spacing: { before: 400, after: 200 },
      })
    );

    // 遺?쒕ぉ
    if (slide.subtitle) {
      bodyChildren.push(
        new Paragraph({
          text: slide.subtitle,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 200 },
        })
      );
    }

    // 蹂몃Ц 肄섑뀗痢?    if (Array.isArray(slide.content)) {
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

    // ?꾨왂 紐⑺몴
    if (slide.strategicGoal) {
      bodyChildren.push(
        new Paragraph({
          text: `?꾨왂 紐⑺몴: ${slide.strategicGoal}`,
          spacing: { before: 200 },
          style: 'Intense Quote',
        })
      );
    }

    // ?щ씪?대뱶 媛?援щ텇??    bodyChildren.push(
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

  // DOCX 臾몄꽌 ?앹꽦
  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: {
            font: '留묒? 怨좊뵓',
            size: 24,
          },
        },
      },
    },
  });

  // ?뚯씪 ?ㅼ슫濡쒕뱶
  const blob = await Packer.toBlob(doc);
  const safeTitle = (presentation.title || 'presentation').replace(/[^a-z0-9_-]/gi, '_');
  saveAs(blob, `${safeTitle}_${Date.now()}.docx`);
}

export { saveAs };



