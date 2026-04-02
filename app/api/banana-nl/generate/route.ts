// ============================================================
// app/api/banana-nl/generate/route.ts 
// [Enterprise] BANANA NL Presentation Generation Bridge
// [Next.js] App Router API Route - Google Gemini 2.5 Flash
// [AI Engine] Visual Design Director Mode + Strict JSON Output
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * [MASTER DIRECTOR PROMPT]
 * 수석 UI/UX 디자인 디렉터 역할을 부여하여 최적화된 시각적 테마와 슬라이드 구성을 유도합니다.
 */
const SYSTEM_DIRECTOR_PROMPT = `
당신은 탁월한 시각적 직관력과 트렌디한 감각을 지닌 '수석 UI/UX 디자인 디렉터'이자 '콘텐츠 구성 전문가'입니다. 
사용자가 입력한 자료의 본질을 파악하여 최적화된 시각적 테마와 슬라이드 구성을 설계하십시오. 

반드시 아래의 JSON 스키마를 따르는 순수한 JSON 문자열만 출력해야 하며 마크다운 코드 블록은 제외하십시오. 
슬라이드 개수는 사용자의 입력량에 따라 3~7개 사이로 적절히 분할하십시오.

JSON Schema:
{
  "styleName": "string",
  "theme": {
    "backgroundColor": "string",
    "textColor": "string",
    "accent1": "string"
  },
  "slides": [
    {
      "slideNumber": "number",
      "title": "string",
      "coreContent": "string"
    }
  ]
}
`;

/**
 * Next.js 14+ App Router POST Handler
 */
export async function POST(req: NextRequest) {
  try {
    // 1. API Key Validation
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[BANANA NL] Missing GEMINI_API_KEY in environment variables.");
      return NextResponse.json(
        { error: "Internal Server Error: API Configuration is missing." },
        { status: 500 }
      );
    }

    // 2. Request Body Extraction
    const body = await req.json();
    const { documentText } = body;

    if (!documentText || typeof documentText !== 'string') {
      return NextResponse.json(
        { error: "Bad Request: 'documentText' is required and must be a string." },
        { status: 400 }
      );
    }

    // 3. Gemini Model Initialization
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // System instructions pour injecter le rôle du Master Director
      systemInstruction: SYSTEM_DIRECTOR_PROMPT,
      // Active Strict JSON Mode pour garantir un format valide
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // 4. Content Generation
    console.log(`[BANANA NL] Generating presentation for input length: ${documentText.length}`);
    const result = await model.generateContent(documentText);
    const response = await result.response;
    let text = response.text();

    /**
     * 5. Data Sanitization & Parsing
     * 마크다운 백틱 (```json) 잔여물을 제거하고 안전하게 파싱합니다.
     */
    try {
      // Nettoyage des éventuels backticks markdown
      const sanitizedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedData = JSON.parse(sanitizedText);

      // Return the structured presentation data
      return NextResponse.json(parsedData, { status: 200 });
    } catch (parseError) {
      console.error("[BANANA NL] JSON Parsing Error:", parseError);
      console.log("[BANANA NL] Raw response was:", text);
      return NextResponse.json(
        { error: "AI Engine returned invalid JSON format. Please try again." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[BANANA NL] Generation Flow Error:", error);
    return NextResponse.json(
      { error: "AI Generation failed unexpectedly.", details: error.message },
      { status: 500 }
    );
  }
}
