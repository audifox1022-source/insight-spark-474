import type { MeetingInfo, PresentationSettings } from '@/types/presentation';

export const INSIGHT_BRIEF_PROMPT_MARKER = '[INSIGHT BRIEF v1]';

export type InsightCriterionId =
  | 'decision'
  | 'audience'
  | 'evidence'
  | 'action'
  | 'risk'
  | 'visualization';

export interface InsightCriterion {
  id: InsightCriterionId;
  label: string;
  passed: boolean;
  weight: number;
  evidence: string;
  recommendation: string;
}

export interface RecommendedInsightSlide {
  role: string;
  title: string;
  rationale: string;
  visualization: 'none' | 'chart' | 'table' | 'timeline' | 'comparison';
}

export interface InsightBrief {
  qualityScore: number;
  scoreLabel: '보강 필요' | '생성 가능' | '고신뢰';
  status: 'needs_context' | 'ready' | 'high_confidence';
  summary: string;
  strategyFrame: {
    decisionQuestion: string;
    targetAudience: string;
    sourceBasis: string;
    expectedAction: string;
    narrativeArc: string;
  };
  criteria: InsightCriterion[];
  gapWarnings: string[];
  evidencePrompts: string[];
  recommendedSlides: RecommendedInsightSlide[];
}

interface DataFileBriefInput {
  name: string;
  status: 'loading' | 'success' | 'error';
}

export interface BuildInsightBriefInput {
  meetingInfo: MeetingInfo;
  settings: PresentationSettings;
  template?: string;
  dataSummary?: string;
  sourceFileData?: string;
  dataFiles?: DataFileBriefInput[];
  referenceStructure?: {
    slideCount?: number;
    keyPatterns?: string[];
  } | null;
}

const NUMERIC_OR_KPI_PATTERN =
  /(\d+(?:\.\d+)?\s?(%|퍼센트|억원|원|명|건|배|년|개월|분기|점|회)|kpi|roi|nps|cac|ltv|매출|비용|전환|성장|감소|증가|점유율)/i;
const ACTION_PATTERN =
  /(실행|도입|확대|축소|결정|승인|투자|개선|전환|계획|추진|전략|우선순위|로드맵|next|action|recommend)/i;
const RISK_PATTERN =
  /(리스크|위험|제약|문제|장애|불확실|가정|대응|완화|대안|병목|한계|risk|constraint)/i;
const AUDIENCE_PATTERN =
  /(임원|경영|고객|투자|팀|부서|사용자|담당자|audience|manager|executive|마케팅|영업|개발|재무|인사)/i;

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasMeaningfulText(value: unknown, minLength = 12): boolean {
  return normalizeText(value).length >= minLength;
}

function includesPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function firstNonEmpty(...values: Array<unknown>): string {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return '';
}

function deriveDecisionQuestion(info: MeetingInfo, context: string): string {
  if (hasMeaningfulText(info.objective, 8)) {
    return `${normalizeText(info.objective)} 달성을 위해 지금 승인해야 할 핵심 판단은 무엇인가?`;
  }

  if (hasMeaningfulText(info.title, 6)) {
    return `${normalizeText(info.title)}에서 청중이 선택해야 할 우선순위는 무엇인가?`;
  }

  if (includesPattern(context, ACTION_PATTERN)) {
    return '제시된 실행 과제 중 즉시 추진할 우선순위는 무엇인가?';
  }

  return '이 발표 이후 청중이 내려야 할 핵심 결정은 무엇인가?';
}

function deriveAudience(info: MeetingInfo, settings: PresentationSettings, context: string): string {
  if (hasMeaningfulText(info.audience, 4)) return normalizeText(info.audience);
  if (includesPattern(context, /임원|경영|이사회|투자/i)) return '임원 및 의사결정권자';
  if (settings.difficulty === 'executive') return '임원 및 의사결정권자';
  if (hasMeaningfulText(info.department, 2)) return `${normalizeText(info.department)} 이해관계자`;
  if (includesPattern(context, AUDIENCE_PATTERN)) return '업무 이해관계자';
  return '실무 의사결정자';
}

function deriveSourceBasis(input: BuildInsightBriefInput, context: string): string {
  const successfulFiles = input.dataFiles?.filter((file) => file.status === 'success') || [];
  if (hasMeaningfulText(input.dataSummary, 40)) return '업로드 데이터 분석 리포트';
  if (successfulFiles.length > 0) return `${successfulFiles.length}개 업로드 데이터 파일`;
  if (hasMeaningfulText(input.sourceFileData, 80)) return '원본 문서 및 파일 본문';
  if (includesPattern(context, NUMERIC_OR_KPI_PATTERN)) return '사용자 입력 내 수치/KPI';
  if (hasMeaningfulText(input.meetingInfo.notes, 30)) return '사용자 메모 및 요청사항';
  return '입력 근거 부족';
}

function deriveExpectedAction(info: MeetingInfo, context: string): string {
  if (hasMeaningfulText(info.objective, 8)) return normalizeText(info.objective);
  if (includesPattern(context, ACTION_PATTERN)) return '실행 우선순위 결정 및 후속 과제 착수';
  return '핵심 결론 이해 후 추가 검토 항목 확정';
}

function deriveNarrativeArc(template: string | undefined, settings: PresentationSettings): string {
  if (settings.difficulty === 'executive' || settings.generationStyle === 'gptpark') {
    return '결론 선제시 -> 핵심 근거 -> 선택지 비교 -> 권고안 -> 리스크와 실행 요청';
  }

  if (template === 'analysis') {
    return '문제 정의 -> 데이터 관찰 -> 원인 해석 -> 사업적 의미 -> 실행 제안';
  }

  if (template === 'proposal') {
    return '고객 과제 -> 해결안 -> 기대 효과 -> 실행 로드맵 -> 승인 요청';
  }

  if (template === 'summary') {
    return '핵심 요약 -> 중요 근거 -> 영향도 -> 다음 행동';
  }

  return '맥락 -> 인사이트 -> 근거 -> 행동 제안 -> 다음 단계';
}

function makeCriterion(
  id: InsightCriterionId,
  label: string,
  passed: boolean,
  weight: number,
  evidence: string,
  recommendation: string
): InsightCriterion {
  return { id, label, passed, weight, evidence, recommendation };
}

function buildRecommendedSlides(
  input: BuildInsightBriefInput,
  context: string,
  decisionQuestion: string
): RecommendedInsightSlide[] {
  const hasNumbers = includesPattern(context, NUMERIC_OR_KPI_PATTERN);
  const hasRisk = includesPattern(context, RISK_PATTERN);
  const slideCount = Math.max(4, Math.min(input.settings.slideCount || 10, 8));
  const base: RecommendedInsightSlide[] = [
    {
      role: 'decision',
      title: '핵심 결론 및 승인 요청',
      rationale: decisionQuestion,
      visualization: 'none',
    },
    {
      role: 'context',
      title: '현재 상황과 문제 구조',
      rationale: '청중이 같은 문제 정의에서 출발하도록 배경과 제약을 정리',
      visualization: 'comparison',
    },
    {
      role: 'evidence',
      title: hasNumbers ? '핵심 KPI와 변화 신호' : '핵심 근거와 관찰',
      rationale: '주장의 근거를 수치, 사례, 문서 출처와 연결',
      visualization: hasNumbers ? 'chart' : 'table',
    },
    {
      role: 'insight',
      title: '사업적 의미와 우선순위',
      rationale: '단순 요약을 넘어 왜 지금 중요한지 해석',
      visualization: 'comparison',
    },
    {
      role: 'action',
      title: '실행 로드맵과 담당 과제',
      rationale: '발표 이후 바로 실행할 과제와 순서를 명확화',
      visualization: 'timeline',
    },
    {
      role: 'risk',
      title: hasRisk ? '리스크와 대응 방안' : '가정, 리스크, 추가 확인사항',
      rationale: '의사결정자가 신뢰할 수 있도록 불확실성과 대응책을 공개',
      visualization: 'table',
    },
  ];

  if (input.referenceStructure?.keyPatterns?.length) {
    base.splice(2, 0, {
      role: 'reference',
      title: '참조 문서 논리 패턴 반영',
      rationale: input.referenceStructure.keyPatterns.slice(0, 3).join(', '),
      visualization: 'none',
    });
  }

  return base.slice(0, slideCount);
}

export function buildInsightBrief(input: BuildInsightBriefInput): InsightBrief {
  const info = input.meetingInfo;
  const context = [
    info.title,
    info.objective,
    info.audience,
    info.department,
    info.reporter,
    info.notes,
    input.dataSummary,
    input.sourceFileData,
    input.dataFiles?.map((file) => file.name).join(' '),
  ].map(normalizeText).filter(Boolean).join(' ');

  const successfulFiles = input.dataFiles?.filter((file) => file.status === 'success') || [];
  const hasDecision = hasMeaningfulText(info.objective, 8) || hasMeaningfulText(info.title, 8) || includesPattern(context, ACTION_PATTERN);
  const hasAudience = hasMeaningfulText(info.audience, 4) || hasMeaningfulText(info.department, 2) || includesPattern(context, AUDIENCE_PATTERN);
  const hasEvidence =
    hasMeaningfulText(input.dataSummary, 40) ||
    hasMeaningfulText(input.sourceFileData, 80) ||
    successfulFiles.length > 0 ||
    includesPattern(context, NUMERIC_OR_KPI_PATTERN);
  const hasAction = hasMeaningfulText(info.objective, 8) || includesPattern(context, ACTION_PATTERN);
  const hasRisk = includesPattern(context, RISK_PATTERN);
  const hasVisualization = successfulFiles.length > 0 || includesPattern(context, NUMERIC_OR_KPI_PATTERN);

  const decisionQuestion = deriveDecisionQuestion(info, context);
  const targetAudience = deriveAudience(info, input.settings, context);
  const sourceBasis = deriveSourceBasis(input, context);
  const expectedAction = deriveExpectedAction(info, context);
  const narrativeArc = deriveNarrativeArc(input.template, input.settings);

  const criteria = [
    makeCriterion(
      'decision',
      '의사결정 질문',
      hasDecision,
      20,
      hasDecision ? firstNonEmpty(info.objective, info.title, '실행 키워드 감지') : '목표/제목 부족',
      '청중이 승인하거나 선택해야 할 결정을 한 문장으로 입력'
    ),
    makeCriterion(
      'audience',
      '청중 맥락',
      hasAudience,
      15,
      hasAudience ? targetAudience : '대상 청중 미지정',
      '임원, 고객, 실무팀 등 핵심 청중과 관심사를 지정'
    ),
    makeCriterion(
      'evidence',
      '근거와 데이터',
      hasEvidence,
      25,
      sourceBasis,
      '수치, KPI, 원본 문서, 고객 사례, 데이터 파일 중 하나 이상 추가'
    ),
    makeCriterion(
      'action',
      '실행 가능성',
      hasAction,
      20,
      hasAction ? expectedAction : '후속 행동 불명확',
      '승인 요청, 실행 과제, 다음 단계, 담당자 또는 일정 추가'
    ),
    makeCriterion(
      'risk',
      '리스크 공개',
      hasRisk,
      10,
      hasRisk ? '리스크/제약/가정 키워드 감지' : '리스크 언급 없음',
      '의사결정자가 확인해야 할 리스크와 대응책 추가'
    ),
    makeCriterion(
      'visualization',
      '시각화 단서',
      hasVisualization,
      10,
      hasVisualization ? '차트/표로 전환 가능한 수치 또는 데이터 파일 감지' : '차트 단서 부족',
      '비교 수치, 추이, 비중, 표 형태 데이터를 추가'
    ),
  ];

  const qualityScore = criteria.reduce((score, criterion) => score + (criterion.passed ? criterion.weight : 0), 0);
  const scoreLabel = qualityScore >= 80 ? '고신뢰' : qualityScore >= 55 ? '생성 가능' : '보강 필요';
  const status = qualityScore >= 80 ? 'high_confidence' : qualityScore >= 55 ? 'ready' : 'needs_context';
  const missingCriteria = criteria.filter((criterion) => !criterion.passed);

  const gapWarnings = missingCriteria.map((criterion) => `${criterion.label}: ${criterion.recommendation}`);
  const evidencePrompts = missingCriteria.slice(0, 4).map((criterion) => criterion.recommendation);
  const recommendedSlides = buildRecommendedSlides(input, context, decisionQuestion);

  return {
    qualityScore,
    scoreLabel,
    status,
    summary:
      qualityScore >= 80
        ? '생성 입력이 의사결정, 근거, 실행까지 연결되어 고밀도 발표자료에 적합합니다.'
        : qualityScore >= 55
          ? '기본 생성은 가능하지만 일부 근거 또는 리스크를 보강하면 인사이트 밀도가 올라갑니다.'
          : '주제만으로는 일반적 결과가 나올 가능성이 높아 목표, 데이터, 청중을 먼저 보강해야 합니다.',
    strategyFrame: {
      decisionQuestion,
      targetAudience,
      sourceBasis,
      expectedAction,
      narrativeArc,
    },
    criteria,
    gapWarnings,
    evidencePrompts,
    recommendedSlides,
  };
}

export function formatInsightBriefForPrompt(brief: InsightBrief): string {
  const criteria = brief.criteria
    .map((criterion) => {
      const status = criterion.passed ? '충족' : '보강';
      return `- ${criterion.label}: ${status} / 근거: ${criterion.evidence} / 지침: ${criterion.recommendation}`;
    })
    .join('\n');

  const slides = brief.recommendedSlides
    .map((slide, index) => {
      return `${index + 1}. ${slide.title} (${slide.role}, ${slide.visualization}) - ${slide.rationale}`;
    })
    .join('\n');

  const gaps = brief.gapWarnings.length > 0
    ? brief.gapWarnings.map((gap) => `- ${gap}`).join('\n')
    : '- 현재 입력에서 중대한 보강 항목 없음';

  return [
    INSIGHT_BRIEF_PROMPT_MARKER,
    `품질 점수: ${brief.qualityScore}/100 (${brief.scoreLabel})`,
    `요약: ${brief.summary}`,
    '',
    '[전략 프레임]',
    `- 의사결정 질문: ${brief.strategyFrame.decisionQuestion}`,
    `- 핵심 청중: ${brief.strategyFrame.targetAudience}`,
    `- 근거 기반: ${brief.strategyFrame.sourceBasis}`,
    `- 기대 행동: ${brief.strategyFrame.expectedAction}`,
    `- 서사 구조: ${brief.strategyFrame.narrativeArc}`,
    '',
    '[품질 게이트]',
    criteria,
    '',
    '[보강 필요 항목]',
    gaps,
    '',
    '[권장 슬라이드 전략]',
    slides,
    '',
    '[생성 강제 규칙]',
    '- 각 본문 슬라이드는 관찰 -> 의미 -> 행동 중 최소 2개를 포함할 것',
    '- 수치/KPI/비교 데이터가 있으면 chart, table, comparison 중 하나로 구조화할 것',
    '- 결론 없는 요약을 금지하고 각 슬라이드에 의사결정 기여도를 명시할 것',
    '- 리스크 또는 가정이 부족하면 마지막 1개 슬라이드에서 확인 필요 항목으로 분리할 것',
    '[/INSIGHT BRIEF]',
  ].join('\n');
}

export function appendInsightBriefToPrompt(text: string, brief: InsightBrief): string {
  const base = String(text || '').trim();
  if (base.includes(INSIGHT_BRIEF_PROMPT_MARKER)) return base;
  const formattedBrief = formatInsightBriefForPrompt(brief);
  return base ? `${base}\n\n${formattedBrief}` : formattedBrief;
}
