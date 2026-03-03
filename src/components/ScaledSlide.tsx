import React from 'react';
import {
  ArrowRight, Layers, CheckCircle2,
  TrendingUp, TrendingDown, Minus,
  BarChart3 as BarIcon, Target,
  Table as TableIcon, Zap,
  Clock, Quote, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from 'recharts';

// ══════════════════════════════════════════════════════════════
// 타입
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
// 팔레트
// ══════════════════════════════════════════════════════════════
const P = {
  primary: 'var(--primary)',
  accent:  'var(--accent)',
  bg:      '#ffffff',
  text:    '#0f172a',
  subtext: '#475569',
  border:  '#e2e8f0',
  muted:   '#f8fafc',
  chartColors: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'],
  kpiGradients: [
    'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)',
    'linear-gradient(135deg,#065f46 0%,#10b981 100%)',
    'linear-gradient(135deg,#92400e 0%,#f59e0b 100%)',
    'linear-gradient(135deg,#4c1d95 0%,#8b5cf6 100%)',
    'linear-gradient(135deg,#991b1b 0%,#ef4444 100%)',
    'linear-gradient(135deg,#0e7490 0%,#06b6d4 100%)',
  ],
};

// ══════════════════════════════════════════════════════════════
// 공통 유틸
// ══════════════════════════════════════════════════════════════
function autoFontSize(text: string, base: number): string {
  const len = text?.length ?? 0;
  if (len > 40) return `${base * 0.65}rem`;
  if (len > 28) return `${base * 0.78}rem`;
  if (len > 18) return `${base * 0.9}rem`;
  return `${base}rem`;
}

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
// ScaledSlide
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide, containerClassName = '', logoUrl, watermark,
}) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content = (Array.isArray(rawContent) ? rawContent : []) as string[];

  const titleSizeScale   = slide.titleSizeScale   ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout           = slide.layout           ?? 'default';

  const titleFontSize   = autoFontSize(slide.title ?? '', 2.6 * titleSizeScale);
  const contentFontSize = `${1.3 * contentSizeScale}rem`;

  const isFirstSlide = (slide.slideNumber ?? 1) === 1 || slide.type === 'title';

  const Watermark = watermark ? (
    <div style={{
      position:'absolute', inset:0, display:'flex', alignItems:'center',
      justifyContent:'center', pointerEvents:'none', opacity:0.025,
      transform:'rotate(-30deg)', fontSize:'9rem', fontWeight:900,
      color:'#000', userSelect:'none',
    }}>{watermark}</div>
  ) : null;

  const Logo = ({ invert = false }: { invert?: boolean }) => logoUrl ? (
    <div style={{
      position:'absolute', top:'1.1rem', right:'1.6rem',
      width:'5.5rem', height:'2.6rem',
      display:'flex', alignItems:'center', justifyContent:'flex-end', zIndex:10,
    }}>
      <img src={logoUrl} alt="Logo" style={{
        maxWidth:'100%', maxHeight:'100%', objectFit:'contain',
        filter: invert ? 'brightness(0) invert(1)' : undefined,
      }} />
    </div>
  ) : null;

  const SlideNum = ({ light = false }: { light?: boolean }) => slide.slideNumber ? (
    <div style={{ position:'absolute', bottom:'0.9rem', left:'1.8rem', display:'flex', alignItems:'center', gap:7, zIndex:10 }}>
      <div style={{
        width:'1.75rem', height:'1.75rem', borderRadius:'50%',
        background: light ? 'rgba(255,255,255,0.22)' : 'linear-gradient(135deg,var(--primary),var(--accent))',
        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'0.72rem', fontWeight:800, boxShadow: light ? 'none' : '0 2px 8px rgba(var(--primary-rgb),0.35)',
      }}>{slide.slideNumber}</div>
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════
  // 1. 차트
  // ══════════════════════════════════════════════════════════════
  const renderChart = () => {
    const cd = slide.chartData;
    if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;
    const colors = P.chartColors;
    const common = { data: cd.data, margin:{ top:16, right:24, bottom:8, left:0 } };
    const axisTick = { fill:'#94a3b8', fontSize:12, fontWeight:600 };

    if (cd.chartType === 'pie') return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={cd.data} dataKey="value" nameKey="name" cx="50%" cy="48%"
            outerRadius="68%" innerRadius="32%" paddingAngle={3}
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
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Line type="monotone" dataKey="value" name={cd.series1Label ?? '값'} stroke={colors[0]} strokeWidth={3} dot={{ r:5, fill:colors[0], strokeWidth:2, stroke:'#fff' }} activeDot={{ r:7 }}>
            <LabelList dataKey="value" position="top" style={{ fontSize:11, fontWeight:700, fill:colors[0] }} />
          </Line>
          {cd.data[0]?.value2 !== undefined && (
            <Line type="monotone" dataKey="value2" name={cd.series2Label ?? '값2'} stroke={colors[1]} strokeWidth={3} dot={{ r:5, fill:colors[1], strokeWidth:2, stroke:'#fff' }} activeDot={{ r:7 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    );

    if (cd.chartType === 'area') return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...common}>
          <defs>
            <linearGradient id="areaG1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[0]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="areaG2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[1]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[1]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Area type="monotone" dataKey="value" name={cd.series1Label ?? '값'} stroke={colors[0]} strokeWidth={2.5} fill="url(#areaG1)" />
          {cd.data[0]?.value2 !== undefined && (
            <Area type="monotone" dataKey="value2" name={cd.series2Label ?? '값2'} stroke={colors[1]} strokeWidth={2.5} fill="url(#areaG2)" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );

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
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize:12, fontWeight:600 }} />}
          <Bar dataKey="value" name={cd.series1Label ?? '값'} radius={[8,8,0,0]} maxBarSize={52}>
            {cd.data.map((_, i) => <Cell key={i} fill={`url(#barG${i % colors.length})`} />)}
            <LabelList dataKey="value" position="top" style={{ fontSize:11, fontWeight:700, fill:'#64748b' }} />
          </Bar>
          {cd.data[0]?.value2 !== undefined && (
            <Bar dataKey="value2" name={cd.series2Label ?? '값2'} fill={colors[1]} radius={[8,8,0,0]} maxBarSize={52} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 2. 테이블
  // ══════════════════════════════════════════════════════════════
  const renderTable = () => {
    const td = slide.tableData;
    if (!td?.headers?.length) return <EmptyPlaceholder icon={TableIcon} label="테이블 데이터 없음" />;
    const paddingY = slide.tableDensity === 'compact' ? '0.5rem' : slide.tableDensity === 'relaxed' ? '1.1rem' : '0.78rem';
    return (
      <div style={{ width:'100%', height:'100%', overflow:'hidden', borderRadius:14, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', border:`1px solid ${P.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize: contentFontSize }}>
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i} style={{
                  padding:`${paddingY} 1.3rem`,
                  background:'linear-gradient(135deg,var(--primary),var(--accent))',
                  color:'#fff', fontWeight:700, textAlign:'left',
                  fontSize:`${1.1 * contentSizeScale}rem`, whiteSpace:'nowrap',
                  borderRight: i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none',
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
                    padding:`${paddingY} 1.3rem`,
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

  // ══════════════════════════════════════════════════════════════
  // 3. KPI
  // ══════════════════════════════════════════════════════════════
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length) return <EmptyPlaceholder icon={Target} label="KPI 데이터 없음" />;
    const cols = km.length <= 2 ? km.length : km.length <= 4 ? 2 : 3;
    return (
      <div style={{
        display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`,
        gap:'1rem', height:'100%', alignContent:'center',
      }}>
        {km.map((kpi, i) => {
          const isUp   = kpi.trend === 'up';
          const isDown = kpi.trend === 'down';
          const grad   = P.kpiGradients[i % P.kpiGradients.length];
          return (
            <div key={i} style={{
              background: grad, borderRadius:18, padding:'1.6rem 1.4rem 1.3rem',
              color:'#fff', display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', textAlign:'center',
              boxShadow:'0 8px 28px rgba(0,0,0,0.18)',
              position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:'-20%', right:'-10%', width:'55%', paddingBottom:'55%', borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
              <div style={{ position:'absolute', bottom:'-15%', left:'-8%', width:'40%', paddingBottom:'40%', borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
              <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem' }}>
                <div style={{ fontSize:`${0.9 * contentSizeScale}rem`, fontWeight:700, opacity:0.8, letterSpacing:'0.12em', textTransform:'uppercase' }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize:`${2.8 * contentSizeScale}rem`, fontWeight:900, lineHeight:1, letterSpacing:'-0.02em', textShadow:'0 2px 12px rgba(0,0,0,0.2)' }}>
                  {kpi.value}
                </div>
                {kpi.description && (
                  <div style={{ fontSize:`${0.78 * contentSizeScale}rem`, opacity:0.75, fontWeight:500, marginTop:'0.2rem' }}>{kpi.description}</div>
                )}
                {kpi.trend && (
                  <div style={{
                    marginTop:'0.5rem', display:'inline-flex', alignItems:'center', gap:5,
                    fontSize:`${0.82 * contentSizeScale}rem`, fontWeight:700,
                    background:'rgba(255,255,255,0.22)', borderRadius:20, padding:'0.22rem 0.8rem',
                    backdropFilter:'blur(4px)',
                  }}>
                    {isUp   && <TrendingUp  style={{ width:'1em', height:'1em' }} />}
                    {isDown && <TrendingDown style={{ width:'1em', height:'1em' }} />}
                    {!isUp && !isDown && <Minus style={{ width:'1em', height:'1em' }} />}
                    <span>{isUp ? '상승' : isDown ? '하락' : '유지'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 4. Compare
  // ══════════════════════════════════════════════════════════════
  const renderCompare = () => {
    const leftItems  = Array.isArray(slide.leftItems)  ? slide.leftItems  : [];
    const rightItems = Array.isArray(slide.rightItems) ? slide.rightItems : [];
    const leftTitle  = slide.leftTitle  || 'AS-IS';
    const rightTitle = slide.rightTitle || 'TO-BE';

    if (!leftItems.length && !rightItems.length)
      return <EmptyPlaceholder icon={Layers} label="비교 데이터 없음" />;

    const renderItems = (items: string[], color: string, bgGrad: string, borderColor: string, isRight = false) => (
      <div style={{
        flex:1, borderRadius:18, padding:'1.3rem 1.5rem',
        background: bgGrad, border:`2px solid ${borderColor}`,
        display:'flex', flexDirection:'column', gap:'0.65rem',
        boxShadow:`0 4px 20px ${borderColor}40`,
      }}>
        <div style={{
          fontWeight:800, fontSize:`${1.2 * contentSizeScale}rem`, color,
          borderBottom:`2px solid ${borderColor}`, paddingBottom:'0.55rem',
          marginBottom:'0.2rem', display:'flex', alignItems:'center', gap:'0.5rem',
        }}>
          {isRight ? '✅' : '❌'} {isRight ? rightTitle : leftTitle}
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.65rem', fontSize: contentFontSize, color: P.text, lineHeight:1.5 }}>
            <span style={{
              flexShrink:0, width:`${1.45 * contentSizeScale}rem`, height:`${1.45 * contentSizeScale}rem`,
              borderRadius:'50%', background: color, color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.75rem', fontWeight:700, marginTop:'0.18rem',
            }}>{i + 1}</span>
            <span style={{ fontWeight:500 }}>{item}</span>
          </div>
        ))}
      </div>
    );

    return (
      <div style={{ display:'flex', gap:'1rem', height:'100%', alignItems:'stretch' }}>
        {renderItems(leftItems, '#dc2626', 'linear-gradient(135deg,#fff1f2,#ffe4e6)', '#fca5a5', false)}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, flexDirection:'column', gap:'0.35rem' }}>
          <div style={{
            width:'2.6rem', height:'2.6rem', borderRadius:'50%',
            background:'linear-gradient(135deg,#3b82f6,#6366f1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(99,102,241,0.4)',
          }}>
            <ArrowRight style={{ color:'#fff', width:'1.3rem', height:'1.3rem' }} />
          </div>
          <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:700, letterSpacing:'0.05em' }}>개선</span>
        </div>
        {renderItems(rightItems, '#16a34a', 'linear-gradient(135deg,#f0fdf4,#dcfce7)', '#86efac', true)}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 5. Timeline
  // ══════════════════════════════════════════════════════════════
  const renderTimeline = () => {
    const ms = slide.milestones;
    if (!ms?.length) return <EmptyPlaceholder icon={Clock} label="타임라인 데이터 없음" />;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem', height:'100%', justifyContent:'center' }}>
        {ms.map((m, i) => {
          const isDone = m.state === 'done';
          const isNext = m.state === 'next';
          const color  = isDone ? '#10b981' : isNext ? '#3b82f6' : '#94a3b8';
          const bgColor = isDone ? '#f0fdf4' : isNext ? '#eff6ff' : '#f8fafc';
          const bdColor = isDone ? '#86efac' : isNext ? '#93c5fd' : '#e2e8f0';
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <div style={{ flexShrink:0, textAlign:'right', width:'5.5rem', fontSize:`${0.85 * contentSizeScale}rem`, color: P.subtext, fontWeight:700, letterSpacing:'0.02em' }}>
                {m.date}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{
                  width:'1.5rem', height:'1.5rem', borderRadius:'50%',
                  background: isDone ? color : isNext ? '#fff' : '#f8fafc',
                  border:`3px solid ${color}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: isNext ? `0 0 0 4px ${color}30` : 'none',
                }}>
                  {isDone && <span style={{ color:'#fff', fontSize:'0.7rem', fontWeight:900 }}>✓</span>}
                  {isNext && <span style={{ width:'0.55rem', height:'0.55rem', borderRadius:'50%', background:color, display:'block' }} />}
                </div>
                {i < ms.length - 1 && (
                  <div style={{ width:2, height:'1.6rem', background:`linear-gradient(to bottom, ${color}, #e2e8f0)`, opacity: isDone ? 1 : 0.35 }} />
                )}
              </div>
              <div style={{
                flex:1, padding:'0.65rem 1.2rem',
                background: bgColor, borderRadius:10,
                border:`1.5px solid ${bdColor}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                boxShadow: isNext ? `0 2px 10px ${color}25` : 'none',
              }}>
                <span style={{ fontSize: contentFontSize, fontWeight: isNext ? 700 : 500, color: P.text }}>{m.label}</span>
                <span style={{
                  fontSize:'0.75rem', fontWeight:700, padding:'0.2rem 0.75rem',
                  borderRadius:20, background: isDone ? '#10b981' : isNext ? '#3b82f6' : '#e2e8f0',
                  color: isDone || isNext ? '#fff' : '#94a3b8', letterSpacing:'0.03em',
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

  // ══════════════════════════════════════════════════════════════
  // 6. Quote
  // ══════════════════════════════════════════════════════════════
  const renderQuote = () => {
    const text   = slide.text   || content[0] || '';
    const author = slide.author || content[1] || '';
    if (!text) return <EmptyPlaceholder icon={Quote} label="인용구 없음" />;
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100%', padding:'1rem 2.5rem', textAlign:'center', gap:'1.2rem',
        background:'linear-gradient(135deg,rgba(var(--primary-rgb),0.04),rgba(var(--accent-rgb,99,102,241),0.06))',
        borderRadius:18, border:'1px solid rgba(var(--primary-rgb),0.1)',
      }}>
        <div style={{ fontSize:'4.5rem', color:'var(--primary)', opacity:0.18, lineHeight:1, fontFamily:'Georgia,serif', marginBottom:'-0.5rem' }}>"</div>
        <p style={{ fontSize:`${1.65 * contentSizeScale}rem`, fontWeight:600, color: P.text, lineHeight:1.75, maxWidth:'84%', margin:0, fontStyle:'italic' }}>
          {text}
        </p>
        <div style={{ width:'3rem', height:'2px', background:'var(--primary)', opacity:0.3, borderRadius:2 }} />
        {author && (
          <div style={{ fontSize:`${1.0 * contentSizeScale}rem`, color: P.subtext, fontWeight:700, letterSpacing:'0.04em' }}>
            — {author}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 7. Bullets
  // ══════════════════════════════════════════════════════════════
  const renderBullets = () => {
    if (!content.length) return <EmptyPlaceholder icon={Layers} label="내용 없음" />;

    if (layout === 'grid') {
      const cols = content.length <= 4 ? 2 : 3;
      return (
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'0.85rem', height:'100%', alignContent:'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{
              background:'#fff', borderRadius:14, padding:'1rem 1.2rem',
              borderTop:`4px solid ${P.chartColors[i % P.chartColors.length]}`,
              display:'flex', flexDirection:'column', gap:'0.5rem',
              boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width:`${1.7 * contentSizeScale}rem`, height:`${1.7 * contentSizeScale}rem`,
                borderRadius:'50%', background: P.chartColors[i % P.chartColors.length],
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:`${0.82 * contentSizeScale}rem`, fontWeight:800,
              }}>{i + 1}</div>
              <span style={{ fontSize: contentFontSize, color: P.text, lineHeight:1.55, fontWeight:500 }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (layout === 'highlight') {
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', height:'100%', justifyContent:'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:'1rem',
              background: i === 0 ? 'linear-gradient(135deg,rgba(var(--primary-rgb),0.09),rgba(var(--primary-rgb),0.04))' : '#f8fafc',
              borderRadius:12, padding:'0.9rem 1.25rem',
              border: i === 0 ? `1.5px solid rgba(var(--primary-rgb),0.28)` : `1px solid ${P.border}`,
              boxShadow: i === 0 ? '0 2px 12px rgba(var(--primary-rgb),0.1)' : 'none',
            }}>
              <CheckCircle2 style={{ width:`${1.3 * contentSizeScale}rem`, height:`${1.3 * contentSizeScale}rem`, color: i === 0 ? 'var(--primary)' : '#94a3b8', flexShrink:0 }} />
              <span style={{ fontSize: contentFontSize, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P.text : P.subtext, lineHeight:1.5 }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.8rem' }}>
        {content.map((item, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.95rem', fontSize: contentFontSize, color: P.text, lineHeight:1.6 }}>
            <span style={{
              flexShrink:0, width:`${1.55 * contentSizeScale}rem`, height:`${1.55 * contentSizeScale}rem`,
              borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--accent))',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:`${0.78 * contentSizeScale}rem`, fontWeight:800, marginTop:'0.2rem',
              boxShadow:'0 2px 8px rgba(var(--primary-rgb),0.3)',
            }}>{i + 1}</span>
            <span style={{ fontWeight:500 }}>
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 8. Infographic
  // ══════════════════════════════════════════════════════════════
  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', height:'100%', gap:'0.6rem' }}>
          {content.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', maxWidth:150 }}>
                <div style={{
                  width:'6.5rem', height:'6.5rem', borderRadius:'50%',
                  background:`linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]}22,${P.chartColors[i % P.chartColors.length]}44)`,
                  border:`3px solid ${P.chartColors[i % P.chartColors.length]}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  textAlign:'center', fontSize:`${1 * contentSizeScale}rem`,
                  fontWeight:700, padding:'0.7rem', color: P.text,
                  boxShadow:`0 4px 16px ${P.chartColors[i % P.chartColors.length]}30`,
                }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                <span style={{ fontSize:`${0.82 * contentSizeScale}rem`, color: P.subtext, fontWeight:700, letterSpacing:'0.05em' }}>
                  STEP {i + 1}
                </span>
              </div>
              {i < content.length - 1 && (
                <ArrowRight style={{ color:'var(--primary)', flexShrink:0, width:'1.6rem', height:'1.6rem', opacity:0.55 }} />
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
                width:'2.3rem', height:'2.3rem', borderRadius:10, flexShrink:0,
                background:`linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]},${P.chartColors[(i+1) % P.chartColors.length]})`,
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:`${0.95 * contentSizeScale}rem`,
                boxShadow:`0 2px 10px ${P.chartColors[i % P.chartColors.length]}40`,
              }}>{i + 1}</div>
              <div style={{
                flex:1, padding:'0.75rem 1.2rem',
                background:'#f8fafc', borderRadius:10, border:`1px solid ${P.border}`,
                fontSize: contentFontSize, fontWeight:500, color: P.text,
                borderLeft:`3px solid ${P.chartColors[i % P.chartColors.length]}`,
              }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return renderBullets();
  };

  // ══════════════════════════════════════════════════════════════
  // 9. renderContent 분기
  // ══════════════════════════════════════════════════════════════
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
  // 10. 표지 슬라이드 (title)
  // ══════════════════════════════════════════════════════════════
  if (isFirstSlide && slide.type !== 'chart' && slide.type !== 'table' && slide.type !== 'kpi') {
    const titleLen = slide.title?.length ?? 0;
    const coverTitleSize = titleLen > 24 ? `${2.4 * titleSizeScale}rem` : titleLen > 16 ? `${2.9 * titleSizeScale}rem` : `${3.4 * titleSizeScale}rem`;

    return (
      <div className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,var(--primary) 0%,var(--accent) 100%)' }} />
        <div style={{ position:'absolute', top:'-12%', right:'-6%', width:'52%', paddingBottom:'52%', borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', bottom:'-18%', left:'-8%', width:'45%', paddingBottom:'45%', borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', top:'25%', right:'8%', width:'20%', paddingBottom:'20%', borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ position:'absolute', top:'10%', left:'38%', width:'8%', paddingBottom:'8%', borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
        <div style={{ position:'absolute', bottom:'28%', left:0, right:0, height:1, background:'rgba(255,255,255,0.1)' }} />
        <div style={{ position:'absolute', left:0, top:'15%', bottom:'15%', width:'6px', background:'rgba(255,255,255,0.35)', borderRadius:'0 4px 4px 0' }} />

        {Watermark}
        <Logo invert />
        <SlideNum light />

        <div style={{
          position:'relative', zIndex:1, height:'100%',
          display:'flex', flexDirection:'column',
          alignItems:'flex-start', justifyContent:'center',
          padding:'3.5rem 5.5rem 3.5rem 5rem',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.18)', borderRadius:20,
            padding:'0.35rem 1.1rem', marginBottom:'1.4rem',
            fontSize:`${0.9 * contentSizeScale}rem`,
            color:'rgba(255,255,255,0.95)', fontWeight:700,
            letterSpacing:'0.08em', backdropFilter:'blur(6px)',
            border:'1px solid rgba(255,255,255,0.25)',
          }}>
            <Sparkles style={{ width:'0.9em', height:'0.9em' }} />
            PRESENTATION
          </div>

          <h1 style={{
            color:'#fff', fontWeight:900, lineHeight:1.18,
            fontSize: coverTitleSize,
            letterSpacing:'-0.03em', marginBottom:'1.2rem',
            textShadow:'0 2px 20px rgba(0,0,0,0.2)',
            maxWidth:'82%', wordBreak:'keep-all',
          }}>{slide.title}</h1>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.2rem' }}>
            <div style={{ width:'3.5rem', height:'4px', background:'rgba(255,255,255,0.8)', borderRadius:4 }} />
            <div style={{ width:'1rem', height:'4px', background:'rgba(255,255,255,0.4)', borderRadius:4 }} />
            <div style={{ width:'0.5rem', height:'4px', background:'rgba(255,255,255,0.2)', borderRadius:4 }} />
          </div>

          {content.length > 0 && (
            <p style={{
              color:'rgba(255,255,255,0.88)',
              fontSize:`${1.35 * contentSizeScale}rem`,
              fontWeight:500, maxWidth:'68%', lineHeight:1.7, margin:0,
            }}>
              {content[0]}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 11. 일반 슬라이드
  // ══════════════════════════════════════════════════════════════
  const hasImage    = !!slide.imageUrl;
  const visualRatio = slide.visualRatio ?? 50;
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
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'0.4rem', background:`linear-gradient(90deg,var(--primary),var(--accent))` }} />
      <div style={{ position:'absolute', top:0, right:0, width:'14%', paddingBottom:'14%', background:`radial-gradient(circle at 100% 0%, ${accentColor}12 0%, transparent 70%)` }} />

      {Watermark}
      <Logo />
      <SlideNum />

      <div style={{ height:'100%', padding:'1.8rem 2.2rem 2.4rem', display:'flex', flexDirection:'column' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:'0.85rem',
          marginBottom:'1rem', paddingBottom:'0.75rem',
          borderBottom:`1.5px solid ${P.border}`, flexShrink:0,
        }}>
          <div style={{ width:'0.3rem', height:`${1.9 * titleSizeScale}rem`, background: accentColor, borderRadius:4, flexShrink:0 }} />
          <h2 style={{
            fontWeight:900, color: P.text, lineHeight:1.2, flex:1, margin:0,
            fontSize: autoFontSize(slide.title ?? '', 2.0 * titleSizeScale),
            letterSpacing:'-0.02em',
          }}>
            {slide.title}
          </h2>
        </div>

        <div style={{ flex:1, overflow:'hidden', display:'flex', gap:'1.4rem', minHeight:0 }}>
          <div style={{ width: hasImage ? `${textRatio}%` : '100%', overflow:'hidden', order: imageSide === 'left' ? 2 : 1 }}>
            {renderContent()}
          </div>
          {hasImage && slide.imageUrl && (
            <div style={{
              width:`${visualRatio}%`, borderRadius:16, overflow:'hidden',
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
