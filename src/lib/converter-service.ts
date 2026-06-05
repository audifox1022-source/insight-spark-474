import { GoogleGenerativeAI } from '@google/generative-ai';

import { Presentation } from '@/types/presentation';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const converterService = {
  async convertPdfToSlides(pdfName: string, fullText: string): Promise<Presentation> {
    console.log(`[Converter] Converting PDF to slides: ${pdfName}`);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

      const result = await model.generateContent(prompt);
      const resText = result.response.text();
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
