// ============================================================
// src/services/ai/api-client.ts - Gemini 연동 (Grounding 지원 버전)
// ============================================================

const PROXY_URL = '/api/gemini-proxy';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

// ─────────────────────────────────────────────────────────
// 기본 Gemini API 호출 (JSON 모드)
// ─────────────────────────────────────────────────────────
export async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
): Promise<string> {
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

// ─────────────────────────────────────────────────────────
// ✅ 딥 리서치: Google Search Grounding 활성화 버전
// groundingMetadata에서 출처 URL을 파싱해 Citation 배열로 반환
// ─────────────────────────────────────────────────────────
export interface GroundingResult {
  text: string;
  citations: { index: number; url: string; title: string }[];
}

export async function callGeminiAPIWithGrounding(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<GroundingResult> {
  const payload = {
    model: 'gemini-2.5-flash',
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    tools: [{ googleSearch: {} }],  // ✅ Google Search grounding 활성화
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    },
  };

  let lastError: Error = new Error("딥 리서치 오류가 발생했습니다.");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 429 || response.status === 503) {
        await new Promise((res) => setTimeout(res, RETRY_BASE_MS * Math.pow(2, attempt)));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`딥 리서치 서버 오류 (${response.status}): ${errorData.error || '알 수 없음'}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? '';

      // groundingMetadata → groundingChunks 에서 출처 URL 파싱
      const groundingChunks: any[] =
        candidate?.groundingMetadata?.groundingChunks ?? [];

      const citations = groundingChunks
        .map((chunk: any, idx: number) => ({
          index: idx + 1,
          url: chunk?.web?.uri ?? '',
          title: chunk?.web?.title ?? `출처 ${idx + 1}`,
        }))
        .filter((c) => c.url);

      return { text, citations };

    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((res) => setTimeout(res, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────────────────
// AI 이미지 생성 (슬라이드 배경용)
// ─────────────────────────────────────────────────────────
export async function generateSlideImage(title: string, content: string): Promise<string> {
  try {
    const response = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        content: content ? [content] : [],
        type: 'background'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.imageUrl) return data.imageUrl;
    }
  } catch (error) {
    console.error("🚨 백엔드 API 호출 실패:", error);
  }

  const fallbackPrompt = `Professional presentation background, minimal, topic: ${title}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999)}&model=flux`;
}
