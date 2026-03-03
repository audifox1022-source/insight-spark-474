import React from 'react';
import {
  ArrowRight, Layers, CheckCircle2,
  TrendingUp, TrendingDown, Minus,
  BarChart3 as BarIcon, Target,
  Table as TableIcon,
  Clock, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from 'recharts';

// ══════════════════════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════════════════════
interface ChartDataPoint { name: string; value: number; value2?: number }
interface SlideChartData {
  chartType?: 'bar' | 'line' | 'area' | 'pie';
  title?: string;
  data: ChartDataPoint[];
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}
interface SlideMetric { label: string; value: string; trend?: 'up' | 'down' | 'flat'; description?: string; }
interface SlideMilestone { label: string; date?: string; state?: 'done' | 'next' | 'todo'; }

interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: string[];
  infographicType?: string;
  chartData?: SlideChartData;
  tableData?: { headers?: string[]; rows?: string[][] };
  keyMetrics?: SlideMetric[];
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  imageUrl?: string;
  layout?: string;
  notes?: string;
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  milestones?: SlideMilestone[];
  text?: string;
  author?: string;
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ══════════════════════════════════════════════════════════════
// 컬러 팔레트
// ══════════════════════════════════════════════════════════════
const P = {
  primary:  'var(--primary)',
  accent:   'var(--accent)',
  text:     '#0f172a',
  subtext:  '#475569',
  border:   '#e2e8f0',
  muted:    '#f8fafc',
  chartColors: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'],
  kpiGradients: [
    'linear-gradient(135deg,#1e40af,#3b82f6)',
    'linear-gradient(135deg,#065f46,#10b981)',
    'linear-gradient(135deg,#92400e,#f59e0b)',
    'linear-gradient(135deg,#4c1d95,#8b5cf6)',
    'linear-gradient(135deg,#991b1b,#ef4444)',
    'linear-gradient(135deg,#0e7490,#06b6d4)',
  ],
};

// 제목 길이에 따라 글자 크기 자동 조정
function autoFontSize(text: string, base: number): string {
  const len = text?.length ?? 0;
  if (len > 40) return `${base * 0.75}rem`;
  if (len > 28) return `${base * 0.88}rem`;
  if (len > 18) return `${base * 0.95}rem`;
  return `${base}rem`;
}

// 커스텀 차트 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', color:'#fff', borderRadius:10, padding:'10px 16px', fontSize:13, boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ marginBottom:5, fontWeight:700, opacity:0.7, fontSize:11, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight:700, fontSize:15 }}>
          {p.name && <span style={{ opacity:0.7, fontWeight:400, fontSize:12, marginRight:6 }}>{p.name}</span>}
          {p.value}
        </div>
      ))}
    </div>
  );
};

// 데이터 없을 때 빈 상태 표시
const EmptyPlaceholder: React.FC<{ icon: React.FC<any>; label: string }> = ({ icon: Icon, label }) => (
  <div style={{
    height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
    background:'#f8fafc', borderRadius:16, border:'2px dashed #e2e8f0',
    color:'#94a3b8', flexDirection:'column', gap:10,
  }}>
    <Icon style={{ width:40, height:40, opacity:0.2 }} />
    <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide, containerClassName = '', logoUrl, watermark,
}) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content = (Array.isArray(rawContent) ? rawContent : []) as string[];

  const titleSizeScale   = slide.titleSizeScale   ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout           = slide.layout           ?? 'default';

  // 일반 슬라이드: 제목 기본 2.2rem, 본문 기본 1.4rem (크게)
  const titleFontSize   = autoFontSize(slide.title ?? '', 2.2 * titleSizeScale);
  const contentFontSize = `${1.4 * contentSizeScale}rem`;

  const isFirstSlide = (slide.slideNumber ?? 1) === 1 || slide.type === 'title';

  // 워터마크
  const Watermark = watermark ? (
    <div style={{
      position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      pointerEvents:'none', opacity:0.03, transform:'rotate(-30deg)',
      fontSize:'9rem', fontWeight:900, color:'#000', userSelect:'none',
    }}>{watermark}</div>
  ) : null;

  // 로고
  const Logo = ({ invert = false }: { invert?: boolean }) => logoUrl ? (
    <div style={{
      position:'absolute', top:'0.9rem', right:'1.2rem',
      width:'5rem', height:'2.2rem', display:'flex', alignItems:'center', justifyContent:'flex-end', zIndex:10,
    }}>
      <img src={logoUrl} alt="Logo" style={{
        maxWidth:'100%', maxHeight:'100%', objectFit:'contain',
        filter: invert ? 'brightness(0) invert(1)' : undefined,
      }} />
    </div>
  ) : null;

  // 슬라이드 번호
  const SlideNum = ({ light = false }: { light?: boolean }) => slide.slideNumber ? (
    <div style={{ position:'absolute', bottom:'0.7rem', right:'1.2rem', zIndex:10 }}>
      <div style={{
        fontSize:'0.72rem', fontWeight:800, color: light ? 'rgba(255,255,255,0.7)' : '#94a3b8',
        letterSpacing:'0.05em',
      }}>{slide.slideNumber}</div>
    </div>
  ) : null;

  // ── 차트 렌더링 ──────────────────────────────────────────────
  const renderChart = () => {
    const cd = slide.chartData;
    if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;
    const colors = P.chartColors;
    const common = { data: cd.data, margin:{ top:18, right:20, bottom:8, left:0 } };
    const axisTick = { fill:'#94a3b8', fontSize:11, fontWeight:600 };

    if (cd.chartType === 'pie') return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={cd.data} dataKey="value" nameKey="name" cx="50%" cy="48%"
            outerRadius="70%" innerRadius="34%" paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke:'#94a3b8', strokeWidth:1.5 }}>
            {cd.data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );

    if (cd.chartType === 'line') return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Line type="monotone" dataKey="value" name={cd.series1Label ?? '값'} stroke={colors[0]} strokeWidth={3} dot={{ r:5, fill:colors[0], strokeWidth:2, stroke:'#fff' }} activeDot={{ r:7 }}>
            <LabelList dataKey="value" position="top" style={{ fontSize:11, fontWeight:700, fill:colors[0] }} />
          </Line>
          {cd.data[0]?.value2 !== undefined && (
            <Line type="monotone" dataKey="value2" name={cd.series2Label ?? '값2'} stroke={colors[1]} strokeWidth={3} dot={{ r:5, fill:colors[1], strokeWidth:2, stroke:'#fff' }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    );

    if (cd.chartType === 'area') return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...common}>
          <defs>
            <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[0]} stopOpacity={0.4} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="areaG2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[1]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colors[1]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Area type="monotone" dataKey="value" name={cd.series1Label ?? '값'} stroke={colors[0]} strokeWidth={2.5} fill="url(#areaG1)" />
          {cd.data[0]?.value2 !== undefined && (
            <Area type="monotone" dataKey="value2" name={cd.series2Label ?? '값2'} stroke={colors[1]} strokeWidth={2.5} fill="url(#areaG2)" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );

    // 기본: 바 차트
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...common}>
          <defs>
            {colors.map((c, i) => (
              <linearGradient key={i} id={`barG${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={c} stopOpacity={1} />
                <stop offset="100%" stopColor={c} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Bar dataKey="value" name={cd.series1Label ?? '값'} radius={[8,8,0,0]} maxBarSize={56}>
            {cd.data.map((_, i) => <Cell key={i} fill={`url(#barG${i % colors.length})`} />)}
            <LabelList dataKey="value" position="top" style={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
          </Bar>
          {cd.data[0]?.value2 !== undefined && (
            <Bar dataKey="value2" name={cd.series2Label ?? '값2'} fill={colors[1]} radius={[8,8,0,0]} maxBarSize={56} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ── 테이블 렌더링 ────────────────────────────────────────────
  const renderTable = () => {
    const td = slide.tableData;
    if (!td?.headers?.length) return <EmptyPlaceholder icon={TableIcon} label="테이블 데이터 없음" />;
    const paddingY = slide.tableDensity === 'compact' ? '0.55rem' : slide.tableDensity === 'relaxed' ? '1.1rem' : '0.85rem';
    return (
      <div style={{ width:'100%', height:'100%', overflow:'auto', borderRadius:14, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:`1px solid ${P.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize: contentFontSize }}>
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i} style={{
                  padding:`${paddingY} 1.2rem`,
                  background:'linear-gradient(135deg,var(--primary),var(--accent))',
                  color:'#fff', fontWeight:700, textAlign:'left',
                  fontSize:`${1.1 * contentSizeScale}rem`, whiteSpace:'nowrap',
                  borderRight: i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  letterSpacing:'0.03em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.rows?.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding:`${paddingY} 1.2rem`,
                    borderBottom:`1px solid ${P.border}`,
                    borderRight: ci < row.length - 1 ? `1px solid ${P.border}` : 'none',
                    color: ci === 0 ? P.text : P.subtext,
                    fontWeight: ci === 0 ? 700 : 400,
                    fontSize:`${1.05 * contentSizeScale}rem`,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── KPI 카드 렌더링 ──────────────────────────────────────────
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length) return <EmptyPlaceholder icon={Target} label="KPI 데이터 없음" />;
    const cols = km.length <= 2 ? km.length : km.length <= 4 ? 2 : 3;
    return (
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'1rem', height:'100%', alignContent:'center' }}>
        {km.map((kpi, i) => (
          <div key={i} style={{
            background: P.kpiGradients[i % P.kpiGradients.length],
            borderRadius:18, padding:'1.6rem 1.4rem',
            color:'#fff', display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', textAlign:'center',
            boxShadow:'0 8px 28px rgba(0,0,0,0.18)', position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', top:'-20%', right:'-10%', width:'55%', paddingBottom:'55%', borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
            <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem' }}>
              <div style={{ fontSize:`${0.85 * contentSizeScale}rem`, fontWeight:700, opacity:0.8, letterSpacing:'0.1em', textTransform:'uppercase' }}>{kpi.label}</div>
              <div style={{ fontSize:`${3.0 * contentSizeScale}rem`, fontWeight:900, lineHeight:1, letterSpacing:'-0.02em' }}>{kpi.value}</div>
              {kpi.description && <div style={{ fontSize:`${0.8 * contentSizeScale}rem`, opacity:0.75, marginTop:'0.2rem' }}>{kpi.description}</div>}
              {kpi.trend && (
                <div style={{
                  marginTop:'0.5rem', display:'inline-flex', alignItems:'center', gap:5,
                  fontSize:`${0.82 * contentSizeScale}rem`, fontWeight:700,
                  background:'rgba(255,255,255,0.22)', borderRadius:20, padding:'0.2rem 0.8rem',
                }}>
                  {kpi.trend === 'up'   && <TrendingUp  style={{ width:'1em', height:'1em' }} />}
                  {kpi.trend === 'down' && <TrendingDown style={{ width:'1em', height:'1em' }} />}
                  {kpi.trend === 'flat' && <Minus        style={{ width:'1em', height:'1em' }} />}
                  <span>{kpi.trend === 'up' ? '상승' : kpi.trend === 'down' ? '하락' : '유지'}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── AS-IS / TO-BE 비교 렌더링 ────────────────────────────────
  const renderCompare = () => {
    const leftItems  = Array.isArray(slide.leftItems)  ? slide.leftItems  : [];
    const rightItems = Array.isArray(slide.rightItems) ? slide.rightItems : [];
    const leftTitle  = slide.leftTitle  || 'AS-IS';
    const rightTitle = slide.rightTitle || 'TO-BE';

    if (!leftItems.length && !rightItems.length)
      return <EmptyPlaceholder icon={Layers} label="비교 데이터 없음" />;

    const renderSide = (items: string[], color: string, bgGrad: string, borderColor: string, title: string, isRight: boolean) => (
      <div style={{
        flex:1, borderRadius:16, padding:'1.2rem 1.4rem',
        background: bgGrad, border:`2px solid ${borderColor}`,
        display:'flex', flexDirection:'column', gap:'0.6rem',
        boxShadow:`0 4px 16px ${borderColor}50`,
      }}>
        <div style={{
          fontWeight:800, fontSize:`${1.15 * contentSizeScale}rem`, color,
          borderBottom:`2px solid ${borderColor}`, paddingBottom:'0.5rem',
          marginBottom:'0.2rem', display:'flex', alignItems:'center', gap:8,
        }}>
          {isRight ? '✅' : '❌'} {title}
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.7rem', fontSize: contentFontSize, color: P.text, lineHeight:1.5 }}>
            <span style={{
              flexShrink:0, width:`${1.4 * contentSizeScale}rem`, height:`${1.4 * contentSizeScale}rem`,
              borderRadius:'50%', background: color, color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.75rem', fontWeight:700, marginTop:'0.15rem',
            }}>{i + 1}</span>
            <span style={{ fontWeight:500 }}>{item}</span>
          </div>
        ))}
      </div>
    );

    return (
      <div style={{ display:'flex', gap:'1rem', height:'100%', alignItems:'stretch' }}>
        {renderSide(leftItems, '#dc2626', 'linear-gradient(135deg,#fff1f2,#ffe4e6)', '#fca5a5', leftTitle, false)}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, flexDirection:'column', gap:'0.3rem' }}>
          <div style={{
            width:'2.4rem', height:'2.4rem', borderRadius:'50%',
            background:'linear-gradient(135deg,#3b82f6,#6366f1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 14px rgba(99,102,241,0.4)',
          }}>
            <ArrowRight style={{ color:'#fff', width:'1.2rem', height:'1.2rem' }} />
          </div>
          <span style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:700 }}>개선</span>
        </div>
        {renderSide(rightItems, '#16a34a', 'linear-gradient(135deg,#f0fdf4,#dcfce7)', '#86efac', rightTitle, true)}
      </div>
    );
  };

  // ── 타임라인 렌더링 ──────────────────────────────────────────
  const renderTimeline = () => {
    const ms = slide.milestones;
    if (!ms?.length) return <EmptyPlaceholder icon={Clock} label="타임라인 데이터 없음" />;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', height:'100%', justifyContent:'center' }}>
        {ms.map((m, i) => {
          const isDone = m.state === 'done';
          const isNext = m.state === 'next';
          const color  = isDone ? '#10b981' : isNext ? '#3b82f6' : '#94a3b8';
          const bgColor = isDone ? '#f0fdf4' : isNext ? '#eff6ff' : '#f8fafc';
          const bdColor = isDone ? '#86efac' : isNext ? '#93c5fd' : '#e2e8f0';
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.9rem' }}>
              <div style={{ flexShrink:0, textAlign:'right', width:'5rem', fontSize:`${0.82 * contentSizeScale}rem`, color: P.subtext, fontWeight:700 }}>{m.date}</div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{
                  width:'1.4rem', height:'1.4rem', borderRadius:'50%',
                  background: isDone ? color : '#fff', border:`3px solid ${color}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: isNext ? `0 0 0 4px ${color}30` : 'none',
                }}>
                  {isDone && <span style={{ color:'#fff', fontSize:'0.65rem', fontWeight:900 }}>✓</span>}
                  {isNext && <span style={{ width:'0.5rem', height:'0.5rem', borderRadius:'50%', background:color, display:'block' }} />}
                </div>
                {i < ms.length - 1 && <div style={{ width:2, height:'1.4rem', background:`linear-gradient(to bottom,${color},#e2e8f0)`, opacity: isDone ? 1 : 0.4 }} />}
              </div>
              <div style={{
                flex:1, padding:'0.6rem 1.1rem', background: bgColor,
                borderRadius:10, border:`1.5px solid ${bdColor}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                boxShadow: isNext ? `0 2px 10px ${color}25` : 'none',
              }}>
                <span style={{ fontSize: contentFontSize, fontWeight: isNext ? 700 : 500, color: P.text }}>{m.label}</span>
                <span style={{
                  fontSize:'0.75rem', fontWeight:700, padding:'0.2rem 0.7rem',
                  borderRadius:20, background: isDone ? '#10b981' : isNext ? '#3b82f6' : '#e2e8f0',
                  color: isDone || isNext ? '#fff' : '#94a3b8',
                }}>
                  {isDone ? '완료' : isNext ? '진행중' : '예정'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── 인용구 렌더링 ────────────────────────────────────────────
  const renderQuote = () => {
    const text   = slide.text   || content[0] || '';
    const author = slide.author || content[1] || '';
    if (!text) return <EmptyPlaceholder icon={Layers} label="인용구 없음" />;
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100%', padding:'1rem 2rem', textAlign:'center', gap:'1.2rem',
        background:'linear-gradient(135deg,rgba(var(--primary-rgb),0.04),rgba(var(--primary-rgb),0.08))',
        borderRadius:18, border:'1px solid rgba(var(--primary-rgb),0.12)',
      }}>
        <div style={{ fontSize:'5rem', color:'var(--primary)', opacity:0.15, lineHeight:1, fontFamily:'Georgia,serif', marginBottom:'-0.8rem' }}>"</div>
        <p style={{ fontSize:`${1.7 * contentSizeScale}rem`, fontWeight:600, color: P.text, lineHeight:1.8, maxWidth:'86%', margin:0, fontStyle:'italic' }}>
          {text}
        </p>
        <div style={{ width:'3rem', height:'2px', background:'var(--primary)', opacity:0.3, borderRadius:2 }} />
        {author && <div style={{ fontSize:`${1.0 * contentSizeScale}rem`, color: P.subtext, fontWeight:700 }}>— {author}</div>}
      </div>
    );
  };

  // ── 불릿/카드/하이라이트 렌더링 ─────────────────────────────
  const renderBullets = () => {
    if (!content.length) return <EmptyPlaceholder icon={Layers} label="내용 없음" />;

    // 그리드 레이아웃
    if (layout === 'grid') {
      const cols = content.length <= 4 ? 2 : 3;
      return (
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'0.85rem', height:'100%', alignContent:'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{
              background:'#fff', borderRadius:14, padding:'1rem 1.2rem',
              borderTop:`4px solid ${P.chartColors[i % P.chartColors.length]}`,
              display:'flex', flexDirection:'column', gap:'0.5rem',
              boxShadow:'0 2px 12px rgba(0,0,0,0.07)',
            }}>
              <div style={{
                width:`${1.7 * contentSizeScale}rem`, height:`${1.7 * contentSizeScale}rem`,
                borderRadius:'50%', background: P.chartColors[i % P.chartColors.length],
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:`${0.82 * contentSizeScale}rem`, fontWeight:800,
              }}>{i + 1}</div>
              <span style={{ fontSize: contentFontSize, color: P.text, lineHeight:1.55, fontWeight:500 }}>{item}</span>
            </div>
          ))}
        </div>
      );
    }

    // 하이라이트 레이아웃
    if (layout === 'highlight') {
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', height:'100%', justifyContent:'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:'1rem',
              background: i === 0 ? 'linear-gradient(135deg,rgba(var(--primary-rgb),0.09),rgba(var(--primary-rgb),0.04))' : '#f8fafc',
              borderRadius:12, padding:'0.9rem 1.25rem',
              border: i === 0 ? `1.5px solid rgba(var(--primary-rgb),0.28)` : `1px solid ${P.border}`,
            }}>
              <CheckCircle2 style={{ width:`${1.3 * contentSizeScale}rem`, height:`${1.3 * contentSizeScale}rem`, color: i === 0 ? 'var(--primary)' : '#94a3b8', flexShrink:0 }} />
              <span style={{ fontSize: contentFontSize, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P.text : P.subtext, lineHeight:1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      );
    }

    // 기본 불릿 리스트
    return (
      <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.85rem' }}>
        {content.map((item, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'1rem', fontSize: contentFontSize, color: P.text, lineHeight:1.65 }}>
            <span style={{
              flexShrink:0, width:`${1.6 * contentSizeScale}rem`, height:`${1.6 * contentSizeScale}rem`,
              borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--accent))',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:`${0.8 * contentSizeScale}rem`, fontWeight:800, marginTop:'0.18rem',
              boxShadow:'0 2px 8px rgba(var(--primary-rgb),0.3)',
            }}>{i + 1}</span>
            <span style={{ fontWeight:500 }}>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // ── 인포그래픽 렌더링 ────────────────────────────────────────
  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', height:'100%', gap:'0.6rem' }}>
          {content.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', maxWidth:160 }}>
                <div style={{
                  width:'7rem', height:'7rem', borderRadius:'50%',
                  background:`linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]}25,${P.chartColors[i % P.chartColors.length]}50)`,
                  border:`3px solid ${P.chartColors[i % P.chartColors.length]}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  textAlign:'center', fontSize:`${1.0 * contentSizeScale}rem`,
                  fontWeight:700, padding:'0.7rem', color: P.text,
                  boxShadow:`0 4px 16px ${P.chartColors[i % P.chartColors.length]}35`,
                }}>
                  {item}
                </div>
                <span style={{ fontSize:`${0.82 * contentSizeScale}rem`, color: P.subtext, fontWeight:700, letterSpacing:'0.04em' }}>STEP {i + 1}</span>
              </div>
              {i < content.length - 1 && (
                <ArrowRight style={{ color:'var(--primary)', flexShrink:0, width:'1.5rem', height:'1.5rem', opacity:0.5 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (slide.infographicType === 'process') {
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', height:'100%', justifyContent:'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.9rem' }}>
              <div style={{
                width:'2.4rem', height:'2.4rem', borderRadius:10, flexShrink:0,
                background:`linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]},${P.chartColors[(i+1) % P.chartColors.length]})`,
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:`${0.95 * contentSizeScale}rem`,
                boxShadow:`0 2px 10px ${P.chartColors[i % P.chartColors.length]}45`,
              }}>{i + 1}</div>
              <div style={{
                flex:1, padding:'0.75rem 1.2rem', background:'#f8fafc',
                borderRadius:10, border:`1px solid ${P.border}`,
                borderLeft:`3px solid ${P.chartColors[i % P.chartColors.length]}`,
                fontSize: contentFontSize, fontWeight:500, color: P.text,
              }}>{item}</div>
            </div>
          ))}
        </div>
      );
    }

    return renderBullets();
  };

  // ── 타입별 렌더링 분기 ───────────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'chart':    return renderChart();
      case 'table':    return renderTable();
      case 'kpi':      return renderKPI();
      case 'compare':  return renderCompare();
      case 'timeline': return renderTimeline();
      case 'quote':    return renderQuote();
      default:
        if (!content.length) return <EmptyPlaceholder icon={Layers} label="내용 없음" />;
        return renderInfographic();
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 표지 슬라이드 (중앙 정렬, 강렬한 디자인)
  // ══════════════════════════════════════════════════════════════
  if (isFirstSlide && slide.type !== 'chart' && slide.type !== 'table' && slide.type !== 'kpi') {
    const titleLen = slide.title?.length ?? 0;
    const coverTitleSize =
      titleLen > 30 ? `${2.6 * titleSizeScale}rem`
      : titleLen > 20 ? `${3.2 * titleSizeScale}rem`
      : `${4.0 * titleSizeScale}rem`;

    return (
      <div className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}
        style={{ fontFamily:'inherit' }}>

        {/* 배경: 진한 그라디언트 */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(150deg,#0f172a 0%,var(--primary) 55%,var(--accent) 100%)' }} />

        {/* 배경 장식: 큰 원들 */}
        <div style={{ position:'absolute', top:'-25%', right:'-12%', width:'65%', paddingBottom:'65%', borderRadius:'50%',
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', bottom:'-30%', left:'-10%', width:'60%', paddingBottom:'60%', borderRadius:'50%',
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', top:'15%', left:'30%', width:'25%', paddingBottom:'25%', borderRadius:'50%',
          background:'rgba(255,255,255,0.04)' }} />

        {/* 상단 강조 선 */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'5px',
          background:'linear-gradient(90deg,rgba(255,255,255,0.8),rgba(255,255,255,0.3),rgba(255,255,255,0))' }} />

        {/* 좌측 수직 바 */}
        <div style={{ position:'absolute', left:'5%', top:'18%', bottom:'18%', width:'4px',
          background:'rgba(255,255,255,0.5)', borderRadius:4 }} />

        {/* 하단 장식 선 */}
        <div style={{ position:'absolute', bottom:'22%', left:'8%', right:'25%', height:'1px',
          background:'rgba(255,255,255,0.2)' }} />

        {Watermark}
        <Logo invert />
        <SlideNum light />

        {/* 중앙 콘텐츠 */}
        <div style={{
          position:'relative', zIndex:1, height:'100%',
          display:'flex', flexDirection:'column',
          alignItems:'flex-start', justifyContent:'center',
          padding:'3rem 6rem 3rem 9%',
        }}>
          {/* PRESENTATION 뱃지 */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.15)',
            backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.3)',
            borderRadius:24, padding:'0.4rem 1.2rem',
            marginBottom:'1.6rem',
            fontSize:`${0.9 * contentSizeScale}rem`,
            color:'rgba(255,255,255,1)', fontWeight:700,
            letterSpacing:'0.1em', textTransform:'uppercase',
          }}>
            <Sparkles style={{ width:'0.9em', height:'0.9em' }} />
            PRESENTATION
          </div>

          {/* 메인 제목 */}
          <h1 style={{
            color:'#ffffff', fontWeight:900, lineHeight:1.15,
            fontSize: coverTitleSize,
            letterSpacing:'-0.03em',
            marginBottom:'1.4rem',
            textShadow:'0 4px 30px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1)',
            maxWidth:'85%', wordBreak:'keep-all', margin:0,
          }}>{slide.title}</h1>

          {/* 구분선 */}
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'1.4rem 0' }}>
            <div style={{ width:'4rem', height:'4px', background:'#fff', borderRadius:4, opacity:0.9 }} />
            <div style={{ width:'1.5rem', height:'4px', background:'rgba(255,255,255,0.5)', borderRadius:4 }} />
            <div style={{ width:'0.6rem', height:'4px', background:'rgba(255,255,255,0.25)', borderRadius:4 }} />
          </div>

          {/* 부제목 */}
          {content.length > 0 && (
            <p style={{
              color:'rgba(255,255,255,0.9)',
              fontSize:`${1.5 * contentSizeScale}rem`,
              fontWeight:400, maxWidth:'72%', lineHeight:1.75,
              margin:0, letterSpacing:'0.01em',
              textShadow:'0 2px 10px rgba(0,0,0,0.3)',
            }}>
              {content[0]}
            </p>
          )}

          {/* 슬라이드 수 표시 */}
          {content[1] && (
            <div style={{
              marginTop:'1.5rem',
              fontSize:`${0.9 * contentSizeScale}rem`,
              color:'rgba(255,255,255,0.6)', fontWeight:500,
              letterSpacing:'0.03em',
            }}>{content[1]}</div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 일반 슬라이드 (여백 최소화, 글자 크게)
  // ══════════════════════════════════════════════════════════════
  const hasImage    = !!slide.imageUrl;
  const visualRatio = slide.visualRatio ?? 48;
  const textRatio   = 100 - visualRatio;
  const imageSide   = layout === 'split-right' ? 'left' : 'right';

  const typeAccent: Record<string, string> = {
    chart:'#3b82f6', table:'#8b5cf6', kpi:'#10b981',
    compare:'#f59e0b', timeline:'#06b6d4', quote:'#ec4899',
    process:'#f97316', cards:'#6366f1', summary:'#10b981', agenda:'#3b82f6',
  };
  const accentColor = typeAccent[slide.type ?? ''] ?? 'var(--primary)';

  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>

      {/* 상단 컬러 바 */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'5px',
        background:`linear-gradient(90deg,var(--primary),var(--accent))` }} />

      {/* 우상단 장식 */}
      <div style={{ position:'absolute', top:0, right:0, width:'18%', paddingBottom:'18%',
        background:`radial-gradient(circle at 100% 0%,${accentColor}18 0%,transparent 70%)` }} />

      {Watermark}
      <Logo />
      <SlideNum />

      {/* 메인 영역: padding 최소화 */}
      <div style={{ height:'100%', padding:'0.6rem 1.4rem 1.2rem 1.4rem', display:'flex', flexDirection:'column' }}>

        {/* 제목 영역 */}
        <div style={{
          display:'flex', alignItems:'center', gap:'0.7rem',
          marginBottom:'0.65rem', paddingBottom:'0.6rem',
          borderBottom:`2px solid ${P.border}`, flexShrink:0,
        }}>
          <div style={{
            width:'5px', height:`${2.2 * titleSizeScale}rem`,
            background: accentColor, borderRadius:4, flexShrink:0,
          }} />
          <h2 style={{
            fontWeight:900, color: P.text, lineHeight:1.2, flex:1, margin:0,
            fontSize: titleFontSize,
            letterSpacing:'-0.02em',
          }}>
            {slide.title}
          </h2>
        </div>

        {/* 콘텐츠 영역 */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', gap:'1.2rem', minHeight:0 }}>
          <div style={{ width: hasImage ? `${textRatio}%` : '100%', overflow:'hidden', order: imageSide === 'left' ? 2 : 1 }}>
            {renderContent()}
          </div>
          {hasImage && slide.imageUrl && (
            <div style={{
              width:`${visualRatio}%`, borderRadius:14, overflow:'hidden',
              flexShrink:0, order: imageSide === 'left' ? 1 : 2,
              boxShadow:'0 4px 24px rgba(0,0,0,0.1)',
            }}>
              <img src={slide.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
