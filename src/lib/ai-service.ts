// ============================================================
// src/lib/ai-service.ts (Work AI - High Performance AI Engine)
// [CRITICAL UPGRADE] Multi-Layout Strategy (Timeline, Comparison, Matrix)
// [Standard] 명사형 종결 및 비즈니스 레이아웃 적극 활용 지침 추가
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const MODEL_ROUTING = {
  LAYOUT_UI: "gemini-2.5-flash", 
  LOGIC_SUMMARY: "gemini-2.5-flash",
  REASONSING: "gemini-2.5-flash"
};

export const aiService = {
  async routeAndCall(intent: 'design' | 'analyze' | 'reason', prompt: string, systemPrompt?: string) {
    const modelName = intent === 'design' ? MODEL_ROUTING.LAYOUT_UI : 
                      intent === 'analyze' ? MODEL_ROUTING.LOGIC_SUMMARY : 
                      MODEL_ROUTING.REASONSING;
    
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      });
      const result = await model.generateContent([
        systemPrompt || "당신은 실시간 업무 지원을 위한 최고의 AI 아키텍트입니다.",
        prompt
      ]);
      const response = await result.response;
      
      // [CRITICAL] Truncation 체크
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.");
      }
      
      return response.text();
    } catch (err: any) {
      if (err.message && err.message.includes("중간에 끊겼습니다")) throw err;
      console.error(`[MoA] Model call failed (${modelName}):`, err);
      throw new Error(`AI 모델(${modelName}) 호출에 실패했습니다: ${err.message}`);
    }
  },

  async factCheckContent(text: string) {
    const prompt = `다음 [본문]의 내용을 사실 확인하십시오.\n[본문]\n${text}`;
    return await this.routeAndCall('reason', prompt, "당신은 실시간 팩트체크 전문 에이전트입니다.");
  },

  /** [NEW] analyzeTemplate - 기업 템플릿 분석 엔진 */
  async analyzeTemplate(imageBase64: string) {
    try {
      console.log("🎨 [Engine] Analyzing business template with Gemini 2.5...");
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      });
      
      const systemPrompt = `
        당신은 기업 아이덴티티(CI) 디자이너입니다. 
        제공된 템플릿 이미지에서 주된 브랜드 컬러(Primary Hex Color)와 
        디자인 스타일(미니멀, 화려함 등)을 분석하여 JSON으로 반환하십시오.
        
        [JSON SCHEMA]
        {
          "primaryColor": "#HEX",
          "secondaryColor": "#HEX",
          "style": "string",
          "recommendation": "string"
        }
      `;

      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const result = await model.generateContent([
        systemPrompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      ]);

      const response = await result.response;
      
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.");
      }

      const text = response.text();
      
      // JSON 추출 로직 재활용
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { primaryColor: '#3b82f6' };

    } catch (err: any) {
      if (err.message && err.message.includes("중간에 끊겼습니다")) throw err;
      console.error("Template analysis failed:", err);
      return { primaryColor: '#3b82f6' };
    }
  },

  async generatePresentation({ fileData, template, meetingInfo, settings, approvedOutline }: any) {
    try {
      const slideCount = Array.isArray(approvedOutline) ? approvedOutline.length : (settings?.slideCount || 10);
      
      const systemPrompt = `
        당신은 McKinsey 수석 프레젠테이션 디자이너입니다.
        사용자가 제안한 [목차]를 바탕으로 전문적인 슬라이드를 설계하십시오.

        [LAYOUT SELECTION RULES]
        - **timeline**: 연혁, 사업 단계, 프로젝트 리드타임 설명 시 필수 사용. 한꺼번에 4단계까지 표현 가능.
        - **comparison**: 두 제품의 특징, 전/후 비교, 장점/단점 대비 시 필수 사용. 정확히 2가지 항목 필요.
        - **matrix**: SWOT 분석, 시장 포지셔닝(4사분면), 위험 요소 분석 시 필수 사용. 정확히 4가지 항목 필요.
        - **grid**: 3개 이상의 대등한 정보 나열 시 사용.
        - **cover**: 첫 번째 슬라이드에 사용.

        [TEXT RULES]
        - 모든 텍스트는 **50자 이내 명사형 종결(개조식)** 필수.
        - 서술형 어미(~합니다 등) 사용 절대 금지.

        [JSON SCHEMA]
        {
          "presentation": {
            "title": "전체 제목",
            "slides": [
              {
                "id": "unique_id",
                "title": "슬라이드 제목",
                "subtitle": "통찰력 있는 부제목 (명사형 종결)",
                "layout": "cover | default | split | grid | timeline | comparison | matrix",
                "content": [
                    { "heading": "소주제", "description": "요약 설명" }
                ]
              }
            ]
          }
        }
      `;

      const prompt = `
        [승인된 목차] ${JSON.stringify(approvedOutline)}
        [입력 데이터] ${typeof fileData === 'string' ? fileData.substring(0, 5000) : '데이터 제공됨'}
        [정확한 장수] ${slideCount}장
        
        위 데이터를 바탕으로 신규 레이아웃(timeline, comparison, matrix)을 적극 활용하여 설계하십시오.
      `;

      const response = await this.routeAndCall('design', prompt, systemPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { presentation: { slides: [] } };
    } catch (err) {
      console.error('Presentation Generation failed:', err);
      throw err;
    }
  },

  async getOutline(data: any) {
    const slideCount = data.settings?.slideCount || 10;
    const systemPrompt = `정확히 ${slideCount}개의 슬라이드로 구성된 목차를 작성하십시오. 명사형 종결 필수.`;
    const prompt = `[데이터] ${typeof data.fileData === 'string' ? data.fileData.substring(0, 3000) : '데이터 제공됨'} \n [장수] ${slideCount}`;
    const res = await this.routeAndCall('analyze', prompt, systemPrompt);
    const match = res.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  },

  async regenerateSlide({ slideIndex, currentSlide, presentation, userInstruction }: any) {
    const systemPrompt = "디테일에 강한 시니어 디자이너입니다. 개조식 명사형 종결 필수.";
    const prompt = `현재 데이터: ${JSON.stringify(currentSlide)} \n 요청: ${userInstruction}`;
    const res = await this.routeAndCall('design', prompt, systemPrompt);
    const match = res.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  },

  async editPdfSegment({ text, instruction }: { text: string, instruction: string }) {
    return await this.routeAndCall('analyze', `[본문] ${text} \n [요청] ${instruction}`, "문서 편집 전문가입니다.");
  },

  async translatePdfSegment({ text, targetLang = 'ko' }: { text: string, targetLang?: string }) {
    if (targetLang === 'factcheck') return await this.factCheckContent(text);
    return await this.routeAndCall('analyze', `텍스트: ${text} \n 대상언어: ${targetLang}`, "다국어 번역 전문가입니다.");
  },

  async analyzeImageRegion(imageBase64: string, mode: 'text' | 'chart' | 'ocr', normalize: boolean) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      });

      let instruction = "";
      if (mode === 'text') {
        instruction = "제공된 이미지에서 핵심 텍스트와 내용을 추출하여 2~3줄 이내로 간결하게 요약해 주십시오. (명사형 종결 필수)";
      } else if (mode === 'chart') {
        instruction = "제공된 차트나 표, 시각적 데이터를 분석하여 수치와 핵심 인사이트를 구조화된 형태(개조식)로 문서화해 주십시오.";
      } else if (mode === 'ocr') {
        instruction = "이 이미지에 포함된 모든 텍스트를 글자 그대로 빠짐없이 정확하게 읽어서 반환해 주십시오.";
      }
      
      if (normalize) {
         instruction += "\\n단, 결과물에서 오탈자를 수정하고 문맥이 자연스럽도록 교정한 후 출력해 주십시오.";
      }

      const base64Data = imageBase64.split(',')[1] || imageBase64;
      
      const prompt = `[요청 사항]\\n${instruction}`;
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      ]);
      
      const response = await result.response;
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.");
      }

      return response.text();
    } catch (err: any) {
      if (err.message && err.message.includes("중간에 끊겼습니다")) throw err;
      console.error(`[Vision Analysis Failed]`, err);
      throw new Error("이미지 분석 중 오류가 발생했습니다.");
    }
  }
};
