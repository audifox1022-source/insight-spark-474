import type { Presentation, Slide, SlideContent } from '@/types/presentation';
import { extractSlideCitation } from '@/lib/slide-citations';

export type DeckQualitySeverity = 'high' | 'medium' | 'low';
export type DeckQualityCategory = 'Logic' | 'Evidence' | 'Action' | 'Layout' | 'Risk' | 'Data' | 'Source';

export interface DeckQualityIssue {
  slideIndex: number;
  slideNumber: number;
  severity: DeckQualitySeverity;
  category: DeckQualityCategory;
  title: string;
  description: string;
  suggestion: string;
  critical: boolean;
}

export interface DeckQualityAuditResult {
  score: string;
  scoreValue: number;
  summary: string;
  strengths: string[];
  improvements: DeckQualityIssue[];
  metrics: {
    slideCount: number;
    contentSlideCount: number;
    layoutDiversity: number;
    evidenceSignals: number;
    actionSignals: number;
    riskSignals: number;
    sourceSignals: number;
  };
}

const NUMERIC_OR_KPI_PATTERN =
  /(\d+(?:\.\d+)?\s?(%|퍼센트|억원|원|명|건|배|년|개월|분기|점|회)|kpi|roi|nps|cac|ltv|매출|비용|전환|성장|감소|증가|점유율)/i;
const ACTION_PATTERN =
  /(실행|도입|확대|축소|결정|승인|투자|개선|전환|계획|추진|전략|우선순위|로드맵|next|action|recommend|제안|요청)/i;
const RISK_PATTERN =
  /(리스크|위험|제약|문제|장애|불확실|가정|대응|완화|대안|병목|한계|risk|constraint)/i;
const GENERIC_TITLE_PATTERN = /^(개요|소개|내용|정리|요약|전략|방안|분석|결론|목차)$/i;

function compactText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slideText(slide: Slide): string {
  const contentText = Array.isArray(slide.content)
    ? slide.content.map((item) => `${compactText(item.heading)} ${compactText(item.description)}`).join(' ')
    : compactText(slide.content);

  return [
    slide.title,
    slide.subtitle,
    slide.strategicGoal,
    slide.speakerNotes,
    contentText,
    JSON.stringify(slide.content_data || ''),
  ].map(compactText).filter(Boolean).join(' ');
}

function getContentItems(slide: Slide): SlideContent[] {
  if (!Array.isArray(slide.content)) return [];
  return slide.content.filter((item): item is SlideContent => Boolean(item && compactText(item.heading)));
}

function gradeFromScore(score: number): string {
  if (score >= 92) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function severityPenalty(severity: DeckQualitySeverity): number {
  if (severity === 'high') return 14;
  if (severity === 'medium') return 8;
  return 4;
}

function createIssue(
  slideIndex: number,
  severity: DeckQualitySeverity,
  category: DeckQualityCategory,
  title: string,
  description: string,
  suggestion: string
): DeckQualityIssue {
  return {
    slideIndex,
    slideNumber: slideIndex + 1,
    severity,
    category,
    title,
    description,
    suggestion,
    critical: severity === 'high',
  };
}

function hasVisualizationData(slide: Slide): boolean {
  return Boolean(
    slide.content_data ||
    slide.content_data_chart ||
    slide.content_data_table ||
    slide.content_data_timeline ||
    slide.chartData ||
    slide.tableData ||
    slide.timelineData
  );
}

function summarize(score: number, issueCount: number): string {
  if (score >= 85) return `검수 결과가 안정적입니다. 보완 후보 ${issueCount}개만 확인하면 됩니다.`;
  if (score >= 70) return `생성 결과는 사용할 수 있지만 ${issueCount}개 항목을 보강하면 설득력이 올라갑니다.`;
  return `핵심 구조 보강이 필요합니다. 발견된 ${issueCount}개 항목을 먼저 수정하세요.`;
}

export function auditPresentationQuality(presentation: Presentation | null | undefined): DeckQualityAuditResult {
  const slides = Array.isArray(presentation?.slides) ? presentation.slides : [];
  const issues: DeckQualityIssue[] = [];

  if (slides.length === 0) {
    return {
      score: 'D',
      scoreValue: 0,
      summary: '검수할 슬라이드가 없습니다.',
      strengths: [],
      improvements: [
        createIssue(0, 'high', 'Layout', '슬라이드 없음', '발표자료가 비어 있어 품질 검수를 진행할 수 없습니다.', '목차 승인 후 전체 슬라이드를 다시 생성'),
      ],
      metrics: {
        slideCount: 0,
        contentSlideCount: 0,
        layoutDiversity: 0,
        evidenceSignals: 0,
        actionSignals: 0,
        riskSignals: 0,
        sourceSignals: 0,
      },
    };
  }

  const layoutSet = new Set(slides.map((slide) => compactText(slide.layout || slide.type) || 'default'));
  const allText = slides.map(slideText).join(' ');
  const titleCounts = new Map<string, number>();
  slides.forEach((slide) => {
    const title = compactText(slide.title).toLowerCase();
    if (title) titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
  });

  if ((slides[0].layout || slides[0].type) !== 'cover') {
    issues.push(createIssue(0, 'high', 'Layout', '표지 레이아웃 누락', '첫 번째 슬라이드가 cover 레이아웃이 아닙니다.', '첫 장을 제목, 부제, 보고자 중심의 cover 레이아웃으로 고정'));
  }

  if (slides.length < 4) {
    issues.push(createIssue(0, 'medium', 'Logic', '슬라이드 수 부족', `총 ${slides.length}장으로 문제-근거-실행 흐름을 담기 어렵습니다.`, '최소 4장 이상으로 결론, 근거, 실행, 리스크를 분리'));
  }

  if (layoutSet.size < Math.min(3, slides.length)) {
    issues.push(createIssue(0, 'medium', 'Layout', '레이아웃 다양성 부족', '동일한 레이아웃 비중이 높아 장표 흐름이 단조로울 수 있습니다.', 'cover, chart/table, comparison, timeline 중 3종 이상 사용'));
  }

  slides.forEach((slide, index) => {
    const isCover = index === 0 || slide.layout === 'cover';
    const items = getContentItems(slide);
    const text = slideText(slide);
    const title = compactText(slide.title);

    if (!isCover && items.length === 0) {
      issues.push(createIssue(index, 'high', 'Evidence', '본문 콘텐츠 없음', '표지 외 슬라이드에 설명 가능한 본문 항목이 없습니다.', '최소 3개 이상의 heading/description 본문 항목 추가'));
    }

    if (!isCover && items.length > 5) {
      issues.push(createIssue(index, 'medium', 'Layout', '본문 항목 과다', `본문 항목이 ${items.length}개로 스캔성이 떨어질 수 있습니다.`, '핵심 3~4개만 남기고 나머지는 보조 슬라이드로 분리'));
    }

    const descriptionCount = items.filter((item) => compactText(item.description).length >= 12).length;
    if (!isCover && items.length >= 2 && descriptionCount / items.length < 0.5) {
      issues.push(createIssue(index, 'medium', 'Evidence', '근거 설명 부족', '헤드라인은 있으나 왜 중요한지 설명하는 문장이 부족합니다.', '각 항목에 관찰, 사업적 의미, 기대 효과 중 하나를 설명'));
    }

    if (!isCover && GENERIC_TITLE_PATTERN.test(title)) {
      issues.push(createIssue(index, 'low', 'Logic', '일반적 제목', `"${title}"은 의사결정 메시지가 약합니다.`, '제목을 결론형 문장 또는 핵심 인사이트로 변경'));
    }

    if ((slide.layout === 'chart' || slide.layout === 'table' || slide.visualization_type === 'chart' || slide.visualization_type === 'table') && !hasVisualizationData(slide)) {
      issues.push(createIssue(index, 'medium', 'Data', '시각화 데이터 누락', '차트/표 레이아웃인데 정형 데이터가 없습니다.', 'content_data_chart 또는 content_data_table에 표시할 데이터를 추가'));
    }

    if (!isCover && !compactText(slide.strategicGoal || slide.speakerNotes) && text.length < 160) {
      issues.push(createIssue(index, 'low', 'Action', '발표 의도 약함', '전략 목표나 발표자 메모가 없어 메시지 의도가 약해질 수 있습니다.', 'strategicGoal 또는 speakerNotes에 청중이 취할 행동을 추가'));
    }
  });

  for (const [title, count] of titleCounts.entries()) {
    if (count > 1) {
      const firstIndex = slides.findIndex((slide) => compactText(slide.title).toLowerCase() === title);
      issues.push(createIssue(firstIndex, 'medium', 'Logic', '중복 제목', `"${compactText(slides[firstIndex]?.title)}" 제목이 ${count}회 반복됩니다.`, '각 슬라이드 제목을 서로 다른 결론형 메시지로 수정'));
    }
  }

  const evidenceSignals = (allText.match(NUMERIC_OR_KPI_PATTERN) ? 1 : 0) + slides.filter((slide) => hasVisualizationData(slide)).length;
  const actionSignals = (allText.match(ACTION_PATTERN) || []).length;
  const riskSignals = (allText.match(RISK_PATTERN) || []).length;
  const sourceSignals = slides.filter((slide) => extractSlideCitation(slide)).length;

  if (evidenceSignals === 0) {
    issues.push(createIssue(0, 'high', 'Evidence', '수치/KPI 근거 부족', '덱 전체에서 수치, KPI, 정형 데이터 신호가 발견되지 않았습니다.', '매출, 비용, 전환율, 일정, 고객 수 등 핵심 근거를 최소 1개 이상 추가'));
  }

  if (actionSignals === 0) {
    issues.push(createIssue(slides.length - 1, 'high', 'Action', '실행 요청 부재', '덱 전체에서 승인, 실행, 우선순위, 로드맵 등 행동 신호가 약합니다.', '마지막 슬라이드에 결정 요청과 다음 행동을 명확히 추가'));
  }

  if (riskSignals === 0 && slides.length >= 5) {
    issues.push(createIssue(slides.length - 1, 'low', 'Risk', '리스크/가정 부재', '의사결정자가 확인해야 할 리스크 또는 가정이 보이지 않습니다.', '리스크, 제약, 대응책을 별도 항목 또는 마지막 슬라이드에 추가'));
  }

  if (evidenceSignals > 0 && sourceSignals === 0) {
    issues.push(createIssue(0, 'medium', 'Source', '근거 출처 누락', '수치 또는 정형 데이터가 있지만 검증 가능한 출처 URL이 없습니다.', '핵심 수치가 나온 슬라이드에 citation_url과 source_label을 추가'));
  }

  const rawScore = issues.reduce((score, issue) => score - severityPenalty(issue.severity), 100);
  const scoreValue = Math.max(0, Math.min(100, rawScore));
  const strengths: string[] = [];

  if ((slides[0].layout || slides[0].type) === 'cover') strengths.push('표지 슬라이드 구조가 안정적으로 시작됨');
  if (slides.length >= 4 && slides.length <= 20) strengths.push('발표 흐름을 구성하기에 적절한 슬라이드 수');
  if (layoutSet.size >= 3) strengths.push('여러 레이아웃을 사용해 장표 리듬을 확보');
  if (evidenceSignals > 0) strengths.push('수치 또는 정형 데이터 기반 근거 신호 존재');
  if (sourceSignals > 0) strengths.push('검증 가능한 출처 URL이 포함됨');
  if (actionSignals > 0) strengths.push('실행 또는 의사결정으로 이어지는 메시지 포함');

  return {
    score: gradeFromScore(scoreValue),
    scoreValue,
    summary: summarize(scoreValue, issues.length),
    strengths: strengths.length > 0 ? strengths : ['검수 가능한 기본 슬라이드 구조가 생성됨'],
    improvements: issues.sort((a, b) => severityPenalty(b.severity) - severityPenalty(a.severity)).slice(0, 12),
    metrics: {
      slideCount: slides.length,
      contentSlideCount: slides.filter((slide, index) => index > 0 && getContentItems(slide).length > 0).length,
      layoutDiversity: layoutSet.size,
      evidenceSignals,
      actionSignals,
      riskSignals,
      sourceSignals,
    },
  };
}
