// api/generate-ai-image.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, content, type, brandSettings } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("환경변수 GEMINI_API_KEY가 없습니다.");
      return res.status(500).json({ error: "서버 설정 오류: API 키가 없습니다." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 가장 호환성이 높은 모델명 사용
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const analysisPrompt = `
      Create a high-quality English image generation prompt for a ${type === 'background' ? 'professional presentation background' : 'visual illustration'}.
      Slide Title: "${title}"
      Slide Content: "${content ? content.join(', ') : ''}"
      Style: Modern Business, Clean, 4k, Minimalist.
      Brand Color: #${brandSettings?.primaryColor || '3B82F6'}.
      Rule: No text, no letters, no watermark.
      Return ONLY the prompt string.
    `;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const generatedPrompt = response.text().trim();

    // 이미지 생성 URL (Pollinations AI)
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(generatedPrompt)}?width=1280&height=720&nologo=true&seed=${seed}`;

    // ✅ 반드시 JSON 형식으로 응답
    return res.status(200).json({ 
      imageUrl, 
      prompt: generatedPrompt 
    });

  } catch (err) {
    console.error("API 실행 에러:", err.message);
    // 에러 발생 시에도 HTML이 아닌 JSON을 반환하여 프론트엔드 충돌 방지
    return res.status(200).json({ 
      error: "이미지 생성 실패",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1280&h=720&auto=format&fit=crop"
    });
  }
}
