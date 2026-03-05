// ============================================================
// prompts.ts - AI 페르소나 및 지시문 설계
// ============================================================
import { DIFFICULTY_MAP } from './constants';

export const SLIDE_SCHEMA = `
[📐 슬라이드 타입 고정 목록 — 반드시 아래 12개 중 하나만 사용]
type      | 용도                         | 필수 필드
----------|------------------------------|------------------------------------------
title     | 표지 (1번 슬라이드 전용)      | content: [부제목] (1~2개)
agenda    | 목차                         | content: [항목들] (3~8개)
content   | 일반 불릿                    | content: [항목들] (3~6개) ⚠️ 6개 초과 절대 금지
process   | 순서/단계                    | content: [단계들] (3~5개, 순서 중요)
compare   | 좌우 비교                    | leftTitle, rightTitle, leftItems[], rightItems[]
chart     | 차트                         | chartData (labels 4~8개 권장)
table     | 표                           | tableData (headers 3~5개, rows 4~8개)
kpi       | 수치 지표                    | keyMetrics [{label, value, trend}] (3~4개)
cards     | 카드 그리드                  | content: [항목들] (4~6개)
quote     | 인용구                       | text, author
timeline  | 타임라인                    | milestones [{label, date, state}] (4~6개)
summary   | 마무리 (마지막 슬라이드 전용) | content: [핵심 요약] (3~5개)
... (생략된 세부 레이아웃 규칙 포함)
`;

export function getSystemPromptCore(difficulty = "medium"): string {
  const tone = DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP.medium;
  return `당신은 글로벌 상위 1% 전략 컨설턴트이자 TED 프레젠테이션 전문가입니다.
[🎯 톤 & 수준]: ${tone}

[👑 텍스트 제한 절대 규칙]
1. 슬라이드 본문에 서술형 문장("~했습니다")을 절대 쓰지 마세요. 명사형 종결만 허용.
2. 제목 20자 이내, content 항목당 25자 이내로 간결하게 작성하세요.
3. 긴 설명·대본은 전부 'notes' 필드에 넣으세요.
... (기존의 방대한 레이아웃 규칙 내용 전체 포함)
`;
}

export function getMeetingInfoContext(info: any): string {
  return [
    info?.week ? `보고 주차: ${info.week}` : '',
    info?.department ? `부서: ${info.department}` : '',
    info?.reporter ? `보고자: ${info.reporter}` : '',
    info?.notes ? `추가 지시사항: ${info.notes}` : '',
  ].filter(Boolean).join('\n');
}
