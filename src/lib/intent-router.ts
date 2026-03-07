// ============================================================
// src/lib/intent-router.ts
// Feature 4: Intent Router — 자연어 → 편집 의도 분류기
// ============================================================
import { callGeminiAPI } from '@/services/ai/api-client';

export type IntentType =
  | 'edit_text'       // 텍스트 내용 수정
  | 'change_layout'   // 레이아웃/구조 변경
  | 'change_design'   // 색상/디자인 변경
  | 'split_slide'     // 슬라이드 분할 요청
  | 'add_citation'    // 출처/팩트체크 요청
  | 'general_edit';   // 기타 일반 편집

export interface IntentResult {
  intent: IntentType;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
}

// 키워드 기반 빠른 분류 (API 호출 전 fast-path)
function fastClassify(message: string): IntentType | null {
  const lower = message.toLowerCase();

  // 분할 관련 키워드
  if (/분할|나눠|나누|분리|split|두\s*장/.test(lower)) return 'split_slide';

  // 출처/팩트체크 키워드
  if (/출처|citation|팩트|사실|검증|확인|grounding/.test(lower)) return 'add_citation';

  // 디자인/색상 키워드
  if (/색상|컬러|배경|이미지|디자인|색깔|color|background|gradien/.test(lower)) return 'change_design';

  // 레이아웃 키워드
  if (/레이아웃|배치|구조|위치|정렬|컬럼|column|layout|split|나란히/.test(lower)) return 'change_layout';

  // 텍스트 수정 키워드
  if (/제목|내용|텍스트|글자|수정|변경|고쳐|바꿔|줄여|늘려|추가|삭제/.test(lower)) return 'edit_text';

  return null; // API 분류 필요
}

// ─────────────────────────────────────────────────────────
// Intent 분류 (fast-path 우선, 실패 시 AI 호출)
// ─────────────────────────────────────────────────────────
export async function classifyIntent(userMessage: string): Promise<IntentResult> {
  // 1차: 키워드 기반 즉각 분류
  const fastIntent = fastClassify(userMessage);
  if (fastIntent) {
    return { intent: fastIntent, confidence: 'high', summary: getIntentLabel(fastIntent) };
  }

  // 2차: AI 기반 정밀 분류 (512 token 경량 호출)
  try {
    const systemInstruction = '당신은 사용자의 슬라이드 편집 요청을 분류하는 Intent Router입니다.';
    const userPrompt = `사용자가 다음 메시지를 보냈습니다: "${userMessage}"

이 요청이 아래 중 어떤 의도인지 분류하세요:
- edit_text: 제목, 내용 텍스트 수정
- change_layout: 레이아웃, 구조, 배치 변경  
- change_design: 색상, 이미지, 디자인 변경
- split_slide: 슬라이드 분할 요청
- add_citation: 출처, 팩트체크 요청
- general_edit: 기타

JSON 반환: {"intent": "edit_text", "confidence": "high", "summary": "텍스트 편집 요청"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 256);
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return {
      intent: (json.intent as IntentType) ?? 'general_edit',
      confidence: json.confidence ?? 'medium',
      summary: json.summary ?? getIntentLabel(json.intent),
    };
  } catch {
    return { intent: 'general_edit', confidence: 'low', summary: '일반 편집' };
  }
}

// Intent 한국어 라벨
export function getIntentLabel(intent: IntentType): string {
  const labels: Record<IntentType, string> = {
    edit_text: '📝 텍스트 수정',
    change_layout: '📐 레이아웃 변경',
    change_design: '🎨 디자인 변경',
    split_slide: '✂️ 슬라이드 분할',
    add_citation: '🔍 팩트체크 & 출처 추가',
    general_edit: '✏️ 일반 편집',
  };
  return labels[intent] ?? '일반 편집';
}

// Intent → 아이콘 이모지
export function getIntentIcon(intent: IntentType): string {
  const icons: Record<IntentType, string> = {
    edit_text: '📝',
    change_layout: '📐',
    change_design: '🎨',
    split_slide: '✂️',
    add_citation: '🔍',
    general_edit: '✏️',
  };
  return icons[intent] ?? '✏️';
}
