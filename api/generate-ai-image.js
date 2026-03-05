// api/generate-ai-image.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*'); // 프로덕션에서는 특정 도메인으로 제한 권장
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, content, type, brandSettings } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY missing");
      return res.status(500).json({ error: "서버 API 키가 없습니다." });
    }

    // 2. Gemini 초기화 (최신 flash 모델 권장)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 방어 로직: content가 배열인지, 문자열인지, 없는지 확인
    const safeContent = Array.isArray(content) 
      ? content.join(', ') 
      : (typeof content === 'string' ? content : '');

    const analysisPrompt = `
      Create a high-quality English image generation prompt for a ${type === 'background' ? 'professional presentation background' : 'visual illustration'}.
      Slide Title: "${title || 'Presentation'}"
      Slide Content: "${safeContent}"
      Style: Modern Business, Clean, 4k, Minimalist.
      Brand Color: #${brandSettings?.primaryColor || '3B82F6'}.
      Rule: No text, no letters, no watermark.
      Return ONLY the prompt string.
    `;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const generatedPrompt = response.text().trim();

    // 3. 이미지 생성 URL 구축 (Pollinations AI)
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(generatedPrompt)}?width=1280&height=720&nologo=true&seed=${seed}`;

    // 4. JSON 응답 반환
    return res.status(200).json({ 
      imageUrl: imageUrl, 
      prompt: generatedPrompt 
    });

  } catch (err) {
    console.error("API Error:", err.message);
    // 프론트엔드 크래시 방지를 위한 Fallback 처리
    return res.status(200).json({ 
      error: "이미지 생성 실패",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1280&h=720&auto=format&fit=crop"
    });
  }
};
