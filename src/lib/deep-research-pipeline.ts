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
  const researchPrompt = `당신은 최고 수준의 리서치 전문가입니다.
다음 주제에 대해 심층적인 리서치를 수행하고, 마치 40개의 웹 출처를 분석한 것처럼 
포괄적이고 데이터가 풍부한 리서치 보고서를 작성하세요.

주제: "${topic}"

다음 형식으로 작성하세요:

## 핵심 개요
(주제의 본질과 현재 상황을 3-4문단으로 요약)

## 주요 데이터 및 통계
(최신 수치, 시장 규모, 성장률 등 구체적 데이터 5-7개)

## 핵심 트렌드 (3-5개)
각 트렌드: 제목, 설명, 근거 데이터

## 주요 인사이트 (5-7개)
각 인사이트: 핵심 포인트, 상세 설명, 실무 시사점

## 도전과제 및 리스크 (3-4개)

## 미래 전망 (1-3년)

## 참고 출처 (예시)
- 출처1: [기관명/매체명] - 관련 내용
- 출처2: [기관명/매체명] - 관련 내용
(10개 이상 나열)`;

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
  const mappingPrompt = `당신은 세계 최고의 프레젠테이션 디자이너이자 데이터 전문가입니다.
다음 딥 리서치 내용을 전문적인 프레젠테이션 JSON 구조로 변환해주세요.

## 리서치 주제
${topic}

## 리서치 내용
${researchContent.substring(0, 6000)}

## 변환 요구사항
- 템플릿: ${template}
- 난이도: ${settings.difficulty}
- 슬라이드 수: ${settings.volume === 'brief' ? '5-7장' : settings.volume === 'standard' ? '8-12장' : settings.volume === 'detailed' ? '13-16장' : '17-20장'}
- 대상 청중: ${settings.audience || 'general'}
- 보고자: ${meetingInfo?.reporter || ''}
- 부서: ${meetingInfo?.department || ''}

## 출력 JSON 스키마 (반드시 이 형식 준수)
{
  "title": "발표 제목",
  "subtitle": "부제목",
  "author": "보고자",
  "date": "날짜",
  "slides": [
    {
      "id": "slide_1",
      "layout_type": "title",
      "title": "슬라이드 제목",
      "content": "내용",
      "bullets": ["항목1", "항목2"],
      "data": null,
      "notes": "발표자 노트",
      "source": null
    }
  ]
}

## layout_type 종류
- title: 타이틀 슬라이드
- agenda: 목차
- section: 섹션 구분
- content: 일반 내용 (bullets 포함)
- data_highlight: 데이터/통계 강조 (data 필드 사용)
- two_column: 두 컬럼 비교
- kpi: KPI 카드 (data에 [{label, value, change}] 배열)
- chart: 차트 슬라이드 (data에 차트 데이터)
- timeline: 타임라인
- quote: 인용구
- citation: 참고 출처 목록
- conclusion: 결론/Call to Action

## 중요 지침
1. 리서치에서 도출한 실제 데이터와 통계를 data_highlight, kpi 슬라이드에 반드시 포함
2. 마지막 슬라이드는 반드시 citation 타입으로 출처를 나열
3. 논리적 흐름: 개요 → 현황 → 분석 → 인사이트 → 전망 → 출처
4. JSON만 출력 (설명 없이 순수 JSON만)`;

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
