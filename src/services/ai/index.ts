// ============================================================
// index.ts - 서비스 인터페이스 (총괄 디렉터)
// ============================================================
import * as constants from './constants';
import * as utils from './utils';
import * as prompts from './prompts';
import { callGeminiAPI, generateSlideImage } from './api-client';

export const aiService = {
  async getOutline(body: any) {
    const volume = body.settings?.volume || "standard";
    const targetCount = constants.SLIDE_COUNT_MAP[volume] ?? 8;
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${constants.VOLUME_MAP[volume]}\n${prompts.getMeetingInfoContext(body.meetingInfo)}\n[미션] ${targetCount}개 슬라이드 목차 생성\n[데이터]: ${utils.truncateFileData(body.fileData)}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.OUTLINE_TOKEN_MAP[volume]);
    return { outline: utils.extractJSON(text) };
  },

  async generateSlides(body: any) {
    const volume = body.settings?.volume || "standard";
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${prompts.SLIDE_SCHEMA}\n${prompts.getMeetingInfoContext(body.meetingInfo)}\n목차: ${JSON.stringify(body.outline)}\n데이터: ${utils.truncateFileData(body.fileData)}\nJSON 반환: {"title":"전체제목","slides":[...]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume]);
    const json = utils.extractJSON(text);
    return { presentation: json };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `[미션] 아래 슬라이드 재작성\n현재: ${JSON.stringify(body.currentSlide)}\n요청: ${body.userInstruction}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  generateImage: generateSlideImage,
  
  // 나머지 review, analyzeInfographic 등도 동일한 방식으로 구성
};
