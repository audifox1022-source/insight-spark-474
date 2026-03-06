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
  content?: any[]; // string[] 에서 any[]로 변경하여 안정성 확보
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
}

// ══════════════════════════════════════════════════════════════
// 팔레트
// ══════════════════════════════════════════════════════════════
const P = {
  primary: '#4E83F9',
  primaryDark: '#2563EB',
  bg: '#ffffff',
  text: '#242424',
  subtext: '#64748b',
  border: '#e2e8f0',
  muted: '#f8fafc',
  dark: '#1a2133',
  chartColors: ['#4E83F9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  kpiGradients: [
    'linear-gradient(135deg,#4E83F9 0%,#2563EB 100%)',
    'linear-gradient(135deg,#10b981 0%,#059669 100%)',
    'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
    'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
    'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)',
    'linear-gradient(135deg,#06b6d4 0%,#0284c7 100%)',
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

const BigNumber: React.FC<{ value: string; unit?: string; light?: boolean }> = ({ value, unit, light = false }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
    <span style={{ fontSize: '3.6rem', fontWeight: 900, color: light ? '#fff' : P.primary, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</span>
    {unit && <span style={{ fontSize: '1.2rem', fontWeight: 600, color: light ? 'rgba(255,255,255,0.7)' : P.subtext }}>{unit}</span>}
  </div>
);

const SlideBackground: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const [imgError, setImgError] = useState(false);
  if (!imageUrl || imgError) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <img src={imageUrl} alt="" onError={() => setImgError(true)} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.68) 100%)' }} />
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
function renderChart(cd?: SlideChartData) {
  if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;
  const colors = P.chartColors;
  const common = { data: cd.data, margin: { top: 10, right: 20, bottom: 10, left: 0 } };
  const axisTick = { fill: '#94a3b8', fontSize: 13 };

  if (cd.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={cd.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" paddingAngle={3} label={(e) => `${e.name}: ${(e.percent! * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
            {cd.data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (cd.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
          <Line type="monotone" dataKey="value" name={cd.series1Label ?? '시리즈1'} stroke={colors[0]} strokeWidth={3} dot={{ r: 5, fill: colors[0] }} />
          {cd.data[0]?.value2 !== undefined && <Line type="monotone" dataKey="value2" name={cd.series2Label ?? '시리즈2'} stroke={colors[1]} strokeWidth={3} dot={{ r: 5, fill: colors[1] }} />}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (cd.chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...common}>
          <defs>
            <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
          <Area type="monotone" dataKey="value" name={cd.series1Label ?? '시리즈1'} stroke={colors[0]} strokeWidth={3} fill="url(#ag1)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart {...common} barSize={cd.data[0]?.value2 !== undefined ? 14 : 22}>
        <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
        <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
        <Bar dataKey="value" name={cd.series1Label ?? '시리즈1'} fill={colors[0]} radius={[4, 4, 0, 0]} />
        {cd.data[0]?.value2 !== undefined && <Bar dataKey="value2" name={cd.series2Label ?? '시리즈2'} fill={colors[1]} radius={[4, 4, 0, 0]} />}
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

function renderGridCards(slide: Slide, contentFontSize: string) {
  const items = slide.content ?? slide.points ?? slide.items ?? [];
  const cols = items.length <= 2 ? 2 : items.length <= 4 ? 2 : 3;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1.2rem', width: '100%' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: i === 0 ? `linear-gradient(135deg, ${P.primary}, ${P.primaryDark})` : '#fff', borderRadius: 20, padding: '1.6rem 1.4rem', border: `1px solid ${i === 0 ? 'transparent' : 'rgba(0,0,0,0.04)'}`, display: 'flex', flexDirection: 'column', gap: '0.8rem', boxShadow: i === 0 ? `0 16px 32px -8px ${P.primary}60` : '0 8px 24px -8px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
          {i === 0 && <div style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '60%', background: '#fff', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, zIndex: 0 }} />}
          <div style={{ width: 40, height: 40, borderRadius: 12, background: i === 0 ? 'rgba(255,255,255,0.2)' : `${P.primary}10`, color: i === 0 ? '#fff' : P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 900, zIndex: 1, boxShadow: i === 0 ? 'inset 0 0 10px rgba(255,255,255,0.2)' : 'none' }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <p style={{ fontSize: contentFontSize, lineHeight: 1.6, margin: 0, color: i === 0 ? '#fff' : P.text, fontWeight: i === 0 ? 600 : 500, zIndex: 1 }}>
            {safeString(item)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ScaledSlide — 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide, containerClassName = '', logoUrl, watermark,
}) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content = Array.isArray(rawContent) ? rawContent : [];

  const titleFontSize = slide.titleFontPt ? ptToPx(slide.titleFontPt) : ptToPx((slide.titleSizeScale ?? 1) * 36);
  const contentFontSize = slide.contentFontPt ? ptToPx(slide.contentFontPt) : ptToPx((slide.contentSizeScale ?? 1) * 20);
  const layout = slide.layout ?? 'default';

  // ── 1. 타이틀 슬라이드
  if (slide.type === 'title') {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: `radial-gradient(110% 110% at 80% 0%, #1e293b 0%, #0f172a 100%)`, color: '#fff', fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif" }}>
        {/* Ambient Glow Orbs */}
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '60%', background: P.primary, borderRadius: '50%', filter: 'blur(140px)', opacity: 0.15, zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%', background: P.primaryDark, borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2, zIndex: 0 }} />

        <SlideBackground imageUrl={slide.imageUrl} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: `linear-gradient(to bottom, ${P.primary}, #fff)`, zIndex: 1, boxShadow: `0 0 20px ${P.primary}80` }} />
        <SlideWatermark text={watermark} />
        <SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 5% 0 7%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.2rem' }}>
          <SectionLabel light>PRESENTATION</SectionLabel>
          <h1 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.025em', margin: 0, maxWidth: '75%' }}>{slide.title}</h1>
          {slide.subhead && <p style={{ fontSize: contentFontSize, color: P.primary, fontWeight: 600, margin: 0 }}>{slide.subhead}</p>}
          <div style={{ width: '4rem', height: '3px', background: P.primary, borderRadius: 2 }} />
          {content.length > 0 && <p style={{ fontSize: '0.9em', color: 'rgba(255,255,255,0.55)', maxWidth: '65%', lineHeight: 1.6, margin: 0 }}>{safeString(content[0])}</p>}
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
          <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: 0 }}>{slide.title}</h2>
          {content[0] && <p style={{ fontSize: contentFontSize, color: 'rgba(255,255,255,0.75)', margin: 0, maxWidth: '60%' }}>{safeString(content[0])}</p>}
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
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><SlideBackground imageUrl={slide.imageUrl} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div><SectionLabel>KPI METRICS</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1.2rem', flex: 1 }}>
            {metrics.map((m, i) => {
              const isFirst = i === 0;
              return (
                <div key={i} style={{ borderRadius: 24, padding: '1.8rem', background: isFirst ? P.kpiGradients[0] : 'rgba(255,255,255,0.6)', border: `1px solid ${isFirst ? 'transparent' : 'rgba(241, 245, 249, 0.8)'}`, boxShadow: isFirst ? `0 20px 40px -10px ${P.primary}40` : '0 10px 30px -10px rgba(0,0,0,0.06)', backdropFilter: isFirst ? 'none' : 'blur(16px)', display: 'flex', flexDirection: 'column', gap: '0.8rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Glass Shimmer */}
                  {isFirst && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)', pointerEvents: 'none' }} />}
                  <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: isFirst ? 'rgba(255,255,255,0.7)' : P.subtext }}>{m.label}</div>
                  <BigNumber value={m.value} light={isFirst} />
                  {m.trend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {m.trend === 'up' && <TrendingUp style={{ width: 16, height: 16, color: isFirst ? 'rgba(255,255,255,0.8)' : '#10b981' }} />}
                      {m.trend === 'down' && <TrendingDown style={{ width: 16, height: 16, color: '#ef4444' }} />}
                      {m.trend === 'flat' && <Minus style={{ width: 16, height: 16, color: isFirst ? 'rgba(255,255,255,0.5)' : '#94a3b8' }} />}
                      {m.description && <span style={{ fontSize: '0.78em', color: isFirst ? 'rgba(255,255,255,0.7)' : P.subtext }}>{m.description}</span>}
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
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><SlideBackground imageUrl={slide.imageUrl} />
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
            <div style={{ background: `linear-gradient(145deg, rgba(78,131,249,0.06), rgba(78,131,249,0.02))`, borderRadius: 24, padding: '1.8rem', border: `1px solid rgba(78,131,249,0.15)`, boxShadow: '0 8px 24px rgba(78,131,249,0.05)', backdropFilter: 'blur(10px)' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: '1.8rem', border: `1px solid rgba(226,232,240,0.8)`, boxShadow: '0 8px 24px rgba(0,0,0,0.03)', backdropFilter: 'blur(10px)' }}>
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
          <div style={{ flex: 1 }}>{renderChart(slide.chartData)}</div>
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
                  {tableHeaders.map((h, i) => <th key={i} style={{ padding: cellPad, color: '#fff', fontWeight: 700, textAlign: 'left', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeString(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : P.muted, borderBottom: `1px solid ${P.border}` }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: cellPad, color: ci === 0 ? P.text : P.subtext, fontWeight: ci === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeString(cell)}</td>)}
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

  // ── 9. 마무리 슬라이드
  if (slide.type === 'closing' || slide.type === 'action' || slide.type === 'summary') {
    return (
      <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${P.dark} 0%, #0f172a 100%)`, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', right: '5%', bottom: '5%', width: '40%', paddingBottom: '40%', borderRadius: '50%', background: `${P.primary}10`, zIndex: 0 }} />
        <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} invert />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 5% 0 7%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionLabel light>NEXT STEPS</SectionLabel>
          <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0 }}>{slide.title}</h2>
          <div style={{ width: '4rem', height: '3px', background: P.primary, borderRadius: 2 }} />
          {content.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {content.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                  <ArrowRight style={{ width: 18, height: 18, color: P.primary, marginTop: '0.15em', flexShrink: 0 }} />
                  <span style={{ fontSize: contentFontSize, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{safeString(item)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <SlideNumber number={slide.slideNumber} light />
      </div>
    );
  }

  // ── 10. Split / Grid 레이아웃
  if (layout === 'split-left') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 6%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{renderSplitLayout(slide, titleFontSize, contentFontSize, false)}</div><SlideNumber number={slide.slideNumber} /></div>;
  if (layout === 'split-right') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 6%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{renderSplitLayout(slide, titleFontSize, contentFontSize, true)}</div><SlideNumber number={slide.slideNumber} /></div>;
  if (layout === 'grid') return <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}><SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} /><div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}><div><SectionLabel>{slide.type?.toUpperCase() ?? 'SLIDE'}</SectionLabel><h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2></div><div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>{renderGridCards(slide, contentFontSize)}</div></div><SlideNumber number={slide.slideNumber} /></div>;

  // ── 11. 기본 콘텐츠 슬라이드 (default)
  return (
    <div className={containerClassName} style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: P.bg, fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif", padding: '5% 7%' }}>
      <SlideBackground imageUrl={slide.imageUrl} />
      <SlideWatermark text={watermark} /><SlideLogo logoUrl={logoUrl} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ flexShrink: 0 }}>
          <SectionLabel>{slide.type?.toUpperCase() ?? 'CONTENT'}</SectionLabel>
          <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, lineHeight: 1.2, margin: 0 }}>{slide.title}</h2>
          {slide.subhead && <p style={{ fontSize: '0.85em', color: P.primary, fontWeight: 600, margin: '0.4rem 0 0' }}>{slide.subhead}</p>}
          <div style={{ width: '2.5rem', height: '3px', background: P.primary, borderRadius: 2, marginTop: '0.7rem' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem', justifyContent: 'flex-start' }}>
          {content.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: i === 0 ? P.primary : `${P.primary}12`, color: i === 0 ? '#fff' : P.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, marginTop: '1px' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <p style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.6, margin: 0, flex: 1 }}>{safeString(item)}</p>
            </div>
          ))}
        </div>
      </div>
      <SlideNumber number={slide.slideNumber} />
    </div>
  );
};

export default ScaledSlide;
