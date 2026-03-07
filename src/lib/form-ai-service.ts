// ============================================================
// form-ai-service.ts — Edge Function 프록시 방식으로 수정
// VITE_GEMINI_API_KEY 완전 제거 → callGemini() 사용
// ============================================================

import { callGemini, type GeminiPayload } from '@/lib/gemini-client'

// ============================================================
// ✅ 핵심 교체: callGeminiAPI → Edge Function 프록시 사용
//    VITE_GEMINI_API_KEY 완전 제거
// ============================================================
async function callGeminiAPI(
  systemInstruction: string,
  userPrompt:        string,
  maxTokens = 8192
): Promise<string> {
  const payload: GeminiPayload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature:     0.2,   // form-ai-service는 0.2 유지 (정확도 우선)
      maxOutputTokens: maxTokens,
    },
  }
  return callGemini(payload)
}

export const formAiService = {
  /**
   * 양식명 + 요청사항을 받아 완전한 HTML 양식 파일을 생성합니다.
   */
  async generateForm(formName: string, requirements: string): Promise<string> {
    const systemInstruction = `You are an expert in generating professional document structures in Markdown format.
Your task is to create a well-structured Markdown document based on the user's request.
Adhere strictly to the following rules:
1. Output ONLY raw Markdown text.
2. DO NOT include any HTML, CSS, JavaScript, or any code blocks (e.g., \`\`\`markdown).
3. Use standard Markdown elements like headers, lists, tables, and bold text for structure.
4. Maintain a professional and formal tone suitable for business documents.`

    const userPrompt = `You are an expert form/document generator.
Create a professional structure for "${formName}".
Requirements: ${requirements || 'Standard professional format.'}

IMPORTANT RULES:
1. Provide the output in strictly raw Markdown (.md) format.
2. DO NOT use HTML, CSS, or Tailwind.
3. Use Markdown tables, headers, lists, and bold text for structure.
4. Output ONLY the markdown text. No code blocks or preamble.`

    const html = await callGeminiAPI(systemInstruction, userPrompt, 32768)

    // HTML 코드블록 제거 (AI가 마크다운으로 감쌀 경우)
    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/i,     '')
      .trim()
  },

  /**
   * 생성된 양식을 수정 요청합니다.
   */
  async modifyForm(currentHtml: string, modifyRequest: string): Promise<string> {
    const systemInstruction = `You are an expert in modifying Markdown documents.
Your task is to revise an existing Markdown document based on the user's modification request.
Adhere strictly to the following rules:
1. Output ONLY the fully updated document in raw Markdown text.
2. DO NOT include any HTML, CSS, JavaScript, or any code blocks (e.g., \`\`\`markdown).
3. Maintain the professional tone and structure of the original document.`

    const userPrompt = `Modify the following Markdown document based on this request: "${modifyRequest}".

Current Document:
"""
${currentHtml}
"""

RULES:
1. Return the fully updated document in pure Markdown.
2. DO NOT use HTML or CSS.
3. Keep the professional tone and structure intact.
4. Output ONLY the raw markdown text. No explanations.`

    const html = await callGeminiAPI(systemInstruction, userPrompt, 32768)

    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/i,     '')
      .trim()
  },
}

