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
  // Imagen 또는 Pollinations 로직 구현 (원본 로직 유지)
  const prompt = `Professional presentation background, corporate minimal, topic: ${title}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999)}&model=flux`;
}
