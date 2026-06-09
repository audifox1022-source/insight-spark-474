// 경로: src/lib/translation-service.ts

import type { TranslationAndAnalysisResponse } from '@/types/translation';
import { callGeminiAPI, streamGeminiAPI } from '@/services/ai/api-client';

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
  return callGeminiAPI(
    "You are a precise language and document processing assistant.",
    prompt,
    8192,
    useSchema ? "application/json" : "text"
  );
}

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
    const base64Content = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const text = await callGeminiAPI(
      "You are an expert OCR and text extractor.",
      [
        { text: "Extract all visible text accurately. Preserve paragraph structure, lists, and line breaks. Return only the pure text." },
        {
          inlineData: {
            mimeType,
            data: base64Content
          }
        }
      ],
      8192,
      "text"
    );

    if (!text) throw new Error('이미지에서 텍스트를 감지하지 못했습니다.');
    
    return text.trim();
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    throw new Error('이미지에서 텍스트를 추출하는 데 실패했습니다.');
  }
};
