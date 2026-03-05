// ============================================================
// src/services/ai/api-client.ts - Gemini 및 외부 이미지 API 연동
// (보안 패치: Vercel 프록시 통합 버전)
// ============================================================

const PROXY_URL = '/api/gemini-proxy';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
): Promise<string> {
  // 프록시 서버로 보낼 페이로드 구성
  const payload = {
    model: 'gemini-2.5-flash', 
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };

  let lastError: Error = new Error("알 수 없는 오류가 발생했습니다.");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 429 || response.status === 503) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AI 서버 통신 오류 (${response.status}): ${errorData.error || '알 수 없음'}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text?.trim()) {
        throw new Error("AI가 빈 응답을 반환했습니다.");
      }

      return text;

    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((res) => setTimeout(res, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export async function generateSlideImage(title: string, content: string): Promise<string> {
  try {
    const response = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        content: content ? [content] : [], 
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

  const fallbackPrompt = `Professional presentation background, corporate minimal, topic: ${title}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999)}&model=flux`;
}
