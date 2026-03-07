// ============================================================
// src/lib/pipeline.ts
// Feature 5: 3단계 자동 변환 파이프라인
// 업로드 → AI 요약 → JSON 슬라이드 매핑 → PPTX 다운로드
// ============================================================
import { aiService } from '@/services/ai';
import { ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { PresentationSettings } from '@/types/presentation';

export type PipelineStage = 'parsing' | 'summarizing' | 'mapping' | 'complete' | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  stageIndex: number;       // 0~3
  totalStages: number;      // 4
  message: string;
  payload?: any;            // 각 단계의 결과물
}

export const PIPELINE_STAGES: { stage: PipelineStage; label: string; emoji: string }[] = [
  { stage: 'parsing',     label: '파일 파싱 완료',       emoji: '📂' },
  { stage: 'summarizing', label: 'AI 핵심 요약 완료',    emoji: '🧠' },
  { stage: 'mapping',     label: 'JSON 슬라이드 매핑',   emoji: '📊' },
  { stage: 'complete',    label: 'PPTX 생성 준비 완료', emoji: '✅' },
];

// ─────────────────────────────────────────────────────────
// runConversionPipeline: 3단계 파이프라인 실행
// AsyncGenerator로 각 단계를 스트리밍 방식으로 반환
// ─────────────────────────────────────────────────────────
export async function* runConversionPipeline(
  parsedFiles: ParsedFileData[],
  meetingInfo: any,
  settings: PresentationSettings,
  template: string,
  approvedOutline?: any,
  referenceStructure?: any,
): AsyncGenerator<PipelineProgress> {

  // ── Stage 1: 파싱 (이미 완료된 상태로 진입하지만 단계 표시)
  yield {
    stage: 'parsing',
    stageIndex: 0,
    totalStages: 4,
    message: `📂 ${parsedFiles.length}개 파일 파싱 완료`,
    payload: parsedFiles,
  };

  // ── Stage 2: AI 핵심 요약
  let summaryPayload: any = null;
  try {
    const rawText = parsedFiles.map((f) => (typeof f.content === 'string' ? f.content : JSON.stringify(f.content))).join('\n\n');
    summaryPayload = await aiService.summarizeForPresentation(rawText);
    yield {
      stage: 'summarizing',
      stageIndex: 1,
      totalStages: 4,
      message: '🧠 AI 핵심 요약 완료',
      payload: summaryPayload,
    };
  } catch {
    yield {
      stage: 'summarizing',
      stageIndex: 1,
      totalStages: 4,
      message: '🧠 요약 단계 스킵 (원본 사용)',
    };
  }

  // ── Stage 3: JSON 슬라이드 매핑
  let presentationResult: any = null;
  try {
    const fileData = buildAIPayload(parsedFiles);
    const resData = await aiService.generatePresentation({
      fileData,
      meetingInfo,
      settings,
      template,
      approvedOutline,
      referenceStructure,
    });
    presentationResult = resData.presentation;
    yield {
      stage: 'mapping',
      stageIndex: 2,
      totalStages: 4,
      message: `📊 ${presentationResult?.slides?.length ?? 0}장 슬라이드 매핑 완료`,
      payload: presentationResult,
    };
  } catch (err: any) {
    yield { stage: 'error', stageIndex: 2, totalStages: 4, message: `❌ 슬라이드 생성 오류: ${err.message}` };
    return;
  }

  // ── Stage 4: 완료 (PPTX 다운로드 준비)
  yield {
    stage: 'complete',
    stageIndex: 3,
    totalStages: 4,
    message: '✅ 변환 파이프라인 완료 — PPTX 다운로드 가능',
    payload: presentationResult,
  };
}
