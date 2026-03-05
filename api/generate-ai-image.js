// api/generate-ai-image.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { title, content, type, brandSettings } = req.body;
    
    // 1. Gemini를 사용하여 슬라이드 분석 및 이미지 묘사(프롬프트) 생성
    // 모델을 최신 버전인 gemini-3-flash로 설정 (또는 gemini-3.1-pro)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    const analysisPrompt = `
      Presentation Slide Analysis:
      Title: "${title}"
      Content: "${content?.join(', ')}"
      
      Task: Create a highly detailed English image generation prompt for a ${type === 'background' ? 'background' : 'visual element'}.
      Style: Professional, high-end business, ${brandSettings?.companyName || 'modern'}.
      Color Theme: Primary color is #${brandSettings?.primaryColor || '1B3A5C'}.
      Rules: No text in image. Cinematic lighting. 8k resolution.
      Output: Return only the prompt string in English.
    `;

    const result = await model.generateContent(analysisPrompt);
    const prompt = result.response.text();

    // 2. 이미지 생성 엔진 호출 (여기서는 Pollinations AI를 예시로 사용, 실제 DALL-E 3나 Imagen 3로 교체 가능)
    const seed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&nologo=true`;

    res.status(200).json({ imageUrl, prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
