// ============================================================
// src/lib/converter-service.ts (Work AI - Multi-modal Converter)
// [Enterprise] PDF to Slides (Presentation) 변환 서비스
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Presentation, Slide } from '@/types/presentation';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const converterService = {
  /** 
   * [1] PDF 텍스트 데이터를 슬라이드 객체로 변환 
   */
  async convertPdfToSlides(pdfName: string, fullText: string): Promise<Presentation> {
    console.log(`[Converter] Converting PDF to Slides: ${pdfName}`);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        다음 [PDF 텍스트 데이터]를 분석하여 총 5~8장의 고품질 발표자료(JSON)로 변환하십시오.
        결과는 반드시 { "presentation": { "title": "...", "slides": [...] } } 형식이어야 합니다.
        
        [제약사항]
        1. 첫 번째 슬라이드는 layout: "cover"여야 합니다.
        2. 각 슬라이드의 layout은 default, split, grid, timeline, chart 중 적절히 배분하십시오.
        3. 텍스트가 너무 많으면 불릿 포인트로 요약하십시오.
        
        [PDF 텍스트]
        ${fullText.substring(0, 15000)}
      `;
      
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: `conv-${Date.now()}`,
          title: parsed.presentation.title || pdfName.replace('.pdf', ''),
          slides: parsed.presentation.slides.map((s: any, i: number) => ({
            ...s,
            id: `slide-${i}-${Date.now()}`,
            type: s.type || 'default'
          }))
        };
      }
      throw new Error('Invalid AI Response');
    } catch (err) {
      console.error('PDF Conversion failed:', err);
      // 실패 시 기본 슬라이드 반환
      return {
        id: `fail-${Date.now()}`,
        title: pdfName,
        slides: [{ id: '1', title: '변환 실패', content: 'AI 분석 중 오류가 발생했습니다.', layout: 'cover', type: 'cover' }]
      };
    }
  }
};
