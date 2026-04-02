// 경로: src/lib/translation-service.ts

import type { TranslationAndAnalysisResponse } from '@/types/translation';

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
  
  // ── [Safe Nested Access] ──
  if (!data?.candidates || data.candidates.length === 0) {
    throw new Error("AI 대답 데이터가 비어 있습니다.");
  }
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("AI 결과 파트가 비어 있습니다.");
  }
  return parts?.[0]?.text ?? "";
}

import { streamGeminiAPI } from '@/services/ai/api-client';

export const analyzeAndTranslate = async (
  text: string, 
  targetLanguage: string, 
  onChunk?: (text: string) => void
): Promise<TranslationAndAnalysisResponse> => {
  try {
    const systemPrompt = `You are a world-class professional translation assistant, "번역의 정석".
Analyze the text below and provide a response in a single JSON object adhering to the schema.
Your tasks are:
1. Detect Domain & Language
2. Translate with Markdown into ${targetLanguage}
3. Comprehensive Terminology Analysis
4. Analyze Context & Style

[⭐ 중요: 응답 스키마 강제]
반드시 아래의 JSON Key 구조를 한 글자도 틀리지 말고 정확하게 지켜라:
{
  "translation": "...",
  "sourceLanguage": "...",
  "detectedDomain": "...",
  "contextAnalysis": [ { "koreanTerm": "...", "suggestedTranslation": "...", "alternatives": "..." } ],
  "terminologyAnalysis": [ { "koreanTerm": "...", "englishTerm": "...", "description": "..." } ],
  "styleAnalysis": { "formality": "...", "tone": "...", "consistencyScore": 0, "feedback": "..." }
}
`;

    const userPrompt = `Text to analyze:\n---\n${text}\n---`;

    const responseText = await streamGeminiAPI(systemPrompt, userPrompt, onChunk);
    
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();
    else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/```/g, '').trim();
    
    return JSON.parse(cleanText || '{}');
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

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

    const base64Content = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const payload = {
      contents: [
        {
          parts: [
            { text: "You are an expert OCR and text extractor. Extract all text visible in this image accurately. Preserve paragraph structure, lists, and line breaks where appropriate. Do NOT add any markdown formatting like ``` or extra explanations. Just return the pure text." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Content
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('AI Vision 서버 통신 오류');
    const data = await response.json();

    // ── [Safe Nested Access] ──
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('이미지에서 텍스트를 감지하지 못했습니다.');
    
    return text.trim();
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    throw new Error('이미지에서 텍스트를 추출하는 데 실패했습니다.');
  }
};
