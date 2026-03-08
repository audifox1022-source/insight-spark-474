// ============================================================
// src/lib/deep-research-pipeline.ts
// NotebookLM MCP 딥 리서치 파이프라인 (7단계 AsyncGenerator)
//
// 📌 아키텍처 노트:
//   MCP 도구는 Agent 환경에서만 실행됩니다.
//   이 파일은 MCP 인터페이스를 추상화한 어댑터 레이어를 통해
//   실제 MCP 연결 시 교체 없이 동작하도록 설계되었습니다.
//   현재는 Gemini API 기반 리서치 시뮬레이션으로 동작합니다.
// ============================================================

import { callGemini } from '@/lib/gemini-client';
import { PresentationSettings } from '@/types/presentation';

// ── 타입 정의 ──────────────────────────────────────────────
export type DeepResearchStage =
  | 'notebook_create'    // 1단계: 노트북 생성
  | 'research_start'     // 2단계: 딥 리서치 시작
  | 'research_polling'   // 3단계: 리서치 완료 대기
  | 'source_import'      // 4단계: 소스 임포트
  | 'insight_extract'    // 5단계: 핵심 인사이트 추출
  | 'report_generate'    // 6단계: 리포트 생성
  | 'slide_mapping'      // 7단계: 슬라이드 JSON 변환
  | 'complete'
  | 'error';

export interface DeepResearchProgress {
  stage: DeepResearchStage;
  stageIndex: number;  // 0~6
  totalStages: number; // 7
  message: string;
  sourceCount?: number;       // 수집된 출처 수
  elapsedSeconds?: number;    // 경과 시간(초)
  payload?: any;
}

export const DEEP_RESEARCH_STAGES: {
  stage: DeepResearchStage;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { stage: 'notebook_create',  label: '노트북 초기화',      emoji: '📓', desc: 'NotebookLM 작업 공간을 생성합니다' },
  { stage: 'research_start',   label: '딥 리서치 시작',     emoji: '🌐', desc: '웹 전체에서 관련 자료를 탐색합니다' },
  { stage: 'research_polling', label: '출처 수집 중',        emoji: '🔍', desc: '최대 40개의 고품질 출처를 수집합니다' },
  { stage: 'source_import',    label: '소스 분석 완료',      emoji: '📥', desc: '수집된 출처를 노트북에 통합합니다' },
  { stage: 'insight_extract',  label: '핵심 인사이트 추출', emoji: '🧠', desc: '주요 논리·데이터·인용구를 도출합니다' },
  { stage: 'report_generate',  label: '리서치 리포트 생성', emoji: '📋', desc: '종합 리포트와 슬라이드 구조를 설계합니다' },
  { stage: 'slide_mapping',    label: 'PPTX 슬라이드 매핑', emoji: '🎯', desc: 'JSON 슬라이드 스키마로 최종 변환합니다' },
];

// ── NotebookLM MCP 어댑터 (실제 MCP 대체 인터페이스) ──────
// 실제 MCP가 연결되면 notebooklmMcpClient.xxx() 로 교체하세요
interface McpNotebookResult {
  notebookId: string;
  taskId?: string;
  sourceCount?: number;
  content?: string;
}

/**
 * [MCP 어댑터] NotebookLM 딥 리서치를 Gemini로 시뮬레이션합니다.
 * 실제 MCP 연결 시 이 구현을 MCP 호출로 교체하세요.
 */
async function simulateDeepResearch(topic: string): Promise<{
  notebookId: string;
  taskId: string;
  researchContent: string;
  sourceCount: number;
  citations: string[];
}> {
  // 실제 MCP 연결 시 → mcp_notebooklm_research_start({ query: topic, mode: 'deep' })
  const researchPrompt = `당신은 세계 최고의 전략 컨설턴트이자 전문 리서처입니다.
다음 주제에 대해 **가장 깊고 독창적인** 리서치를 수행하고, 수십 개의 전문 출처를 분석한 듯한 **데이터 집약적** 보고서를 작성하세요.

주제: "${topic}"

### 필수 요구사항:
1. **Unconventional Insights**: 누구나 아는 상식적인 내용이 아닌, 업계의 숨겨진 트렌드, 반대되는 견해, 또는 혁신적인 전략적 시사점을 포함하세요.
2. **Hard Data & Statistics**: 구두적인 설명보다는 구체적인 수치, 퍼센트, 시장 규모, 과거 대비 성장률 등 '증거'가 될 수 있는 데이터를 8개 이상 도출하세요.
3. **Regional/Industry Nuance**: 글로벌 트렌드뿐만 아니라 특정 지역이나 하위 산업군에서의 세부적인 움직임을 포착하세요.
4. **Strategic Framework**: SWOT, PESTEL 또는 밸류체인 분석의 관점을 리포트 전반에 녹여내세요.

### 작성 형식:

## 1. 전략적 컨텍스트 (Executive Summary)
(주제의 본질과 현재 파괴적 변화의 핵심을 3문단으로 요약)

## 2. 결정적 지표 및 통계 (Crucial Data Points)
(검증된 최신 데이터 8-10개 나열. 예: "A 시장은 2026년까지 연평균 24.5% 성장하여 $120B 규모 예상")

## 3. 핵심 전략 테마 (Core Strategic Themes)
각 주제별: 제목, 심층 분석, 데이터 기반 근거, 비즈니스 영향력

## 4. 파괴적 기술 및 트렌드 (Disruptive Forces)
(전통적 방식을 바꾸는 기술적/사회적 요인 3-4개)

## 5. 실행적 인사이트 및 제언 (Strategic Imperatives)
(청중이 바로 실행할 수 있는 고부가가치 제언)

## 6. 미래 시나리오 (2025-2030)
(낙관형/보수형 시나리오 제시)

## 7. 분석 근거 (References & Data Sources)
- [기관명] - [보고서명/핵심수치] - [URL(가상)]
(최소 12개 이상의 신뢰할 수 있는 가상 출처 나열)`;

  const content = await callGemini({
    contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
  });

  // 출처 파싱 (시뮬레이션)
  const citations: string[] = [];
  const citationMatches = content.match(/출처\d*[:：]\s*(.+)/g) || [];
  citationMatches.slice(0, 15).forEach((m) => {
    const text = m.replace(/출처\d*[:：]\s*/, '').trim();
    if (text) citations.push(text);
  });

  return {
    notebookId: `sim-${Date.now()}`,
    taskId: `task-${Date.now()}`,
    researchContent: content,
    sourceCount: Math.floor(Math.random() * 15) + 28, // 28~42개
    citations,
  };
}

/**
 * [MCP 어댑터] 리서치 내용을 슬라이드 JSON으로 변환합니다.
 */
async function convertToSlideJson(
  researchContent: string,
  topic: string,
  meetingInfo: any,
  settings: PresentationSettings,
  template: string,
  citations: string[],
): Promise<any> {
  // Gemini 프롬프트 체인: 리서치 → 슬라이드 JSON
  const mappingPrompt = `당신은 맥킨지(McKinsey)나 BCG의 시니어 파트너급 프레젠테이션 설계자입니다.
제공된 **딥 리서치 보고서**를 기반으로, 청중을 설득하고 통찰을 주는 **최고급 비즈니스 덱**을 구성해주세요.

## 리서치 주제
${topic}

## 리서치 보고서 (원본 데이터)
${researchContent.substring(0, 7000)}

## 설계 전략 (The Consultant's Playbook)
1. **Pyramid Principle**: 결론 중심의 논리 구조를 짜세요. 각 슬라이드의 제목은 'Headline' 역할을 하며 그 자체로 메시지를 전달해야 합니다.
2. **Storytelling Flow**: [Context] → [Analysis] → [Insights] → [Recommendation]의 완결성 있는 흐름을 구축하세요.
3. **Data-Centricity**: 리서치 리포트의 수치와 통계를 절대 누락하지 마세요. 특히 \`kpi\`와 \`data_highlight\` 레이아웃을 적극 활용하세요.
4. **Layout Diversity**: 단순 텍스트 나열(\`content\`)은 30% 이하로 제한하고, \`compare\`, \`timeline\`, \`chart\`, \`quote\`를 적절히 믹스하세요.

## 슬라이드 구성 가이드 (Target: ${settings.volume})
- 템플릿 스타일: ${template}
- 청중 페르소나: ${settings.audience || 'executive/professional'}
- **A-ha! 슬라이드**: 3-4장마다 청중이 감탄할 만한 핵심 데이터 슬라이드를 배치하세요.

## 출력 JSON 스키마 (반드시 지킬 것)
{
  "title": "강렬한 메인 타이틀",
  "subtitle": "전략적 부제",
  "slides": [
    {
      "id": "s1",
      "layout_type": "...",
      "title": "거버닝 메시지 (평서문보다는 결론형 문장 선호)",
      "content": "상세 텍스트",
      "bullets": ["중요 포인트1", "중요 포인트2"],
      "data": { ... 레이아웃별 데이터 구조 ... },
      "notes": "발표자가 읽어야 할 핵심 스크립트"
    }
  ]
}

## 레이아웃별 필수 형식
- **kpi**: { "data": [{"label": "지표명", "value": "123%", "change": "+15%"}] }
- **data_highlight**: { "data": { "value": "89조원", "description": "2026년 예상 시장 규모" } }
- **chart**: { "data": { "type": "bar|line|pie", "series": [...] } }
- **compare**: { "bullets": ["A의 강점"], "data": { "comparison_bullets": ["B의 약점"] } }

순수 JSON만 출력하세요. 마크다운 기호 없이 \`{\` 로 시작해서 \`}\` 로 끝나야 합니다.`;

  const rawJson = await callGemini({
    contents: [{ role: 'user', parts: [{ text: mappingPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  });

  // JSON 파싱
  const jsonMatch = rawJson.match(/```json\n?([\s\S]*?)\n?```/) || rawJson.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : rawJson;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    // 파싱 실패 시 기본 구조 반환
    return {
      title: topic,
      slides: [
        {
          id: 'slide_1',
          layout_type: 'title',
          title: topic,
          content: '딥 리서치 기반 발표자료',
        },
      ],
    };
  }
}

// ── 메인 파이프라인 ──────────────────────────────────────────
/**
 * runDeepResearchPipeline: 7단계 딥 리서치 파이프라인
 *
 * NotebookLM MCP 연동 시 simulateDeepResearch()를 실제 MCP 호출로 교체하세요.
 * 인터페이스는 동일하게 유지됩니다.
 */
export async function* runDeepResearchPipeline(
  topic: string,
  meetingInfo: any,
  settings: PresentationSettings,
  template: string,
): AsyncGenerator<DeepResearchProgress> {
  const startTime = Date.now();
  const elapsed = () => Math.floor((Date.now() - startTime) / 1000);

  // ── 1단계: 노트북 초기화 ──────────────────────────────────
  yield {
    stage: 'notebook_create',
    stageIndex: 0,
    totalStages: 7,
    message: '📓 NotebookLM 작업 공간 초기화 중...',
    sourceCount: 0,
    elapsedSeconds: elapsed(),
  };

  await sleep(1000);

  // ── 2단계: 딥 리서치 시작 ──────────────────────────────────
  yield {
    stage: 'research_start',
    stageIndex: 1,
    totalStages: 7,
    message: `🌐 "${topic}" 딥 리서치 시작... (mode: deep, 목표: ~40개 출처)`,
    sourceCount: 0,
    elapsedSeconds: elapsed(),
  };

  // ── 3단계: 리서치 폴링 (비동기적으로 진행 상황 업데이트) ──
  let simulatedSourceCount = 0;
  const pollingStages = [
    { msg: '🔍 학술 데이터베이스 탐색 중...', count: 5 },
    { msg: '🔍 뉴스 및 미디어 분석 중...', count: 12 },
    { msg: '🔍 업계 리포트 수집 중...', count: 20 },
    { msg: '🔍 전문가 의견 및 블로그 분석 중...', count: 30 },
  ];

  // 리서치 시작 (비동기)
  const researchPromise = simulateDeepResearch(topic);

  for (const ps of pollingStages) {
    await sleep(800);
    simulatedSourceCount = ps.count;
    yield {
      stage: 'research_polling',
      stageIndex: 2,
      totalStages: 7,
      message: ps.msg,
      sourceCount: simulatedSourceCount,
      elapsedSeconds: elapsed(),
    };
  }

  // 실제 리서치 완료 대기
  let researchResult: Awaited<typeof researchPromise>;
  try {
    researchResult = await researchPromise;
  } catch (err: any) {
    yield {
      stage: 'error',
      stageIndex: 2,
      totalStages: 7,
      message: `❌ 리서치 오류: ${err.message}`,
      elapsedSeconds: elapsed(),
    };
    return;
  }

  // ── 4단계: 소스 임포트 ──────────────────────────────────────
  yield {
    stage: 'source_import',
    stageIndex: 3,
    totalStages: 7,
    message: `📥 ${researchResult.sourceCount}개 출처 노트북에 통합 완료`,
    sourceCount: researchResult.sourceCount,
    elapsedSeconds: elapsed(),
  };

  await sleep(600);

  // ── 5단계: 핵심 인사이트 추출 ──────────────────────────────
  yield {
    stage: 'insight_extract',
    stageIndex: 4,
    totalStages: 7,
    message: '🧠 핵심 논리·통계·인용구 추출 중...',
    sourceCount: researchResult.sourceCount,
    elapsedSeconds: elapsed(),
  };

  await sleep(500);

  // ── 6단계: 리포트 생성 ──────────────────────────────────────
  yield {
    stage: 'report_generate',
    stageIndex: 5,
    totalStages: 7,
    message: '📋 종합 리서치 리포트 및 슬라이드 구조 설계 중...',
    sourceCount: researchResult.sourceCount,
    elapsedSeconds: elapsed(),
  };

  // ── 7단계: 슬라이드 JSON 변환 ──────────────────────────────
  yield {
    stage: 'slide_mapping',
    stageIndex: 6,
    totalStages: 7,
    message: '🎯 슬라이드 JSON 스키마 변환 중...',
    sourceCount: researchResult.sourceCount,
    elapsedSeconds: elapsed(),
  };

  let slidesJson: any;
  try {
    slidesJson = await convertToSlideJson(
      researchResult.researchContent,
      topic,
      meetingInfo,
      settings,
      template,
      researchResult.citations,
    );
  } catch (err: any) {
    yield {
      stage: 'error',
      stageIndex: 6,
      totalStages: 7,
      message: `❌ 슬라이드 변환 오류: ${err.message}`,
      elapsedSeconds: elapsed(),
    };
    return;
  }

  // ── 완료 ────────────────────────────────────────────────────
  yield {
    stage: 'complete',
    stageIndex: 6,
    totalStages: 7,
    message: `✅ 딥 리서치 완료! ${researchResult.sourceCount}개 출처 기반 슬라이드 생성`,
    sourceCount: researchResult.sourceCount,
    elapsedSeconds: elapsed(),
    payload: {
      presentation: slidesJson,
      notebookId: researchResult.notebookId,
      sourceCount: researchResult.sourceCount,
      citations: researchResult.citations,
    },
  };
}

// ── 헬퍼 ────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
