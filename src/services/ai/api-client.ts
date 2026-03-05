// ============================================================
// api-client.ts - Gemini 및 외부 이미지 API 연동
// ============================================================

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
): Promise<string> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY 미설정");

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 429) {
      await new Promise((res) => setTimeout(res, RETRY_BASE_MS * Math.pow(2, attempt)));
      continue;
    }

    if (!response.ok) throw new Error(`AI 서버 통신 오류 (${response.status})`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  throw new Error("API 요청 실패");
}

export async function generateSlideImage(title: string, content: string): Promise<string> {
  try {
    // 1. Vercel 백엔드 API(이전에 만든 /api/generate-ai-image.js)로 똑똑한 프롬프트 생성 요청
    const response = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        content: content ? [content] : [], // 백엔드 로직에 맞게 배열 형태로 전송
        type: 'background'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.imageUrl) {
        console.log("✅ 백엔드 AI 이미지 생성 성공:", data.prompt);
        return data.imageUrl;
      }
    }
  } catch (error) {
    console.error("🚨 백엔드 API 호출 실패, 기본 로직으로 대체합니다:", error);
  }

  // 2. 백엔드 API 호출 실패 시 기존의 Fallback 로직 실행 (안전망)
  const fallbackPrompt = `Professional presentation background, corporate minimal, topic: ${title}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999)}&model=flux`;
}
