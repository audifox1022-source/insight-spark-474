// ============================================================
// ScaledSlide.tsx — PPT 퀄리티 매칭 완전 개선판 (안정화 버전)
// ============================================================
import React, { useState } from 'react';
import {
  ArrowRight, Layers, CheckCircle2,
  TrendingUp, TrendingDown, Minus,
  BarChart3 as BarIcon, Target, Table as TableIcon, Zap,
  CheckCircle, Clock, Circle,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AutoFitContainer } from './AutoFitContainer';

// ══════════════════════════════════════════════════════════════
// 타입
// ══════════════════════════════════════════════════════════════
interface ChartDataPoint { name: string; value: number; value2?: number; }
interface SlideChartData {
  chartType?: 'bar' | 'line' | 'area' | 'pie';
  title?: string;
  data: ChartDataPoint[];
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}
interface SlideMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  description?: string;
}
interface Slide {
  id?: string;
  type?: string;
  title?: string;
  subhead?: string;
  content?: any[];
  points?: any[];
  items?: any[];
  steps?: any[];
  leftItems?: any[];
  rightItems?: any[];
  leftTitle?: string;
  rightTitle?: string;
  infographicType?: string;
  chartData?: SlideChartData;
  tableData?: { headers?: string[]; rows?: any[][] };
  headers?: string[];
  rows?: any[][];
  keyMetrics?: SlideMetric[];
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  titleFontPt?: number;
  contentFontPt?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  imageUrl?: string;
  bgGradient?: string;           // ← 그라디언트 배경 (NEW)
  layout?: string;
  notes?: string;
  text?: string;
  author?: string;
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo'; description?: string }[];
}
interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
  onElementClick?: (text: string) => void;
  onFactCheck?: (text: string, context: any) => void;
  interactive?: boolean;
  directEditMode?: boolean;
  onUpdateSlide?: (updates: Partial<Slide>) => void;
}

// ══════════════════════════════════════════════════════════════
// 팔레트
// ══════════════════════════════════════════════════════════════// 신뢰 비즈니스 (Trust Business) 팔레트
const P = {
  primary: '#0D5C63',            // 딛 틸
  primaryDark: '#064E55',
  accent: '#2EC4B6',             // 민트 그린
  bg: '#F4F9F9',                 // 아이보리 화이트
  text: '#1A1A2E',               // 딛 네이비
  subtext: '#5c7a82',
  border: '#C8DEDE',
  muted: '#EEF6F6',
  dark: '#0D2B2E',               // 딛은 틸 다크
  chartColors: ['#2EC4B6', '#0D5C63', '#27AE60', '#F59E0B', '#EF4444', '#8B5CF6'],
  kpiGradients: [
    'linear-gradient(135deg,#0D5C63 0%,#2EC4B6 100%)',
    'linear-gradient(135deg,#27AE60 0%,#4ADE80 100%)',
    'linear-gradient(135deg,#0369A1 0%,#38BDF8 100%)',
    'linear-gradient(135deg,#6D28D9 0%,#A78BFA 100%)',
    'linear-gradient(135deg,#B45309 0%,#FCD34D 100%)',
    'linear-gradient(135deg,#BE123C 0%,#FB7185 100%)',
  ],
};

// ══════════════════════════════════════════════════════════════
// 유틸리티 함수 & 공통 컴포넌트
// ══════════════════════════════════════════════════════════════
function ptToPx(pt: number): string { return `${(pt * 1.333).toFixed(1)}px`; }

// ✅ 방어 로직: 객체가 들어와도 에러 없이 문자열로 변환
function safeString(item: any): string {
  if (typeof item === 'string') return item;
  if (item === null || item === undefined) return '';
  return JSON.stringify(item);
}

const SectionLabel: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light = false }) => (
  <div style={{ color: light ? 'rgba(255,255,255,0.6)' : P.primary, fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
    {children}
  </div>
);

// BigNumber: 값 길이에 따라 폰트 자동 축소 및 랩핑 허용
const BigNumber: React.FC<{ value: string; unit?: string; light?: boolean }> = ({ value, unit, light = false }) => {
  const len = (value || '').replace(/\s/g, '').length;
  // 글자 수가 길어질수록 폰트를 더 공격적으로 줄임
  const fs = len <= 4 ? '2.8rem' : len <= 6 ? '2.2rem' : len <= 8 ? '1.6rem' : '1.2rem';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap', wordBreak: 'break-word' }}>
      <span style={{ fontSize: fs, fontWeight: 900, color: light ? '#fff' : P.primary, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</span>
      {unit && <span style={{ fontSize: '1rem', fontWeight: 600, color: light ? 'rgba(255,255,255,0.7)' : P.subtext }}>{unit}</span>}
    </div>
  );
};

const SlideBackground: React.FC<{ imageUrl?: string; bgGradient?: string }> = ({ imageUrl, bgGradient }) => {
  const [imgError, setImgError] = useState(false);
  // 그라디언트 배경 (bgGradient 우선, 이미지 없을 때)
  if (bgGradient && (!imageUrl || imgError)) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: bgGradient }} />
    );
  }
  if (!imageUrl || imgError) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <img src={imageUrl} alt="" onError={() => setImgError(true)} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.68) 100%)' }} />
    </div>
  );
};

const InteractiveElement: React.FC<{ 
  children: React.ReactNode; 
  text: string; 
  onClick?: (text: string) => void; 
  interactive?: boolean;
  directEditMode?: boolean;
  onUpdateSlide?: (updates: any) => void;
  onFactCheck?: (text: string, context: any) => void;
  slideContext?: any;
}> = ({ children, text, onClick, interactive, directEditMode, onUpdateSlide, onFactCheck, slideContext }) => {
  if (!interactive && !directEditMode) return <>{children}</>;

  if (directEditMode && onUpdateSlide && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e: any) => {
        const newText = e.target.innerText.replace(/\n\n/g, '\n').trim();
        const oldText = text.trim();
        if (newText !== oldText && newText.length > 0) {
          const s = slideContext;
          if (!s) return;
          if (s.title === oldText || s.title === text) onUpdateSlide({ title: newText });
          else if (s.subhead === oldText || s.subhead === text) onUpdateSlide({ subhead: newText });
          else if (s.text === oldText || s.text === text) onUpdateSlide({ text: newText });
          else if (s.author === oldText || s.author === text) onUpdateSlide({ author: newText });
          else if (s.leftTitle === oldText || s.leftTitle === text) onUpdateSlide({ leftTitle: newText });
          else if (s.rightTitle === oldText || s.rightTitle === text) onUpdateSlide({ rightTitle: newText });
          else if (Array.isArray(s.content)) {
            const idx = s.content.findIndex((c:any) => (typeof c === 'string' ? c.trim() : c) === oldText || c === text);
            if (idx >= 0) {
              const newContent = [...s.content];
              newContent[idx] = newText;
              onUpdateSlide({ content: newContent });
              return;
            }
          }
          if (Array.isArray(s.leftItems)) {
            const idx = s.leftItems.findIndex((c:any) => (typeof c === 'string' ? c.trim() : c) === oldText || c === text);
            if (idx >= 0) {
              const newContent = [...s.leftItems];
              newContent[idx] = newText;
              onUpdateSlide({ leftItems: newContent });
              return;
            }
          }
          if (Array.isArray(s.rightItems)) {
            const idx = s.rightItems.findIndex((c:any) => (typeof c === 'string' ? c.trim() : c) === oldText || c === text);
            if (idx >= 0) {
              const newContent = [...s.rightItems];
              newContent[idx] = newText;
              onUpdateSlide({ rightItems: newContent });
              return;
            }
          }
        }
      },
      onPointerDown: (e: any) => e.stopPropagation(),
      style: {
        ...(children.props.style || {}),
        outline: '1px dashed rgba(79, 70, 229, 0.5)',
        outlineOffset: '4px',
        cursor: 'text',
        minHeight: '1em',
        borderRadius: '2px',
        transition: 'all 0.2s',
      }
    } as any);
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(text);
      }}
      className="group/element relative cursor-pointer outline-none hover:ring-2 hover:ring-primary/50 hover:bg-primary/5 transition-all rounded-md -m-1 p-1"
      title={onFactCheck ? "클릭하여 AI 편집 / 우측의 아이콘으로 팩트 확인" : "클릭하여 AI로 편집하기"}
    >
      {children}
      {onFactCheck && text && text.length >= 2 && (
        <button
          onClick={(e) => { e.stopPropagation(); onFactCheck(text, slideContext); }}
          className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/element:opacity-100 bg-white/90 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-full p-1.5 shadow-md transition-all z-20 flex items-center justify-center transform scale-90 hover:scale-100"
          title="이 텍스트의 팩트(사실 관계) 확인하기"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <div style={{ marginBottom: 4, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      {payload.map((p: any, i: number) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

const EmptyPlaceholder = ({ icon: Icon, label }: { icon: React.FC<any>; label: string }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.muted, borderRadius: 16, border: `2px dashed ${P.border}`, color: '#94a3b8', flexDirection: 'column', gap: 10 }}>
    <Icon style={{ width: 40, height: 40, opacity: 0.25 }} />
    <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ 핵심 개선: 내부 컴포넌트들을 함수 밖으로 완전히 분리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SlideLogo = ({ logoUrl, invert = false }: { logoUrl?: string; invert?: boolean }) => {
  if (!logoUrl) return null;
  return (
    <div style={{ position: 'absolute', top: '1.3rem', right: '1.8rem', width: '5.5rem', height: '2.8rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 }}>
      <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: invert ? 'brightness(0) invert(1)' : undefined }} />
    </div>
  );
};

const SlideNumber = ({ number, light = false }: { number?: number; light?: boolean }) => {
  if (!number) return null;
  return (
    <div style={{ position: 'absolute', bottom: '1rem', left: '2rem', display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 }}>
      <div style={{ width: '1.9rem', height: '1.9rem', borderRadius: '50%', background: light ? 'rgba(255,255,255,0.25)' : `linear-gradient(135deg,${P.primary},${P.primaryDark})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700 }}>
        {number}
      </div>
    </div>
  );
};

const SlideWatermark = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.03, transform: 'rotate(-30deg)', fontSize: '9rem', fontWeight: 900, color: '#000', userSelect: 'none', zIndex: 2 }}>
      {text}
    </div>
  );
};


// ══════════════════════════════════════════════════════════════
// 렌더러 함수들
// ══════════════════════════════════════════════════════════════
// renderChart: 차트 렌더러 (고정 높이로 ResponsiveContainer 사용 — flex:1 문제 해결)
function renderChart(cd?: SlideChartData) {
  if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;
  const colors = P.chartColors;
  // value가 문자열이면 숫자로 변환
  const safeData = cd.data.map(d => ({
    ...d,
    value: typeof d.value === 'string' ? parseFloat(d.value) || 0 : (d.value ?? 0),
    value2: d.value2 !== undefined ? (typeof d.value2 === 'string' ? parseFloat(d.value2) || 0 : d.value2) : undefined,
  }));
  const common = { data: safeData, margin: { top: 10, right: 24, bottom: 50, left: 0 } };
  const axisTick = { fill: '#94a3b8', fontSize: 11 };
  const xTickProps = { angle: -20, textAnchor: 'end' as const, interval: 0 };

  if (cd.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={safeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" paddingAngle={3} label={(e) => `${e.name}: ${(e.percent! * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
            {safeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (cd.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
          <XAxis dataKey="name" tick={{ ...axisTick, ...xTickProps }} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Line type="monotone" dataKey="value" name={cd.series1Label ?? '시리즈1'} stroke={colors[0]} strokeWidth={3} dot={{ r: 5, fill: colors[0] }} activeDot={{ r: 7 }} />
          {safeData[0]?.value2 !== undefined && <Line type="monotone" dataKey="value2" name={cd.series2Label ?? '시리즈2'} stroke={colors[1]} strokeWidth={3} dot={{ r: 5, fill: colors[1] }} />}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (cd.chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart {...common}>
          <defs>
            <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
          <XAxis dataKey="name" tick={{ ...axisTick, ...xTickProps }} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Area type="monotone" dataKey="value" name={cd.series1Label ?? '시리즈1'} stroke={colors[0]} strokeWidth={3} fill="url(#ag1)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  // 기본: 바 차트
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart {...common} barSize={safeData.length > 6 ? 14 : safeData[0]?.value2 !== undefined ? 12 : 24}>
        <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
        <XAxis dataKey="name" tick={{ ...axisTick, ...xTickProps }} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {cd.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Bar dataKey="value" name={cd.series1Label ?? '데이터'} radius={[6, 6, 0, 0]}>
          {safeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
        {safeData[0]?.value2 !== undefined && <Bar dataKey="value2" name={cd.series2Label ?? '시리즈2'} fill={colors[1]} radius={[6, 6, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function renderTimeline(slide: Slide, contentFontSize: string) {
  const milestones = slide.milestones ?? [];
  const stateConfig = {
    done: { icon: <CheckCircle style={{ width: 20, height: 20 }} />, color: P.primary, bg: P.primary },
    next: { icon: <Clock style={{ width: 20, height: 20 }} />, color: '#f59e0b', bg: '#f59e0b' },
    todo: { icon: <Circle style={{ width: 20, height: 20 }} />, color: '#94a3b8', bg: '#e2e8f0' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', left: '19px', top: '20px', bottom: '20px', width: '2px', background: `linear-gradient(to bottom, ${P.primary}, #e2e8f0)`, zIndex: 0 }} />
      {milestones.map((m, i) => {
        const cfg = stateConfig[m.state] ?? stateConfig.todo;
        return (
          <div key={i} style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start', position: 'relative', paddingBottom: '1.4rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: m.state === 'done' ? P.primary : m.state === 'next' ? '#fef3c7' : '#f1f5f9', color: m.state === 'done' ? '#fff' : cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${m.state === 'done' ? P.primary : m.state === 'next' ? '#f59e0b' : '#e2e8f0'}`, zIndex: 1, boxShadow: m.state === 'done' ? `0 0 0 4px ${P.primary}22` : undefined }}>
              {cfg.icon}
            </div>
            <div style={{ flex: 1, background: m.state === 'done' ? `${P.primary}08` : P.muted, borderRadius: 12, padding: '0.8rem 1.2rem', border: `1px solid ${m.state === 'done' ? `${P.primary}22` : P.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: contentFontSize, fontWeight: 700, color: P.text }}>{m.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: m.state === 'done' ? `${P.primary}18` : m.state === 'next' ? '#fef3c7' : P.border, color: m.state === 'done' ? P.primary : m.state === 'next' ? '#d97706' : '#94a3b8' }}>{m.date}</span>
              </div>
              {m.description && <p style={{ fontSize: '0.85em', color: P.subtext, margin: 0, lineHeight: 1.5 }}>{m.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderSplitLayout(slide: Slide, titleFontSize: string, contentFontSize: string, isRight: boolean) {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const visualRatio = slide.visualRatio ?? 45;
  const textRatio = 100 - visualRatio;

  const textPanel = (
    <div style={{ flex: textRatio, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
      <SectionLabel>{slide.type?.toUpperCase() ?? 'SLIDE'}</SectionLabel>
      <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0 }}>{slide.title}</h2>
      {slide.subhead && <p style={{ fontSize: contentFontSize, color: P.primary, fontWeight: 600, margin: 0 }}>{slide.subhead}</p>}
      <div style={{ width: '3rem', height: '3px', background: P.primary, borderRadius: 2 }} />
      <AutoFitContainer style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {rawContent.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.4rem 0' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${P.primary}15, ${P.primary}05)`, color: P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, marginTop: '2px', border: `1px solid ${P.primary}30`, boxShadow: `0 2px 8px ${P.primary}20` }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <span style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.6, fontWeight: 500 }}>{safeString(item)}</span>
            </div>
          ))}
        </div>
      </AutoFitContainer>
    </div>
  );

  const visualPanel = (
    <div style={{ flex: visualRatio, background: `linear-gradient(145deg, ${P.primary}08 0%, transparent 100%)`, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(0,0,0,0.05)`, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
      <SlideBackground imageUrl={slide.imageUrl} />
      {!slide.imageUrl && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '6rem', fontWeight: 900, color: `${P.primary}15`, lineHeight: 1, filter: 'blur(2px)' }}>{String(slide.slideNumber ?? '').padStart(2, '0')}</div>
        </div>
      )}
    </div>
  );

   return <div style={{ display: 'flex', gap: '2.5rem', height: '100%', alignItems: 'stretch' }}>{isRight ? <>{textPanel}{visualPanel}</> : <>{visualPanel}{textPanel}</>}</div>;
}

function renderGridCards(slide: Slide, contentFontSize: string, interactive?: boolean, onElementClick?: (text: string) => void) {
  const items = slide.content ?? slide.points ?? slide.items ?? [];
  const cols = items.length <= 2 ? 2 : items.length <= 4 ? 2 : 3;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1.2rem', width: '100%' }}>
      {items.map((item, i) => (
        <InteractiveElement key={i} text={safeString(item)} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
          <div style={{ background: i === 0 ? `linear-gradient(135deg, ${P.primary}, ${P.primaryDark})` : '#fff', borderRadius: 20, padding: '1.6rem 1.4rem', border: `1px solid ${i === 0 ? 'transparent' : 'rgba(0,0,0,0.04)'}`, display: 'flex', flexDirection: 'column', gap: '0.8rem', boxShadow: i === 0 ? `0 16px 32px -8px ${P.primary}60` : '0 8px 24px -8px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden', height: '100%' }}>
            {i === 0 && <div style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '60%', background: '#fff', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, zIndex: 0 }} />}
            <div style={{ width: 40, height: 40, borderRadius: 12, background: i === 0 ? 'rgba(255,255,255,0.2)' : `${P.primary}10`, color: i === 0 ? '#fff' : P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 900, zIndex: 1, boxShadow: i === 0 ? 'inset 0 0 10px rgba(255,255,255,0.2)' : 'none' }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <p style={{ fontSize: contentFontSize, lineHeight: 1.6, margin: 0, color: i === 0 ? '#fff' : P.text, fontWeight: i === 0 ? 600 : 500, zIndex: 1 }}>
              {safeString(item)}
            </p>
          </div>
        </InteractiveElement>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ScaledSlide — 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export const BaseScaledSlide = ({
  slide, containerClassName = '', logoUrl, watermark, onElementClick, onFactCheck, interactive, directEditMode, onUpdateSlide
}: ScaledSlideProps) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content = Array.isArray(rawContent) ? rawContent : [];

  const titleFontSize = slide.titleFontPt ? ptToPx(slide.titleFontPt) : ptToPx((slide.titleSizeScale ?? 1) * 36);
  const contentFontSize = slide.contentFontPt ? ptToPx(slide.contentFontPt) : ptToPx((slide.contentSizeScale ?? 1) * 20);
  const layout = slide.layout ?? 'default';

  // ── 1. 표지 슬라이드
  if (slide.type === 'title') {
    // bgGradient가 있으면 사용자 정의 배경, 없으면 틸 그라디언트
    const titleBg = slide.bgGradient
      ? slide.bgGradient
      : `linear-gradient(135deg, ${P.dark} 0%, ${P.primary} 60%, ${P.accent} 100%)`;
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: titleBg, color: '#fff', fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif" }}>
        {/* 수직 색인 라인 안내선 */}
        <div style={{ position: 'absolute', top: 0, right: '28%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.07)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 0, right: '14%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.04)', zIndex: 0 }} />
        {/* 앱보 글로우 구 Orb */}
        <div style={{ position: 'absolute', top: '-15%', right: '5%', width: '55%', height: '90%', background: 'rgba(46,196,182,0.18)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: '40%', height: '60%', background: 'rgba(255,255,255,0.07)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />
        {/* 이미지 오버레이 */}
        {slide.imageUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <img src={slide.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />
            <div style={{ position: 'absolute', inset: 0, background: titleBg.replace(')', ', 0.75)').replace('linear-gradient(', 'linear-gradient(') }} />
          </div>
        )}
        {/* 좌측 콘텐츠 */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: P.accent, zIndex: 2, boxShadow: `0 0 24px ${P.accent}80` }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', background: 'rgba(255,255,255,0.12)', zIndex: 2 }} />
        <SlideWatermark text={watermark} />
        <SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 5% 0 8%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '4px 14px', width: 'fit-content' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: P.accent }} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.9)' }}>PRESENTATION</span>
          </div>
          <InteractiveElement text={slide.title || ''} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
            <h1 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.03em', margin: 0, maxWidth: '72%', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>{slide.title}</h1>
          </InteractiveElement>
          {slide.subhead && <p style={{ fontSize: contentFontSize, color: 'rgba(255,255,255,0.75)', fontWeight: 500, margin: 0, maxWidth: '60%', lineHeight: 1.5 }}>{slide.subhead}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '3rem', height: '3px', background: P.accent, borderRadius: 2 }} />
            <div style={{ width: '1.2rem', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          </div>
          {content.length > 0 && <p style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.5)', maxWidth: '60%', lineHeight: 1.6, margin: 0 }}>{safeString(content[0])}</p>}
        </div>
        <SlideNumber number={slide.slideNumber} light />
      </div>
    );
  }

  // ── 2. 섹션 구분 슬라이드
  if (slide.type === 'section') {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${P.primaryDark} 0%, ${P.primary} 100%)`, color: '#fff', fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", display: 'flex', alignItems: 'center' }}>
        {/* Modern Glass Rings */}
        <div style={{ position: 'absolute', right: '-15%', top: '50%', transform: 'translateY(-50%)', width: '55%', paddingBottom: '55%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.01))', backdropFilter: 'blur(8px)', zIndex: 0, boxShadow: 'inset 0 0 40px rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', width: '30%', paddingBottom: '30%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02))', backdropFilter: 'blur(12px)', zIndex: 0 }} />
        <SlideWatermark text={watermark} />
        <SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 5% 0 7%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {slide.slideNumber && <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>{String(slide.slideNumber).padStart(2, '0')}</div>}
          <InteractiveElement text={slide.title || ''} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
            <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: 0 }}>{slide.title}</h2>
          </InteractiveElement>
          {content[0] && (
            <InteractiveElement text={safeString(content[0])} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
              <p style={{ fontSize: contentFontSize, color: 'rgba(255,255,255,0.75)', margin: 0, maxWidth: '60%' }}>{safeString(content[0])}</p>
            </InteractiveElement>
          )}
        </div>
        <SlideNumber number={slide.slideNumber} light />
      </div>
    );
  }

  // ── 3. KPI 슬라이드
  if (slide.type === 'kpi' && slide.keyMetrics?.length) {
    const metrics = slide.keyMetrics;
    const cols = metrics.length <= 2 ? 2 : metrics.length <= 4 ? 4 : 3;
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
        {/* Subtle Ambient Background for KPI */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '40%', background: P.primary, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.05, pointerEvents: 'none' }} />
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><SlideBackground imageUrl={slide.imageUrl} bgGradient={slide.bgGradient} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div><SectionLabel>KPI METRICS</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.8rem', flex: 1 }}>
            {metrics.map((m, i) => {
              const isFirst = i === 0;
              return (
                <div key={i} style={{ borderRadius: 24, padding: '1.4rem 1.2rem', background: isFirst ? P.kpiGradients[0] : 'rgba(255,255,255,0.6)', border: `1px solid ${isFirst ? 'transparent' : 'rgba(241, 245, 249, 0.8)'}`, boxShadow: isFirst ? `0 20px 40px -10px ${P.primary}40` : '0 10px 30px -10px rgba(0,0,0,0.06)', backdropFilter: isFirst ? 'none' : 'blur(16px)', display: 'flex', flexDirection: 'column', gap: '0.8rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Glass Shimmer */}
                  {isFirst && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)', pointerEvents: 'none' }} />}
                   <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: isFirst ? 'rgba(255,255,255,0.7)' : P.subtext, flex: '1 1 auto', wordBreak: 'keep-all' }}>{m.label}</div>
                  
                  <div className="relative group/fact">
                    <BigNumber value={m.value} light={isFirst} />
                    {interactive && onFactCheck && (
                       <button
                         onClick={(e) => { e.stopPropagation(); onFactCheck(String(m.value) + ' ' + m.label, slide); }}
                         className="absolute -right-2 -top-2 opacity-0 group-hover/fact:opacity-100 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-1 shadow-md transition-all z-10"
                         title="이 수치의 팩트(사실) 확인하기"
                       >
                         <CheckCircle2 className="w-3.5 h-3.5" />
                       </button>
                    )}
                  </div>

                  {m.trend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {m.trend === 'up' && <TrendingUp style={{ width: 16, height: 16, flexShrink: 0, flexShrink: 0, color: isFirst ? 'rgba(255,255,255,0.8)' : '#10b981' }} />}
                      {m.trend === 'down' && <TrendingDown style={{ width: 16, height: 16, flexShrink: 0, flexShrink: 0, color: '#ef4444' }} />}
                      {m.trend === 'flat' && <Minus style={{ width: 16, height: 16, flexShrink: 0, flexShrink: 0, color: isFirst ? 'rgba(255,255,255,0.5)' : '#94a3b8' }} />}
                      {m.description && <span style={{ fontSize: '0.78em', color: isFirst ? 'rgba(255,255,255,0.7)' : P.subtext, flex: '1 1 auto', wordBreak: 'keep-all' }}>{m.description}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <SlideNumber number={slide.slideNumber} />
      </div>
    );
  }

  // ── 4. 타임라인 슬라이드
  if (slide.type === 'timeline' && slide.milestones?.length) {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><SlideBackground imageUrl={slide.imageUrl} bgGradient={slide.bgGradient} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', gap: '3rem' }}>
          <div style={{ width: '28%', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
            <SectionLabel>TIMELINE</SectionLabel>
            <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2>
            {content[0] && <p style={{ fontSize: contentFontSize, color: P.subtext, lineHeight: 1.6, margin: 0 }}>{safeString(content[0])}</p>}
            <div style={{ width: '3rem', height: '3px', background: P.primary, borderRadius: 2 }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>{renderTimeline(slide, contentFontSize)}</div>
        </div>
        <SlideNumber number={slide.slideNumber} />
      </div>
    );
  }

  // ── 5. 인용 슬라이드
  if (slide.type === 'quote') {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.dark, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50%', paddingBottom: '50%', borderRadius: '50%', background: `${P.primary}12`, zIndex: 0 }} />
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 10%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ fontSize: '5rem', lineHeight: 1, color: P.primary, fontWeight: 900, opacity: 0.4 }}>"</div>
          <p style={{ fontSize: titleFontSize, fontWeight: 700, color: '#fff', lineHeight: 1.4, margin: 0, letterSpacing: '-0.01em' }}>{slide.text ?? slide.title}</p>
          {slide.author && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
              <div style={{ width: '2rem', height: '2px', background: P.primary }} />
              <span style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{slide.author}</span>
              <div style={{ width: '2rem', height: '2px', background: P.primary }} />
            </div>
          )}
        </div>
        <SlideNumber number={slide.slideNumber} light />
      </div>
    );
  }

  // ── 6. 비교 슬라이드
  if (slide.type === 'compare') {
    const leftItems = slide.leftItems ?? [];
    const rightItems = slide.rightItems ?? [];
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div><SectionLabel>COMPARISON</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '1rem', flex: 1 }}>

            {/* Left Glass Panel */}
            <div style={{ background: `linear-gradient(145deg, rgba(78,131,249,0.06), rgba(78,131,249,0.02))`, borderRadius: 24, padding: '1.4rem 1.2rem', border: `1px solid rgba(78,131,249,0.15)`, boxShadow: '0 8px 24px rgba(78,131,249,0.05)', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.15em', color: P.primary, marginBottom: '1.2rem' }}>{(slide.leftTitle ?? 'BEFORE').toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {leftItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.primary, marginTop: '0.45em', flexShrink: 0 }} />
                    <span style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.5 }}>{safeString(item)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>VS</div>
            </div>

            {/* Right Glass Panel */}
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: '1.4rem 1.2rem', border: `1px solid rgba(226,232,240,0.8)`, boxShadow: '0 8px 24px rgba(0,0,0,0.03)', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.15em', color: P.text, marginBottom: '1.2rem' }}>{(slide.rightTitle ?? 'AFTER').toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {rightItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', marginTop: '0.45em', flexShrink: 0 }} />
                    <span style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.5 }}>{safeString(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <SlideNumber number={slide.slideNumber} />
      </div>
    );
  }

  // ── 7. 차트 슬라이드
  if (slide.type === 'chart' || slide.chartData) {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><SectionLabel>DATA VISUALIZATION</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div>
          <div style={{ minHeight: 240 }}>{renderChart(slide.chartData)}</div>
        </div>
        <SlideNumber number={slide.slideNumber} />
      </div>
    );
  }

  // ── 8. 표 슬라이드
  const tableHeaders = slide.tableData?.headers ?? slide.headers ?? [];
  const tableRows = slide.tableData?.rows ?? slide.rows ?? [];
  if (slide.type === 'table' || (tableHeaders.length > 0 && tableRows.length > 0)) {
    // 행 수에 따라 폰트와 패딩을 자동으로 줄여서 스크롤 없이 한 화면에 표시
    const rowCount = tableRows.length;
    const autoFontScale = rowCount <= 5 ? 1 : rowCount <= 8 ? 0.85 : rowCount <= 12 ? 0.72 : 0.62;
    const autoTableFontSize = `calc(${contentFontSize} * ${autoFontScale})`;
    const cellPad = rowCount <= 5 ? '0.6rem 1rem' : rowCount <= 8 ? '0.42rem 0.85rem' : '0.3rem 0.7rem';
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '4.5% 6%' }}>
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div><SectionLabel>DATA TABLE</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div>
          {/* overflowY 제거 — 스크롤 없이 슬라이드 안에 딱 맞게 표시 */}
          <div style={{ flex: 1, overflow: 'hidden', borderRadius: 16, border: `1px solid ${P.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: autoTableFontSize, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg,${P.primary},${P.primaryDark})` }}>
                  {tableHeaders.map((h, i) => <th key={i} style={{ padding: cellPad, color: '#fff', fontWeight: 700, textAlign: 'left', letterSpacing: '0.04em', wordBreak: 'keep-all' }}>{safeString(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : P.muted, borderBottom: `1px solid ${P.border}` }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: cellPad, color: ci === 0 ? P.text : P.subtext, fontWeight: ci === 0 ? 600 : 400, wordBreak: 'keep-all', lineHeight: 1.4 }}>{safeString(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <SlideNumber number={slide.slideNumber} />
      </div>
    );
  }

  // ── 9. 마무리/결론 슬라이드
  if (slide.type === 'closing' || slide.type === 'action' || slide.type === 'summary') {
    const closingBg = slide.bgGradient
      ? slide.bgGradient
      : `linear-gradient(135deg, ${P.primary} 0%, ${P.dark} 50%, ${P.primaryDark} 100%)`;
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: closingBg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif" }}>
        {/* 닷 (마스키로 사용) */}
        <div style={{ position: 'absolute', right: '-8%', bottom: '-10%', width: '55%', paddingBottom: '55%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', zIndex: 0 }} />
        <div style={{ position: 'absolute', right: '8%', bottom: '8%', width: '30%', paddingBottom: '30%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '35%', paddingBottom: '35%', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: P.accent, zIndex: 2, boxShadow: `0 0 20px ${P.accent}80` }} />
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 5% 0 8%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.6rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '4px 14px', width: 'fit-content' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: P.accent }} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.9)' }}>NEXT STEPS</span>
          </div>
          <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>{slide.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '3rem', height: '3px', background: P.accent, borderRadius: 2 }} />
            <div style={{ width: '1.2rem', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          </div>
          {content.length > 0 && (
            <AutoFitContainer style={{ flex: 1, minHeight: 0 }} maxScaleDown={0.75}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {content.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>{i + 1}</div>
                    <span style={{ fontSize: contentFontSize, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>{safeString(item)}</span>
                  </div>
                ))}
              </div>
            </AutoFitContainer>
          )}
        </div>
        <SlideNumber number={slide.slideNumber} light />
      </div>
    );
  }

  // ── 10. Split / Grid 레이아웃
  if (layout === 'split-left') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 6%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{renderSplitLayout(slide, titleFontSize, contentFontSize, false)}</div><SlideNumber number={slide.slideNumber} /></div>;
  if (layout === 'split-right') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 6%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{renderSplitLayout(slide, titleFontSize, contentFontSize, true)}</div><SlideNumber number={slide.slideNumber} /></div>;
  if (layout === 'grid') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}><div><SectionLabel>{slide.type?.toUpperCase() ?? 'SLIDE'}</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div><div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>{renderGridCards(slide, contentFontSize, interactive, onElementClick)}</div></div><SlideNumber number={slide.slideNumber} /></div>;

  // ── 11. 기본 콘텐츠 슬라이드 (전면 리디자인)
  return (
    <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: slide.bgGradient ? slide.bgGradient : P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
      {/* 외측 액센트 바 */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: `linear-gradient(to bottom, ${P.primary}, ${P.accent})`, zIndex: 2 }} />
      {/* 배경 일관성 원 */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '35%', paddingBottom: '35%', background: `${P.primary}06`, borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
      <SlideBackground imageUrl={slide.imageUrl} bgGradient={undefined} />
      <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.8rem' }}>
        <div style={{ flexShrink: 0, borderLeft: `3px solid ${P.accent}`, paddingLeft: '1rem' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', color: P.primary, textTransform: 'uppercase', marginBottom: '0.3rem' }}>{slide.type ?? 'CONTENT'}</div>
          <InteractiveElement text={slide.title || ''} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
            <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: slide.bgGradient ? '#fff' : P.text, lineHeight: 1.18, margin: 0, letterSpacing: '-0.02em' }}>{slide.title}</h2>
          </InteractiveElement>
          {slide.subhead && <p style={{ fontSize: '0.85em', color: slide.bgGradient ? 'rgba(255,255,255,0.7)' : P.primary, fontWeight: 600, margin: '0.4rem 0 0', lineHeight: 1.4 }}>{slide.subhead}</p>}
        </div>
        <AutoFitContainer style={{ flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'flex-start' }}>
            {content.map((item, i) => (
              <InteractiveElement key={i} text={safeString(item)} onClick={onElementClick} interactive={interactive} directEditMode={directEditMode} onUpdateSlide={onUpdateSlide} onFactCheck={onFactCheck} slideContext={slide}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.55rem 0.9rem', borderRadius: 12, background: i === 0 ? `${P.primary}0D` : 'rgba(255,255,255,0.5)', border: `1px solid ${i === 0 ? `${P.primary}20` : 'rgba(0,0,0,0.03)'}`, backdropFilter: 'blur(4px)' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: i === 0 ? `linear-gradient(135deg,${P.primary},${P.accent})` : `${P.primary}18`, color: i === 0 ? '#fff' : P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p style={{ fontSize: contentFontSize, color: slide.bgGradient ? '#fff' : P.text, lineHeight: 1.58, margin: 0, flex: 1, fontWeight: i === 0 ? 600 : 400 }}>{safeString(item)}</p>
                </div>
              </InteractiveElement>
            ))}
          </div>
        </AutoFitContainer>
      </div>
      <SlideNumber number={slide.slideNumber} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 자유 편집(Custom Text) 레이어 & HOC Wrapper
// ══════════════════════════════════════════════════════════════
import { motion } from 'framer-motion';

const SlideCustomLayer = ({ slide, directEditMode, onUpdateSlide }: any) => {
  if (!slide.customTextBoxes?.length && !directEditMode) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {slide.customTextBoxes?.map((box: any) => (
         <motion.div 
           key={box.id} 
           drag={directEditMode}
           dragMomentum={false}
           onDragEnd={(e, info) => {
              if (directEditMode && onUpdateSlide) {
                const newBoxes = slide.customTextBoxes.map((b: any) => 
                  b.id === box.id ? { ...b, x: b.x + info.offset.x, y: b.y + info.offset.y } : b
                );
                onUpdateSlide({ customTextBoxes: newBoxes });
              }
           }}
           initial={{ x: box.x, y: box.y }}
           animate={{ x: box.x, y: box.y }}
           style={{ 
             position: 'absolute', left: 0, top: 0, pointerEvents: directEditMode ? 'auto' : 'none',
             padding: '4px', border: directEditMode ? '1px dashed #4f46e5' : '1px solid transparent',
             background: directEditMode ? 'rgba(79,70,229,0.05)' : 'transparent',
             cursor: directEditMode ? 'move' : 'default', minWidth: 60, minHeight: 30
           }}
           onClick={(e: any) => { if(directEditMode) e.stopPropagation(); }}
         >
           {directEditMode ? (
             <textarea 
               value={box.text}
               onChange={e => {
                  const newBoxes = slide.customTextBoxes.map((b: any) => 
                    b.id === box.id ? { ...b, text: e.target.value } : b
                  );
                  onUpdateSlide?.({ customTextBoxes: newBoxes });
               }}
               style={{ 
                 background: 'transparent', border: 'none', outline: 'none', color: box.color,
                 fontSize: box.fontSize, fontWeight: box.fontWeight,
                 width: '100%', minHeight: '100%', resize: 'none', whiteSpace: 'pre-wrap', overflow: 'hidden'
               }}
               onPointerDown={(e) => e.stopPropagation()} // textarea 스크롤/선택용
             />
           ) : (
             <div style={{ fontSize: box.fontSize, color: box.color, fontWeight: box.fontWeight, whiteSpace: 'pre-wrap' }}>
               {box.text}
             </div>
           )}
           {directEditMode && (
             <button 
               onPointerDown={(e) => {
                 e.stopPropagation();
                 onUpdateSlide?.({ customTextBoxes: slide.customTextBoxes.filter((b: any) => b.id !== box.id) });
               }} 
               style={{ position: 'absolute', top: -10, right: -10, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
               title="삭제"
             >
               ×
             </button>
           )}
         </motion.div>
      ))}
      {directEditMode && (
        <button 
          onClick={(e) => {
             e.stopPropagation();
             const newBox = { id: 'box_'+Date.now(), text: '텍스트 입력', x: 50, y: 50, fontSize: 24, color: slide.bgGradient ? '#fff' : '#1e293b', fontWeight: 'bold' };
             onUpdateSlide?.({ customTextBoxes: [...(slide.customTextBoxes || []), newBox] });
          }}
          style={{ position: 'absolute', bottom: 20, right: 20, background: '#4f46e5', color: '#fff', padding: '10px 20px', borderRadius: 24, border: 'none', cursor: 'pointer', pointerEvents: 'auto', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(79,70,229,0.3)', zIndex: 110 }}
        >
          + 새 글상자 추가
        </button>
      )}
    </div>
  );
};

export const ScaledSlide: React.FC<ScaledSlideProps> = (props) => {
  const element = BaseScaledSlide(props);
  if (!element || !React.isValidElement(element)) return element as any;

  return React.cloneElement(
    element as React.ReactElement,
    {},
    ...React.Children.toArray((element.props as any).children),
    <SlideCustomLayer key="custom-layer" slide={props.slide} directEditMode={props.directEditMode} onUpdateSlide={props.onUpdateSlide} />
  );
};

export default ScaledSlide;
