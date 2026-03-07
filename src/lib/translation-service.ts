// 경로: src/lib/translation-service.ts
import type { TranslationAndAnalysisResponse } from '@/types/translation';
import { extractJSON } from '@/services/ai/utils';

// JSON Schema Definition for REST API
const analysisSchema = {
  type: "OBJECT",
  properties: {
    translation: { type: "STRING", description: "The complete, professional translation." },
    sourceLanguage: { type: "STRING", description: "The detected source language." },
    detectedDomain: { type: "STRING", description: "The detected professional domain." },
    contextAnalysis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          koreanTerm: { type: "STRING" },
          suggestedTranslation: { type: "STRING" },
          alternatives: { type: "STRING" }
        },
        required: ["koreanTerm", "suggestedTranslation", "alternatives"]
      }
    },
    terminologyAnalysis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          koreanTerm: { type: "STRING" },
          englishTerm: { type: "STRING" },
          description: { type: "STRING" }
        },
        required: ["koreanTerm", "englishTerm", "description"]
      }
    },
    styleAnalysis: {
      type: "OBJECT",
      properties: {
        formality: { type: "STRING" },
        tone: { type: "STRING" },
        consistencyScore: { type: "INTEGER" },
        feedback: { type: "STRING" }
      },
      required: ["formality", "tone", "consistencyScore", "feedback"]
    }
  },
  required: ["translation", "sourceLanguage", "detectedDomain", "contextAnalysis", "terminologyAnalysis", "styleAnalysis"]
};

// 범용 Gemini API 호출 함수
async function callGemini(prompt: string, useSchema: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    }
  };

  if (useSchema) {
    payload.generationConfig.responseMimeType = "application/json";
    payload.generationConfig.responseSchema = analysisSchema;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("AI 서버 통신 오류");
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const analyzeAndTranslate = async (text: string, targetLanguage: string): Promise<TranslationAndAnalysisResponse> => {
  try {
    const prompt = `You are a world-class professional translation assistant, "번역의 정석".
Analyze the text below and provide a response in a single JSON object adhering to the schema.
Your tasks are:
1. Detect Domain & Language
2. Translate accurately into ${targetLanguage}
3. Comprehensive Terminology Analysis
4. Analyze Context & Style

CRITICAL RULE FOR TRANSLATION:
- STRICTLY PRESERVE all Markdown formatting syntax from the source text.
- Do NOT translate, modify, or remove characters like \`**\`, \`*\`, \`#\`, \`-\`, \`>\`, \`[\`, \`]\`, \`(\`, \`)\` or code blocks (\`\`\`).
- If the source is \`**Hello**\`, the output must be \`**안녕하세요**\` (if target is Korean), NOT \`안녕하세요\`.
- All string values must be properly escaped for JSON. Do NOT include unescaped newlines or control characters.

Text to analyze:
---
${text}
---`;

    const jsonString = await callGemini(prompt, true);
    return extractJSON(jsonString);
  } catch (error) {
    console.error("Error in analyzeAndTranslate:", error);
    throw new Error("분석 및 번역에 실패했습니다.");
  }
};

export const reverseTranslate = async (text: string, sourceLanguage: string): Promise<string> => {
  try {
    const prompt = `Translate the following text back to ${sourceLanguage}. Provide only the ${sourceLanguage} translation. Preserve any markdown formatting.\n\nText: "${text}"`;
    return await callGemini(prompt, false);
  } catch (error) {
    console.error("Error in reverseTranslate:", error);
    throw new Error("역번역에 실패했습니다.");
  }
};

export const structureTextAsMarkdown = async (content: string, fileType: string): Promise<string> => {
  try {
    const prompt = `You are a text structuring expert. Extract content from this ${fileType} file and convert it to clean Markdown. Output ONLY the Markdown text.
Content:
---
${content}
---`;
    const text = await callGemini(prompt, false);
    return text.replace(/```(?:markdown)?\s*([\s\S]*?)\s*```/, '$1').trim();
  } catch (error) {
    console.error("Error in structureTextAsMarkdown:", error);
    throw new Error("문서 구조화에 실패했습니다.");
  }
};
