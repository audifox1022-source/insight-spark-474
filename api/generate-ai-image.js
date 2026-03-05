import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, content, type, brandSettings } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API 키가 설정되지 않았습니다." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ✅ 404 에러 해결: 가장 안정적인 gemini-1.5-flash 모델 사용
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const analysisPrompt = `
      Create a high-quality English image generation prompt for a ${type === 'background' ? 'professional presentation background' : 'visual illustration'}.
      Slide Title: "${title}"
      Slide Content: "${content?.join(', ')}"
      Style: Modern Business, Clean, 4k, Minimalist.
      Brand Color: #${brandSettings?.primaryColor || '3B82F6'}.
      Rule: No text, no letters, no watermark.
      Return ONLY the prompt string.
    `;

    const result = await model.generateContent(analysisPrompt);
    const generatedPrompt = result.response.text().trim();

    // ✅ 530 에러 방지: URL 인코딩을 엄격하게 처리하고 대안 주소 사용
    const seed = Math.floor(Math.random() * 1000000);
    // Pollinations 외에 대안으로 사용 가능한 안정적인 URL 구조
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(generatedPrompt)}?width=1280&height=720&nologo=true&seed=${seed}`;

    // 최종 응답은 반드시 JSON 형태여야 함 (SyntaxError 방지)
    return res.status(200).json({ 
      imageUrl, 
      prompt: generatedPrompt 
    });

  } catch (err: any) {
    console.error("API Error:", err);
    // 서버가 에러가 나도 HTML이 아닌 JSON을 반환하도록 설정
    return res.status(200).json({ 
      error: "이미지 생성 도중 문제가 발생했습니다.",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1280&h=720&auto=format&fit=crop" // 실패 시 기본 이미지 제공
    });
  }
}
