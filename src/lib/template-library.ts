// ============================================================
// src/lib/template-library.ts (Work AI - 템플릿 라이브러리)
// ============================================================
import type { PresentationSettings } from '@/types/presentation';

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'creative' | 'academic' | 'marketing' | 'technical';
  icon: string;
  gradient: string;
  settings: Partial<PresentationSettings>;
  slideStructure: string[];
  tags: string[];
}

export const TEMPLATE_LIBRARY: TemplatePreset[] = [
  // 비즈니스
  {
    id: 'executive-report',
    name: '경영진 보고',
    description: 'CEO/CFO용 전략적 요약 보고서',
    category: 'business',
    icon: '👔',
    gradient: 'from-slate-700 to-slate-900',
    settings: { difficulty: 'executive', volume: 'brief', slideCount: 8, generationStyle: 'gptpark' },
    slideStructure: ['표지', '요약', '핵심 지표', '전략 제언', '리스크', '로드맵', '결론', 'Q&A'],
    tags: ['경영진', '전략', 'ROI', '요약'],
  },
  {
    id: 'quarterly-review',
    name: '분기 실적 리뷰',
    description: '분기별 실적 분석 및 향후 계획',
    category: 'business',
    icon: '📊',
    gradient: 'from-blue-600 to-indigo-700',
    settings: { difficulty: 'hard', volume: 'standard', slideCount: 12, generationStyle: 'kimura' },
    slideStructure: ['표지', '실적 요약', '매출 분석', '비용 분석', '고객 분석', '경쟁사 비교', '성과 KPI', '개선 과제', '향후 계획', ' 예산', '결론', 'Q&A'],
    tags: ['실적', '분기', 'KPI', '데이터'],
  },
  {
    id: 'project-proposal',
    name: '프로젝트 제안서',
    description: '신규 프로젝트 기획 및 승인 요청',
    category: 'business',
    icon: '💡',
    gradient: 'from-amber-500 to-orange-600',
    settings: { difficulty: 'hard', volume: 'detailed', slideCount: 15, generationStyle: 'standard' },
    slideStructure: ['표지', '현황 분석', '문제 정의', '해결 방안', '기술 아키텍처', '일정 계획', '리소스', '예산', '기대 효과', '리스크', '결론'],
    tags: ['제안서', '기획', '승인', '프로젝트'],
  },
  {
    id: 'team-meeting',
    name: '팀 미팅 자료',
    description: '주간/월간 팀 미팅용 자료',
    category: 'business',
    icon: '👥',
    gradient: 'from-teal-500 to-cyan-600',
    settings: { difficulty: 'medium', volume: 'brief', slideCount: 6, generationStyle: 'standard' },
    slideStructure: ['표지', '안건', '진행 상황', '이슈', '액션 아이템', '마무리'],
    tags: ['미팅', '팀', '주간', '월간'],
  },

  // 크리에이티브
  {
    id: 'product-launch',
    name: '신제품 런칭',
    description: '신제품 발표 및 마케팅 전략',
    category: 'creative',
    icon: '🚀',
    gradient: 'from-purple-500 to-pink-600',
    settings: { difficulty: 'medium', volume: 'standard', slideCount: 10, generationStyle: 'standard' },
    slideStructure: ['표지', '제품 소개', '시장 기회', '핵심 기능', '차별화', '마케팅 전략', '출시 일정', '기대 효과', '결론', 'Q&A'],
    tags: ['제품', '런칭', '마케팅', '전략'],
  },
  {
    id: 'brand-story',
    name: '브랜드 스토리',
    description: '브랜드 아이덴티티 및 미션 전달',
    category: 'creative',
    icon: '✨',
    gradient: 'from-rose-500 to-pink-600',
    settings: { difficulty: 'easy', volume: 'standard', slideCount: 8, generationStyle: 'standard' },
    slideStructure: ['표지', '브랜드 미션', '역사', '가치관', '핵심 제품', '고객 스토리', '미래 비전', '마무리'],
    tags: ['브랜드', '스토리', '미션', '아이덴티티'],
  },
  {
    id: 'creative-pitch',
    name: '크리에이티브 피치',
    description: '아이디어 피치 및 캠페인 제안',
    category: 'creative',
    icon: '🎨',
    gradient: 'from-violet-500 to-purple-600',
    settings: { difficulty: 'medium', volume: 'standard', slideCount: 10, generationStyle: 'standard' },
    slideStructure: ['표지', '캐치프레이즈', '배경', '인사이트', '크리에이티브 컨셉', '매체 전략', '예상 효과', '일정', '예산', '결론'],
    tags: ['피치', '캠페인', '아이디어', '크리에이티브'],
  },

  // 학술
  {
    id: 'research-presentation',
    name: '연구 결과 발표',
    description: '학술 연구 결과 발표 자료',
    category: 'academic',
    icon: '🔬',
    gradient: 'from-emerald-600 to-teal-700',
    settings: { difficulty: 'hard', volume: 'detailed', slideCount: 15, generationStyle: 'kimura' },
    slideStructure: ['표지', '연구 배경', '문헌 연구', '연구 방법', '데이터 분석', '결과', '토론', '한계점', '결론', '참고문헌'],
    tags: ['연구', '학술', '논문', '데이터'],
  },
  {
    id: 'thesis-defense',
    name: '학위 논문 발표',
    description: '석사/박사 학위 논문 발표',
    category: 'academic',
    icon: '🎓',
    gradient: 'from-indigo-600 to-blue-700',
    settings: { difficulty: 'hard', volume: 'comprehensive', slideCount: 20, generationStyle: 'kimura' },
    slideStructure: ['표지', '목차', '연구 배경', '문헌 고찰', '연구 방법', '실험 설계', '결과 분석', '토론', '결론', '향후 연구', '감사의 글'],
    tags: ['논문', '학위', '발표', '연구'],
  },
  {
    id: 'workshop',
    name: '워크숍 자료',
    description: '교육/워크숍용 발표 자료',
    category: 'academic',
    icon: '📚',
    gradient: 'from-cyan-600 to-blue-700',
    settings: { difficulty: 'easy', volume: 'detailed', slideCount: 15, generationStyle: 'standard' },
    slideStructure: ['표지', '오리엔테이션', '학습 목표', '1단계', '2단계', '3단계', '실습', '퀴즈', '요약', 'Q&A'],
    tags: ['워크숍', '교육', '강의', '실습'],
  },

  // 마케팅
  {
    id: 'market-analysis',
    name: '시장 분석 보고서',
    description: '시장 규모 및 경쟁 환경 분석',
    category: 'marketing',
    icon: '📈',
    gradient: 'from-cyan-500 to-blue-600',
    settings: { difficulty: 'hard', volume: 'standard', slideCount: 12, generationStyle: 'kimura' },
    slideStructure: ['표지', '시장 개요', '시장 규모', '성장률', '경쟁사 분석', '자사 포지셔닝', 'SWOT', '기회 요인', '전략 제언', '결론'],
    tags: ['시장', '분석', '경쟁사', '전략'],
  },
  {
    id: 'customer-presentation',
    name: '고객사 발표',
    description: 'B2B 고객사 대상 발표',
    category: 'marketing',
    icon: '🤝',
    gradient: 'from-blue-500 to-indigo-600',
    settings: { difficulty: 'medium', volume: 'standard', slideCount: 10, generationStyle: 'standard' },
    slideStructure: ['표지', '회사 소개', '솔루션 소개', '도입 사례', '기대 효과', '구축 일정', '투자 비용', '지원 체계', '결론', 'Q&A'],
    tags: ['고객사', 'B2B', '솔루션', '제안'],
  },
  {
    id: 'investor-deck',
    name: '투자자 발표',
    description: '투자 유치용 IR 발표',
    category: 'marketing',
    icon: '💰',
    gradient: 'from-amber-500 to-yellow-600',
    settings: { difficulty: 'executive', volume: 'standard', slideCount: 12, generationStyle: 'gptpark' },
    slideStructure: ['표지', '회사 비전', '시장 기회', '비즈니스 모델', '트랙션', '재무 현황', '팀', '투자 계획', '사용 목적', '로드맵', '결론', 'Q&A'],
    tags: ['투자', 'IR', '유치', '재무'],
  },

  // 기술
  {
    id: 'tech-architecture',
    name: '기술 아키텍처 발표',
    description: '시스템 아키텍처 및 설계 발표',
    category: 'technical',
    icon: '⚙️',
    gradient: 'from-gray-600 to-slate-800',
    settings: { difficulty: 'hard', volume: 'standard', slideCount: 10, generationStyle: 'kimura' },
    slideStructure: ['표지', '시스템 개요', '아키텍처 다이어그램', '기술 스택', '데이터 흐름', '보안', '성능', '확장성', '로드맵', '결론'],
    tags: ['아키텍처', '기술', '시스템', '설계'],
  },
  {
    id: 'dev-progress',
    name: '개발 진행 상황',
    description: '스프린트/마일스톤 리뷰',
    category: 'technical',
    icon: '🔧',
    gradient: 'from-slate-500 to-gray-700',
    settings: { difficulty: 'medium', volume: 'brief', slideCount: 6, generationStyle: 'standard' },
    slideStructure: ['표지', '스프린트 요약', '완료 항목', '진행 중', '이슈', '다음 스프린트'],
    tags: ['개발', '스프린트', '진행상황', '마일스톤'],
  },
  {
    id: 'api-documentation',
    name: 'API 문서 발표',
    description: 'API 설계 및 사용법 안내',
    category: 'technical',
    icon: '📡',
    gradient: 'from-indigo-500 to-purple-600',
    settings: { difficulty: 'hard', volume: 'detailed', slideCount: 12, generationStyle: 'kimura' },
    slideStructure: ['표지', 'API 개요', '인증', '엔드포인트 목록', '요청/응답 예시', '에러 처리', '_RATE 제한', 'SDK 사용법', '변경 이력', '결론'],
    tags: ['API', '문서', '기술', '개발자'],
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'business', name: '비즈니스', icon: '💼', color: 'from-slate-500 to-slate-700' },
  { id: 'creative', name: '크리에이티브', icon: '🎨', color: 'from-purple-500 to-pink-600' },
  { id: 'academic', name: '학술', icon: '🎓', color: 'from-emerald-500 to-teal-600' },
  { id: 'marketing', name: '마케팅', icon: '📣', color: 'from-blue-500 to-indigo-600' },
  { id: 'technical', name: '기술', icon: '🔧', color: 'from-gray-500 to-slate-700' },
] as const;

export function getTemplatesByCategory(category: string): TemplatePreset[] {
  return TEMPLATE_LIBRARY.filter(t => t.category === category);
}

export function searchTemplates(query: string): TemplatePreset[] {
  const lower = query.toLowerCase();
  return TEMPLATE_LIBRARY.filter(t =>
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.toLowerCase().includes(lower))
  );
}

export function getTemplateById(id: string): TemplatePreset | undefined {
  return TEMPLATE_LIBRARY.find(t => t.id === id);
}
