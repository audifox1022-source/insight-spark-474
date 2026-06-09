import { Presentation } from '@/types/presentation';
import { callGeminiAPI } from '@/services/ai/api-client';

export const converterService = {
  async convertPdfToSlides(pdfName: string, fullText: string): Promise<Presentation> {
    console.log(`[Converter] Converting PDF to slides: ${pdfName}`);

    try {
      const prompt = `
Analyze the following PDF text and convert it into a high-quality presentation JSON.
Return only this shape:
{ "presentation": { "title": "...", "slides": [...] } }

Rules:
1. The first slide should use layout "cover".
2. Use appropriate layouts such as default, split, grid, timeline, or chart.
3. Summarize long text into concise bullet-style slide content.

PDF text:
${fullText.substring(0, 15000)}
`;

      const resText = await callGeminiAPI(
        'You convert source documents into presentation JSON. Return valid JSON only.',
        prompt,
        8192,
        'application/json'
      );
      const jsonMatch = resText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Invalid AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const generated = parsed.presentation ?? {};

      return {
        id: `conv-${Date.now()}`,
        title: generated.title || pdfName.replace(/\.pdf$/i, ''),
        slides: (generated.slides || []).map((slide: any, index: number) => ({
          ...slide,
          id: slide.id || `slide-${index}-${Date.now()}`,
          type: slide.type || 'default',
          elements: slide.elements || [],
        })),
      };
    } catch (err) {
      console.error('PDF conversion failed:', err);

      return {
        id: `fail-${Date.now()}`,
        title: pdfName,
        slides: [
          {
            id: '1',
            title: 'Conversion failed',
            content: 'AI analysis failed.',
            layout: 'cover',
            type: 'cover',
            elements: [],
          },
        ],
      };
    }
  },
};
