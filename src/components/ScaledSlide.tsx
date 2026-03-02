import React from 'react';
import {
  ArrowRight, Layers, CheckCircle2,
  TrendingUp, TrendingDown, Minus,
  BarChart3 as BarIcon, Target,
  Table as TableIcon, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
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

interface SlideMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
}

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
  primary:     'var(--primary)',
  accent:      'var(--accent)',
  bg:          '#ffffff',
  text:        '#1a2133',
  subtext:     '#64748b',
  border:      '#e2e8f0',
  muted:       '#f8fafc',
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
// 공통: Recharts 커스텀 툴팁
// ══════════════════════════════════════════════════════════════
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', color: '#fff',
      borderRadius: 8, padding: '8px 14px', fontSize: 13,
    }}>
      <div style={{ marginBottom: 4, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 공통: 빈 상태 플레이스홀더
// ══════════════════════════════════════════════════════════════
const EmptyPlaceholder = ({ icon: Icon, label }: { icon: React.FC<any>; label: string }) => (
  <div style={{
    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0',
    color: '#94a3b8', flexDirection: 'column', gap: 10,
  }}>
    <Icon style={{ width: 40, height: 40, opacity: 0.25 }} />
    <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// ScaledSlide 컴포넌트
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark = '',
}) => {
  const rawContent  = slide.content ?? slide.points ?? slide.items ?? [];
  const content: string[] = Array.isArray(rawContent) ? (rawContent as string[]) : [];
  const titleSizeScale   = slide.titleSizeScale   ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout           = slide.layout ?? 'default';

  const titleFontSize   = `${3    * titleSizeScale}rem`;
  const contentFontSize = `${1.45 * contentSizeScale}rem`;
  const isFirstSlide    = (slide.slideNumber ?? 1) === 1 || slide.type === 'title';

  // ── 공통 장식 헬퍼 ──────────────────────────────────────────
  const Watermark = () => watermark ? (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', opacity: 0.03, transform: 'rotate(-30deg)',
      fontSize: '9rem', fontWeight: 900, color: '#000', userSelect: 'none',
    }}>{watermark}</div>
  ) : null;

  const Logo = ({ invert = false }: { invert?: boolean }) => logoUrl ? (
    <div style={{
      position: 'absolute', top: '1.3rem', right: '1.8rem',
      width: '5.5rem', height: '2.8rem',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      <img
        src={logoUrl} alt="Logo"
        style={{
          maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          filter: invert ? 'brightness(0) invert(1)' : undefined,
        }}
      />
    </div>
  ) : null;

  const SlideNum = ({ light = false }: { light?: boolean }) =>
    slide.slideNumber ? (
      <div style={{
        position: 'absolute', bottom: '1rem', left: '2rem',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: '1.9rem', height: '1.9rem', borderRadius: '50%',
          background: light
            ? 'rgba(255,255,255,0.25)'
            : `linear-gradient(135deg,${P.primary},${P.accent})`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.78rem', fontWeight: 700,
        }}>
          {slide.slideNumber}
        </div>
      </div>
    ) : null;

  // ════════════════════════════════════════════════════════════
  // 1. 차트
  // ════════════════════════════════════════════════════════════
  const renderChart = () => {
    const cd = slide.chartData;
    if (!cd?.data?.length)
      return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;

    const colors = P.chartColors;
    const common = { data: cd.data, margin: { top: 10, right: 20, bottom: 10, left: 0 } };
    const axisTick = { fill: '#94a3b8', fontSize: 13 };

    if (cd.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cd.data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius="70%" paddingAngle={3}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#94a3b8' }}
            >
              {cd.data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
            <Line
              type="monotone" dataKey="value" name={cd.series1Label ?? '값'}
              stroke={colors[0]} strokeWidth={3}
              dot={{ r: 5, fill: colors[0] }}
            />
            {cd.data[0]?.value2 !== undefined && (
              <Line
                type="monotone" dataKey="value2" name={cd.series2Label ?? '비교'}
                stroke={colors[1]} strokeWidth={3}
                dot={{ r: 5, fill: colors[1] }}
              />
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
              <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
            <Area
              type="monotone" dataKey="value" name={cd.series1Label ?? '값'}
              stroke={colors[0]} strokeWidth={2.5} fill="url(#areaGrad1)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // bar (default)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
          <Bar
            dataKey="value" name={cd.series1Label ?? '값'}
            fill={colors[0]} radius={[6, 6, 0, 0]} maxBarSize={54}
          />
          {cd.data[0]?.value2 !== undefined && (
            <Bar
              dataKey="value2" name={cd.series2Label ?? '비교'}
              fill={colors[1]} radius={[6, 6, 0, 0]} maxBarSize={54}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ════════════════════════════════════════════════════════════
  // 2. 테이블
  // ════════════════════════════════════════════════════════════
  const renderTable = () => {
    const td = slide.tableData;
    if (!td?.headers?.length)
      return <EmptyPlaceholder icon={TableIcon} label="테이블 데이터 없음" />;

    const paddingY =
      slide.tableDensity === 'compact'  ? '0.55rem' :
      slide.tableDensity === 'relaxed'  ? '1.2rem'  : '0.85rem';

    return (
      <div style={{
        width: '100%', overflowX: 'auto',
        borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        border: `1px solid ${P.border}`,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: contentFontSize }}>
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i} style={{
                  padding: `${paddingY} 1.4rem`,
                  background: P.primary,
                  color: '#fff',
                  fontWeight: 700,
                  textAlign: 'left',
                  fontSize: `${1.2 * contentSizeScale}rem`,
                  whiteSpace: 'nowrap',
                  borderRight: i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.rows?.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: `${paddingY} 1.4rem`,
                    borderBottom: `1px solid ${P.border}`,
                    borderRight: ci < row.length - 1 ? `1px solid ${P.border}` : 'none',
                    color:      ci === 0 ? P.text    : P.subtext,
                    fontWeight: ci === 0 ? 600       : 400,
                    fontSize: `${1.15 * contentSizeScale}rem`,
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // 3. KPI 카드
  // ════════════════════════════════════════════════════════════
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length)
      return <EmptyPlaceholder icon={Target} label="KPI 데이터 없음" />;

    const cols = km.length <= 2 ? km.length : km.length <= 4 ? 2 : 3;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1.1rem',
        height: '100%',
        alignContent: 'center',
      }}>
        {km.map((kpi, i) => {
          const isUp   = kpi.trend === 'up';
          const isDown = kpi.trend === 'down';
          return (
            <div key={i} style={{
              background: P.kpiGradients[i % P.kpiGradients.length],
              borderRadius: 16,
              padding: '1.5rem 1.3rem',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
            }}>
              <div style={{
                fontSize: `${1.05 * contentSizeScale}rem`,
                fontWeight: 700,
                opacity: 0.82,
                marginBottom: '0.5rem',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}>
                {kpi.label}
              </div>
              <div style={{
                fontSize: `${3.0 * contentSizeScale}rem`,
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: -1,
              }}>
                {kpi.value}
              </div>
              {kpi.trend && (
                <div style={{
                  marginTop: '0.7rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: `${0.95 * contentSizeScale}rem`,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  padding: '0.25rem 0.85rem',
                }}>
                  {isUp   && <TrendingUp   style={{ width: '1em', height: '1em' }} />}
                  {isDown && <TrendingDown style={{ width: '1em', height: '1em' }} />}
                  {!isUp && !isDown && <Minus style={{ width: '1em', height: '1em' }} />}
                  {isUp ? '상승' : isDown ? '하락' : '유지'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // 4. 불릿 목록
  // ════════════════════════════════════════════════════════════
  const renderBullets = () => {
    if (!content.length)
      return <EmptyPlaceholder icon={Layers} label="내용 없음" />;

    // 그리드 레이아웃
    if (layout === 'grid') {
      const cols = content.length <= 4 ? 2 : 3;
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '1rem',
          height: '100%',
          alignContent: 'center',
        }}>
          {content.map((item, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg,#f0f7ff 0%,#e8f4fd 100%)',
              borderRadius: 14,
              padding: '1.1rem 1.3rem',
              borderLeft: `4px solid ${P.chartColors[i % P.chartColors.length]}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: `${1.8 * contentSizeScale}rem`,
                height: `${1.8 * contentSizeScale}rem`,
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: 2,
                background: P.chartColors[i % P.chartColors.length],
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${0.88 * contentSizeScale}rem`,
                fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: contentFontSize,
                color: P.text,
                lineHeight: 1.55,
                fontWeight: 500,
              }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // 하이라이트 레이아웃
    if (layout === 'highlight') {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          height: '100%',
          justifyContent: 'center',
        }}>
          {content.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.1rem',
              background: i === 0
                ? `linear-gradient(135deg,${P.primary}18,${P.primary}06)`
                : '#f8fafc',
              borderRadius: 12,
              padding: '0.95rem 1.3rem',
              border: i === 0
                ? `1.5px solid ${P.primary}40`
                : `1px solid ${P.border}`,
              transition: 'all 0.2s',
            }}>
              <CheckCircle2 style={{
                width:    `${1.4 * contentSizeScale}rem`,
                height:   `${1.4 * contentSizeScale}rem`,
                color:    i === 0 ? P.primary : '#94a3b8',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize:   contentFontSize,
                fontWeight: i === 0 ? 700 : 500,
                color:      i === 0 ? P.text : P.subtext,
                lineHeight: 1.5,
              }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // 기본 불릿 (default / split-left / split-right)
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {content.map((item, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            fontSize: contentFontSize,
            color: P.text,
            lineHeight: 1.55,
          }}>
            <span style={{
              flexShrink: 0,
              width:  `${1.65 * contentSizeScale}rem`,
              height: `${1.65 * contentSizeScale}rem`,
              borderRadius: '50%',
              background: `linear-gradient(135deg,${P.primary},${P.accent})`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${0.85 * contentSizeScale}rem`,
              fontWeight: 700,
              marginTop: '0.22rem',
              boxShadow: `0 2px 8px ${P.primary}40`,
            }}>
              {i + 1}
            </span>
            <span style={{ fontWeight: 500 }}>
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  // ════════════════════════════════════════════════════════════
  // 5. 인포그래픽
  // ════════════════════════════════════════════════════════════
  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '100%',
          gap: '0.8rem',
        }}>
          {content.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', maxWidth: 160 }}>
                <div style={{
                  width: '7rem', height: '7rem', borderRadius: '50%',
                  background: `linear-gradient(135deg,${P.primary}20,${P.primary}45)`,
                  border: `3px solid ${P.primary}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: `${1.05 * contentSizeScale}rem`,
                  fontWeight: 700,
                  padding: '0.75rem',
                  color: P.text,
                  boxShadow: `0 4px 16px ${P.primary}30`,
                }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                <span style={{
                  fontSize: `${0.88 * contentSizeScale}rem`,
                  color: P.subtext, fontWeight: 600, letterSpacing: 0.5,
                }}>
                  STEP {i + 1}
                </span>
              </div>
              {i < content.length - 1 && (
                <ArrowRight style={{ color: P.primary, flexShrink: 0, width: '1.8rem', height: '1.8rem', opacity: 0.7 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (slide.infographicType === 'process') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100%', justifyContent: 'center' }}>
          {content.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem',
                borderRadius: 10,
                flexShrink: 0,
                background: `linear-gradient(135deg,${P.primary},${P.accent})`,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
                fontSize: `${1 * contentSizeScale}rem`,
                boxShadow: `0 2px 10px ${P.primary}40`,
              }}>
                {i + 1}
              </div>
              <div style={{
                flex: 1,
                padding: '0.8rem 1.2rem',
                background: '#f8fafc',
                borderRadius: 10,
                border: `1px solid ${P.border}`,
                fontSize: contentFontSize,
                fontWeight: 500,
                color: P.text,
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

  // ════════════════════════════════════════════════════════════
  // 6. 슬라이드 타입별 분기
  // ════════════════════════════════════════════════════════════
  const renderContent = () => {
    switch (slide.type) {
      case 'chart': return renderChart();
      case 'table': return renderTable();
      case 'kpi':   return renderKPI();
      default:
        if (!content.length)
          return <EmptyPlaceholder icon={Layers} label="내용 없음" />;
        return renderInfographic();
    }
  };

  // ════════════════════════════════════════════════════════════
  // 7. 타이틀 슬라이드 (첫 번째 슬라이드)
  // ════════════════════════════════════════════════════════════
  if (isFirstSlide && slide.type !== 'chart' && slide.type !== 'table' && slide.type !== 'kpi') {
    return (
      <div
        className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}
        style={{ background: P.bg }}
      >
        {/* 풀 그라디언트 배경 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg,${P.primary} 0%,${P.accent} 100%)`,
        }} />

        {/* 장식 원 1 */}
        <div style={{
          position: 'absolute', right: '-8%', top: '-20%',
          width: '55%', paddingBottom: '55%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />

        {/* 장식 원 2 */}
        <div style={{
          position: 'absolute', left: '-5%', bottom: '-15%',
          width: '40%', paddingBottom: '40%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        {/* 장식 원 3 (소) */}
        <div style={{
          position: 'absolute', left: '30%', top: '10%',
          width: '15%', paddingBottom: '15%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <Watermark />
        <Logo invert />
        <SlideNum light />

        {/* 콘텐츠 */}
        <div style={{
          position: 'relative', zIndex: 1,
          height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '4rem 6rem', textAlign: 'center',
        }}>
          {/* 배지 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.16)',
            borderRadius: 20,
            padding: '0.4rem 1.2rem',
            marginBottom: '1.6rem',
            fontSize: `${1.05 * contentSizeScale}rem`,
            color: 'rgba(255,255,255,0.92)',
            fontWeight: 600,
            letterSpacing: 1,
            backdropFilter: 'blur(4px)',
          }}>
            <Zap style={{ width: '1em', height: '1em' }} />
            PRESENTATION
          </div>

          {/* 제목 */}
          <h1 style={{
            color: '#fff',
            fontWeight: 900,
            lineHeight: 1.2,
            fontSize: titleFontSize,
            letterSpacing: '-0.025em',
            marginBottom: '1.6rem',
            textShadow: '0 2px 24px rgba(0,0,0,0.18)',
            maxWidth: '85%',
          }}>
            {slide.title}
          </h1>

          {/* 구분선 */}
          <div style={{
            width: '4rem', height: '3px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 2,
            marginBottom: '1.4rem',
          }} />

          {/* 부제목/첫 번째 내용 */}
          {content.length > 0 && (
            <p style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: `${1.5 * contentSizeScale}rem`,
              fontWeight: 500,
              maxWidth: '70%',
              lineHeight: 1.65,
            }}>
              {content[0]}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // 8. 일반 슬라이드
  // ════════════════════════════════════════════════════════════
  const hasImage   = !!slide.imageUrl;
  const visualRatio = slide.visualRatio ?? 50;
  const textRatio   = 100 - visualRatio;
  const imageSide   = layout === 'split-right' ? 'left' : 'right';

  return (
    <div
      className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}
    >
      {/* 상단 컬러 밴드 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '0.45rem',
        background: `linear-gradient(90deg,${P.primary},${P.accent})`,
      }} />

      <Watermark />
      <Logo />
      <SlideNum />

      {/* 메인 레이아웃 */}
      <div style={{
        height: '100%',
        padding: '2.2rem 2.5rem 2.8rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 제목 영역 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.2rem',
          paddingBottom: '0.85rem',
          borderBottom: `1.5px solid ${P.border}`,
          flexShrink: 0,
        }}>
          {/* 수직 컬러 바 */}
          <div style={{
            width: '0.32rem',
            height: `${2.1 * titleSizeScale}rem`,
            background: `linear-gradient(180deg,${P.primary},${P.accent})`,
            borderRadius: 4,
            flexShrink: 0,
          }} />
          <h2 style={{
            fontWeight: 900,
            color: P.text,
            fontSize: titleFontSize,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            flex: 1,
            margin: 0,
          }}>
            {slide.title}
          </h2>
        </div>

        {/* 본문 */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          gap: '1.5rem',
          minHeight: 0,
        }}>
          {/* 텍스트/콘텐츠 영역 */}
          <div style={{
            width: hasImage ? `${textRatio}%` : '100%',
            overflow: 'hidden',
            order: imageSide === 'left' ? 2 : 1,
          }}>
            {renderContent()}
          </div>

          {/* 이미지 영역 */}
          {hasImage && slide.imageUrl && (
            <div style={{
              width: `${visualRatio}%`,
              borderRadius: 16,
              overflow: 'hidden',
              flexShrink: 0,
              order: imageSide === 'left' ? 1 : 2,
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}>
              <img
                src={slide.imageUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
