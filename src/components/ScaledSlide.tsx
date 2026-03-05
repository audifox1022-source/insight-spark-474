import React, { useState } from 'react';
import {
  ArrowRight,
  Layers,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3 as BarIcon,
  Target,
  Table as TableIcon,
  Zap,
  Users,
  Calendar,
  Briefcase,
  Award,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ══════════════════════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════════════════════
interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

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
}

interface TimelineItem {
  year: string;
  title: string;
  description?: string;
}

interface OrgMember {
  team: string;
  count: string;
  project: string;
  role: string;
}

interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: string[];
  leftItems?: string[];
  rightItems?: string[];
  leftTitle?: string;
  rightTitle?: string;
  infographicType?: string;
  chartData?: SlideChartData;
  tableData?: { headers?: string[]; rows?: string[][] };
  keyMetrics?: SlideMetric[];
  timelineItems?: TimelineItem[];
  orgMembers?: OrgMember[];
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
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ══════════════════════════════════════════════════════════════
// 디자인 시스템 (Palette)
// ══════════════════════════════════════════════════════════════
const P = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  bg: '#ffffff',
  text: '#1a2133',
  subtext: '#64748b',
  border: '#e2e8f0',
  muted: '#f8fafc',
  chartColors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  kpiGradients: [
    'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)',
    'linear-gradient(135deg,#10b981 0%,#059669 100%)',
    'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
    'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
    'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)',
    'linear-gradient(135deg,#06b6d4 0%,#0284c7 100%)',
  ],
};

// ══════════════════════════════════════════════════════════════
// 보조 내부 컴포넌트
// ══════════════════════════════════════════════════════════════
const SlideBackground: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const [imgError, setImgError] = useState(false);
  if (!imageUrl || imgError) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <img
        src={imageUrl}
        alt=""
        onError={() => setImgError(true)}
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)' }} />
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: 4, fontWeight: 700, opacity: 0.8 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const EmptyPlaceholder = ({ icon: Icon, label }: { icon: React.FC<any>; label: string }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 20, border: '2px dashed #cbd5e1', color: '#64748b', flexDirection: 'column', gap: 12 }}>
    <Icon style={{ width: 48, height: 48, opacity: 0.3 }} />
    <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// ScaledSlide 본체
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({ slide, containerClassName = '', logoUrl, watermark }) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content: string[] = Array.isArray(rawContent) ? (rawContent as string[]) : [];

  const titleSizeScale = slide.titleSizeScale ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout = slide.layout ?? 'default';

  // 폰트 크기 동적 계산 (pt가 있으면 우선, 없으면 scale 사용)
  const titleFontSize = slide.titleFontPt 
    ? `${(slide.titleFontPt / 32) * 3}rem` 
    : `${3 * titleSizeScale}rem`;

  const contentFontSize = slide.contentFontPt 
    ? `${(slide.contentFontPt / 18) * 1.45}rem` 
    : `${1.45 * contentSizeScale}rem`;

  const effectiveContentScale = slide.contentFontPt ? (slide.contentFontPt / 18) : contentSizeScale;

  const isFirstSlide = (slide.slideNumber ?? 1) === 1 || slide.type === 'title';

  // ──────────────────────────────────────────────────────────────
  // 1) 차트 렌더링 (Pie, Line, Area, Bar)
  // ──────────────────────────────────────────────────────────────
  const renderChart = () => {
    const cd = slide.chartData;
    if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터가 없습니다" />;

    const colors = P.chartColors;
    const axisTick = { fill: '#64748b', fontSize: 12, fontWeight: 500 };

    if (cd.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cd.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              paddingAngle={5}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            >
              {cd.data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
              ))}
            </Pie>
            {cd.showLegend && <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: 20 }} />}
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const common = { data: cd.data, margin: { top: 20, right: 30, left: 0, bottom: 0 } };

    if (cd.chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {cd.showLegend && <Legend />}
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={4} dot={{ r: 6, fill: colors[0], strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} name={cd.series1Label ?? '지표 1'} />
            {cd.data[0]?.value2 !== undefined && (
              <Line type="monotone" dataKey="value2" stroke={colors[1]} strokeWidth={4} dot={{ r: 6, fill: colors[1], strokeWidth: 3, stroke: '#fff' }} name={cd.series2Label ?? '지표 2'} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (cd.chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...common}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} />
            <YAxis tick={axisTick} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={colors[0]} fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} name={cd.series1Label ?? '지표 1'} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default Bar Chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...common} barGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          {cd.showLegend && <Legend />}
          <Bar dataKey="value" fill={colors[0]} radius={[6, 6, 0, 0]} maxBarSize={45} name={cd.series1Label ?? '지표 1'} />
          {cd.data[0]?.value2 !== undefined && (
            <Bar dataKey="value2" fill={colors[1]} radius={[6, 6, 0, 0]} maxBarSize={45} name={cd.series2Label ?? '지표 2'} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 2) 테이블 렌더링 (Density 지원)
  // ──────────────────────────────────────────────────────────────
  const renderTable = () => {
    const td = slide.tableData;
    if (!td?.headers?.length) return <EmptyPlaceholder icon={TableIcon} label="표 데이터가 없습니다" />;

    const paddingY = 
      slide.tableDensity === 'compact' ? '0.6rem' : 
      slide.tableDensity === 'relaxed' ? '1.4rem' : '1rem';

    return (
      <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', border: `1px solid ${P.border}`, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: contentFontSize }}>
          <thead style={{ background: P.primary, color: '#fff' }}>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i} style={{ padding: `${paddingY} 1.5rem`, textAlign: 'left', fontWeight: 700, borderRight: i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.rows?.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc', transition: 'background 0.2s' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: `${paddingY} 1.5rem`, borderBottom: `1px solid ${P.border}`, color: ci === 0 ? P.text : P.subtext, fontWeight: ci === 0 ? 600 : 400 }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 3) KPI 렌더링 (그라데이션 카드)
  // ──────────────────────────────────────────────────────────────
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length) return <EmptyPlaceholder icon={Target} label="성과 지표 데이터가 없습니다" />;

    const cols = km.length <= 2 ? km.length : (km.length === 4 ? 2 : 3);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1.5rem', height: '100%', alignContent: 'center' }}>
        {km.map((kpi, i) => (
          <div key={i} style={{ 
            background: P.kpiGradients[i % P.kpiGradients.length], 
            borderRadius: 24, padding: '2rem 1.5rem', color: '#fff', textAlign: 'center', 
            boxShadow: '0 12px 30px -10px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ fontSize: `${0.95 * effectiveContentScale}rem`, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: '0.8rem' }}>{kpi.label}</div>
            <div style={{ fontSize: `${3 * effectiveContentScale}rem`, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5 }}>{kpi.value}</div>
            {kpi.trend && (
              <div style={{ marginTop: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.25)', padding: '5px 14px', borderRadius: 30, fontSize: '0.9rem', fontWeight: 800 }}>
                {kpi.trend === 'up' ? <TrendingUp size={18}/> : kpi.trend === 'down' ? <TrendingDown size={18}/> : <Minus size={18}/>}
                {kpi.trend.toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 4) Compare 렌더링 (AS-IS vs TO-BE)
  // ──────────────────────────────────────────────────────────────
  const renderCompare = () => {
    const leftItems = slide.leftItems ?? [];
    const rightItems = slide.rightItems ?? [];
    
    const Panel = ({ items, title, color, isGreen }: any) => (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: `3px solid ${color}`, borderRadius: 20, overflow: 'hidden', background: isGreen ? '#f0fdf4' : '#eff6ff' }}>
        <div style={{ background: color, color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.4rem', letterSpacing: 1 }}>{title}</div>
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item: string, i: number) => (
            <div key={i} style={{ background: '#fff', padding: '1rem 1.2rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: `1px solid ${color}20` }}>
              <div style={{ width: '1.8rem', height: '1.8rem', borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
              <span style={{ fontSize: contentFontSize, fontWeight: 600, color: P.text, lineHeight: 1.3 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={{ display: 'flex', gap: '2rem', height: '100%', alignItems: 'stretch' }}>
        <Panel items={leftItems} title={slide.leftTitle ?? 'AS-IS'} color="#1e3a8a" isGreen={false} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '4rem', height: '4rem', background: P.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.5)' }}>
            <ArrowRight size={40} strokeWidth={3} />
          </div>
        </div>
        <Panel items={rightItems} title={slide.rightTitle ?? 'TO-BE'} color="#064e3b" isGreen={true} />
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 5) ✅ 타임라인 렌더링 (레퍼런스 PPT 스타일)
  // ──────────────────────────────────────────────────────────────
  const renderTimeline = () => {
    const items = slide.timelineItems ?? [];
    if (!items.length) return <EmptyPlaceholder icon={Calendar} label="연혁 데이터가 없습니다" />;

    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', position: 'relative', padding: '0 3rem' }}>
        {/* 중앙 연결선 */}
        <div style={{ position: 'absolute', top: '50%', left: '5rem', right: '5rem', height: '0.5rem', background: P.primary, borderRadius: 10, zIndex: 0, opacity: 0.9 }} />
        
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', zIndex: 1, gap: '1.5rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* 연도 박스 */}
              <div style={{ 
                background: P.primary, color: '#fff', padding: '0.6rem 1.4rem', borderRadius: 10, 
                fontSize: `${1.4 * effectiveContentScale}rem`, fontWeight: 900, marginBottom: '1.5rem',
                boxShadow: '0 8px 15px -3px rgba(59,130,246,0.3)', transform: 'translateY(-15px)'
              }}>
                {item.year}
              </div>
              
              {/* 노드 포인트 */}
              <div style={{ 
                width: '1.8rem', height: '1.8rem', background: '#fff', border: `6px solid ${P.primary}`, 
                borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 0 0 5px #fff' 
              }} />
              
              {/* 텍스트 설명 카드 */}
              <div style={{ 
                textAlign: 'center', background: '#fff', padding: '1.2rem', borderRadius: 16, 
                border: `1px solid ${P.border}`, width: '100%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: `${1.1 * effectiveContentScale}rem`, fontWeight: 800, color: P.text, marginBottom: '0.4rem', lineHeight: 1.3 }}>{item.title}</div>
                {item.description && (
                  <div style={{ fontSize: `${0.85 * effectiveContentScale}rem`, color: P.subtext, lineHeight: 1.5 }}>{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 6) ✅ 조직도 렌더링 (레퍼런스 PPT 스타일)
  // ──────────────────────────────────────────────────────────────
  const renderOrgChart = () => {
    const members = slide.orgMembers ?? [];
    if (!members.length) return <EmptyPlaceholder icon={Users} label="조직 구성 데이터가 없습니다" />;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', height: '100%', alignContent: 'center' }}>
        {members.map((m, i) => (
          <div key={i} style={{ 
            background: '#fff', border: `1px solid ${P.border}`, borderRadius: 20, padding: '1.5rem',
            borderTop: `8px solid ${P.primary}`, display: 'flex', flexDirection: 'column', gap: '0.8rem',
            boxShadow: '0 15px 30px -10px rgba(0,0,0,0.08)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: `${1.2 * effectiveContentScale}rem`, fontWeight: 900, color: P.primary }}>{m.team}</span>
              <div style={{ background: `${P.primary}15`, color: P.primary, padding: '4px 14px', borderRadius: 40, fontSize: `${0.85 * effectiveContentScale}rem`, fontWeight: 900 }}>
                {m.count}
              </div>
            </div>
            <div style={{ height: '2px', background: '#f1f5f9', width: '100%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${P.border}` }}>
                <Award size={18} color={P.primary}/>
              </div>
              <div style={{ fontWeight: 700, fontSize: `${1.05 * effectiveContentScale}rem`, color: P.text }}>{m.role}</div>
            </div>
            <div style={{ fontSize: `${0.9 * effectiveContentScale}rem`, color: P.subtext, lineHeight: 1.5, background: '#f8fafc', padding: '0.8rem', borderRadius: 12 }}>
               {m.project}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────
  // 7) 불릿 및 인포그래픽 렌더링 (기존 로직)
  // ──────────────────────────────────────────────────────────────
  const renderBullets = () => {
    if (!content.length) return <EmptyPlaceholder icon={Layers} label="내용이 없습니다" />;
    
    if (layout === 'grid') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', height: '100%', alignContent: 'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${P.border}`, borderLeft: `6px solid ${P.chartColors[i % 6]}`, padding: '1.4rem', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: contentFontSize, fontWeight: 600, color: P.text, margin: 0, lineHeight: 1.5 }}>{item}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {content.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem' }}>
            <div style={{ background: P.primary, borderRadius: '50%', padding: '4px', flexShrink: 0, marginTop: '0.2rem' }}>
              <CheckCircle2 color="#fff" size={20} />
            </div>
            <span style={{ fontSize: contentFontSize, fontWeight: 500, color: P.text, lineHeight: 1.6 }}>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '100%', gap: '1rem' }}>
          {content.slice(0, 4).map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ 
                width: '9rem', height: '9rem', borderRadius: '50%', border: `5px solid ${P.primary}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', 
                padding: '1.2rem', fontWeight: 800, fontSize: `${0.95 * effectiveContentScale}rem`, 
                background: '#fff', boxShadow: `0 15px 30px ${P.primary}20`, color: P.text, lineHeight: 1.3
              }}>
                {item}
              </div>
              {i < content.slice(0, 4).length - 1 && <ChevronRight color={P.primary} size={40} strokeWidth={3} />}
            </React.Fragment>
          ))}
        </div>
      );
    }
    return renderBullets();
  };

  // ──────────────────────────────────────────────────────────────
  // 8) 최종 콘텐츠 선택 Switch
  // ──────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'chart': return renderChart();
      case 'table': return renderTable();
      case 'kpi': return renderKPI();
      case 'compare': return renderCompare();
      case 'timeline': return renderTimeline();
      case 'organization': 
      case 'org': return renderOrgChart();
      default: return renderInfographic();
    }
  };

  // ──────────────────────────────────────────────────────────────
  // 9) 메인 레이아웃 렌더링 (Title Slide / Content Slide)
  // ──────────────────────────────────────────────────────────────
  const hasImage = !!slide.imageUrl;
  const vRatio = slide.visualRatio ?? 50;
  const isSplit = layout === 'split-left' || layout === 'split-right';

  // [TITLE SLIDE]
  if (isFirstSlide && slide.type !== 'chart' && slide.type !== 'table' && slide.type !== 'kpi' && slide.type !== 'timeline' && slide.type !== 'org' && slide.type !== 'organization') {
    return (
      <div className={`aspect-video w-full relative bg-white overflow-hidden shadow-2xl ${containerClassName}`}>
        <SlideBackground imageUrl={slide.imageUrl} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.6rem', background: `linear-gradient(90deg, ${P.primary}, ${P.accent})`, zIndex: 10 }} />
        {watermark && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.03, transform: 'rotate(-30deg)', fontSize: '10rem', fontWeight: 900, zIndex: 2 }}>{watermark}</div>
        )}
        {logoUrl && (
          <div style={{ position: 'absolute', top: '2rem', right: '3rem', width: '7rem', height: '3.5rem', zIndex: 5 }}><img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        )}
        <div style={{ height: '100%', padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
          <div style={{ width: '5rem', height: '0.6rem', background: P.primary, marginBottom: '2rem', borderRadius: 10 }} />
          <h1 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, margin: 0, letterSpacing: '-0.04em', lineHeight: 1.1, maxWidth: '80%' }}>{slide.title}</h1>
          <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ background: P.primary, color: '#fff', padding: '0.6rem 1.8rem', borderRadius: 50, fontSize: '1.2rem', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>PRESENTATION</div>
            <div style={{ width: '30%', height: '2px', background: P.border }} />
          </div>
          {content.length > 0 && (
            <p style={{ marginTop: '2rem', fontSize: '1.8rem', color: P.subtext, fontWeight: 600, maxWidth: '70%', lineHeight: 1.4 }}>{content[0]}</p>
          )}
        </div>
      </div>
    );
  }

  // [CONTENT SLIDE]
  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden shadow-2xl ${containerClassName}`}>
      {!isSplit && <SlideBackground imageUrl={slide.imageUrl} />}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.6rem', background: `linear-gradient(90deg, ${P.primary}, ${P.accent})`, zIndex: 10 }} />
      
      {watermark && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.03, transform: 'rotate(-30deg)', fontSize: '10rem', fontWeight: 900, zIndex: 2 }}>{watermark}</div>
      )}
      
      <div style={{ height: '100%', padding: '3.5rem 4rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 5 }}>
        {/* 헤더 섹션 */}
        <div style={{ marginBottom: '2.5rem', borderBottom: `3px solid #f1f5f9`, paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
           <div style={{ width: '0.6rem', height: '2.8rem', background: P.primary, borderRadius: 10 }} />
           <h2 style={{ fontSize: titleFontSize, fontWeight: 900, color: P.text, margin: 0, letterSpacing: '-0.03em' }}>{slide.title}</h2>
           {logoUrl && <div style={{ marginLeft: 'auto', height: '2.5rem' }}><img src={logoUrl} alt="Logo" style={{ height: '100%', objectFit: 'contain' }} /></div>}
        </div>

        {/* 본문 레이아웃 */}
        <div style={{ flex: 1, display: 'flex', gap: '3rem', minHeight: 0 }}>
          <div style={{ flex: 1, width: isSplit ? `${100 - vRatio}%` : '100%', overflow: 'hidden', order: layout === 'split-right' ? 2 : 1 }}>
            {renderContent()}
          </div>
          
          {isSplit && hasImage && (
            <div style={{ width: `${vRatio}%`, borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', order: layout === 'split-right' ? 1 : 2, border: `1px solid ${P.border}` }}>
              <img src={slide.imageUrl} alt="Slide Visual" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* 푸터 (페이지 번호) */}
        {slide.slideNumber && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: '2.2rem', height: '2.2rem', background: P.primary, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900 }}>{slide.slideNumber}</div>
            <div style={{ fontSize: '0.85rem', color: P.subtext, fontWeight: 700, letterSpacing: 1 }}>{watermark || 'BUSINESS PROPOSAL'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScaledSlide;
