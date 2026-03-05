import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS 및 메서드 체크
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. API KEY 체크
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return res.status(500).json({ error: "서버 API 키 설정이 누락되었습니다." });
    }

    const { title, content, type, brandSettings } = req.body;

    // 3. Gemini 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    
    /** * ✅ 모델명 주의: 
     * 최신 모델이라도 API 상의 ID는 다를 수 있습니다. 
     * 현재 가장 지능이 높은 'gemini-1.5-pro'를 권장하며, 
     * 최신 버전을 쓰시려면 공식 문서의 Model ID를 확인하세요.
     */
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemPrompt = `
      Presentation Design Expert. 
      Analyze this slide content: Title: "${title}", Content: "${content?.join(', ')}".
      Create a detailed English prompt for an AI image generator (for a ${type === 'background' ? 'background' : 'visual element'}).
      Style: Professional, corporate, ${brandSettings?.companyName || 'modern'}.
      Color: #${brandSettings?.primaryColor || '3B82F6'}.
      No text in image. Output ONLY the English prompt string.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const generatedPrompt = response.text();

    // 4. 이미지 생성 엔진 호출 (Pollinations AI 사용 - 별도 키 불필요)
    const seed = Math.floor(Math.random() * 1000000);
    // 슬라이드 비율에 맞춰 가로형(16:9) 이미지 생성을 유도하는 프롬프트 추가
    const finalImageUrl = `https://pollinations.ai/p/${encodeURIComponent(generatedPrompt + " --ar 16:9 --v 6")}?width=1280&height=720&seed=${seed}&nologo=true`;

    // 성공 응답
    return res.status(200).json({ 
      imageUrl: finalImageUrl, 
      refinedPrompt: generatedPrompt 
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 서버 에러 시에도 JSON을 반환하여 프론트엔드 SyntaxError 방지
    return res.status(500).json({ 
      error: "이미지 분석 중 서버 오류가 발생했습니다.",
      details: error.message 
    });
  }
}
