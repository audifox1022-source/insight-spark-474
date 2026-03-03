import React from 'react';
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
// 타입
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
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  imageUrl?: string;
  layout?: string;
  notes?: string;
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
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
// 공통: Recharts 커스텀 툴팁
// ══════════════════════════════════════════════════════════════
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#1e293b',
        color: '#fff',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
      }}
    >
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
  <div
    style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      borderRadius: 16,
      border: '2px dashed #e2e8f0',
      color: '#94a3b8',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    <Icon style={{ width: 40, height: 40, opacity: 0.25 }} />
    <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// ScaledSlide
// ══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content: string[] = Array.isArray(rawContent) ? (rawContent as string[]) : [];

  const titleSizeScale = slide.titleSizeScale ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout = slide.layout ?? 'default';

  const titleFontSize = `${3 * titleSizeScale}rem`;
  const contentFontSize = `${1.85 * contentSizeScale}rem`;

  const isFirstSlide = (slide.slideNumber ?? 1) === 1 || slide.type === 'title';

  // ──────────────────────────────────────────────────────────────
  // 워터마크
  // ──────────────────────────────────────────────────────────────
  const Watermark = watermark ? (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: 0.03,
        transform: 'rotate(-30deg)',
        fontSize: '9rem',
        fontWeight: 900,
        color: '#000',
        userSelect: 'none',
      }}
    >
      {watermark}
    </div>
  ) : null;

  // ──────────────────────────────────────────────────────────────
  // 로고
  // ──────────────────────────────────────────────────────────────
  const Logo = ({ invert = false }: { invert?: boolean }) =>
    logoUrl ? (
      <div
        style={{
          position: 'absolute',
          top: '1.3rem',
          right: '1.8rem',
          width: '5.5rem',
          height: '2.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            filter: invert ? 'brightness(0) invert(1)' : undefined,
          }}
        />
      </div>
    ) : null;

  // ──────────────────────────────────────────────────────────────
  // 슬라이드 번호
  // ──────────────────────────────────────────────────────────────
  const SlideNum = ({ light = false }: { light?: boolean }) =>
    slide.slideNumber ? (
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: '1.9rem',
            height: '1.9rem',
            borderRadius: '50%',
            background: light
              ? 'rgba(255,255,255,0.25)'
              : `linear-gradient(135deg,${P.primary},${P.accent})`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}
        >
          {slide.slideNumber}
        </div>
      </div>
    ) : null;

  // ══════════════════════════════════════════════════════════════
  // 1) 차트 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderChart = () => {
    const cd = slide.chartData;
    if (!cd?.data?.length) return <EmptyPlaceholder icon={BarIcon} label="차트 데이터 없음" />;

    const colors = P.chartColors;
    const common = { data: cd.data, margin: { top: 10, right: 20, bottom: 10, left: 0 } };
    const axisTick = { fill: '#94a3b8', fontSize: 13 };

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
              outerRadius="70%"
              paddingAngle={3}
              label={(entry) => `${entry.name}: ${(entry.percent! * 100).toFixed(0)}%`}
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
              type="monotone"
              dataKey="value"
              name={cd.series1Label ?? '시리즈1'}
              stroke={colors[0]}
              strokeWidth={3}
              dot={{ r: 5, fill: colors[0] }}
            />
            {cd.data[0]?.value2 !== undefined && (
              <Line
                type="monotone"
                dataKey="value2"
                name={cd.series2Label ?? '시리즈2'}
                stroke={colors[1]}
                strokeWidth={3}
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
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {cd.showLegend && <Legend wrapperStyle={{ fontSize: 13 }} />}
            <Area
              type="monotone"
              dataKey="value"
              name={cd.series1Label ?? '시리즈1'}
              stroke={colors[0]}
              strokeWidth={2.5}
              fill="url(#areaGrad1)"
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
            dataKey="value"
            name={cd.series1Label ?? '시리즈1'}
            fill={colors[0]}
            radius={[6, 6, 0, 0]}
            maxBarSize={54}
          />
          {cd.data[0]?.value2 !== undefined && (
            <Bar
              dataKey="value2"
              name={cd.series2Label ?? '시리즈2'}
              fill={colors[1]}
              radius={[6, 6, 0, 0]}
              maxBarSize={54}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 2) 테이블 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderTable = () => {
    const td = slide.tableData;
    if (!td?.headers?.length) return <EmptyPlaceholder icon={TableIcon} label="테이블 데이터 없음" />;

    const paddingY =
      slide.tableDensity === 'compact'
        ? '0.55rem'
        : slide.tableDensity === 'relaxed'
        ? '1.2rem'
        : '0.85rem';

    return (
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          borderRadius: 14,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          border: `1px solid ${P.border}`,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: contentFontSize }}>
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: `${paddingY} 1.4rem`,
                    background: P.primary,
                    color: '#fff',
                    fontWeight: 700,
                    textAlign: 'left',
                    fontSize: `${1.2 * contentSizeScale}rem`,
                    whiteSpace: 'nowrap',
                    borderRight:
                      i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.rows?.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: `${paddingY} 1.4rem`,
                      borderBottom: `1px solid ${P.border}`,
                      borderRight: ci < row.length - 1 ? `1px solid ${P.border}` : 'none',
                      color: ci === 0 ? P.text : P.subtext,
                      fontWeight: ci === 0 ? 600 : 400,
                      fontSize: `${1.15 * contentSizeScale}rem`,
                    }}
                  >
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

  // ══════════════════════════════════════════════════════════════
  // 3) KPI 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length) return <EmptyPlaceholder icon={Target} label="KPI 데이터 없음" />;

    const cols = km.length <= 2 ? km.length : km.length === 4 ? 2 : 3;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '1.1rem',
          height: '100%',
          alignContent: 'center',
        }}
      >
        {km.map((kpi, i) => {
          const isUp = kpi.trend === 'up';
          const isDown = kpi.trend === 'down';
          return (
            <div
              key={i}
              style={{
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
              }}
            >
              <div
                style={{
                  fontSize: `${1.05 * contentSizeScale}rem`,
                  fontWeight: 700,
                  opacity: 0.82,
                  marginBottom: '0.5rem',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: `${3.0 * contentSizeScale}rem`,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: -1,
                }}
              >
                {kpi.value}
              </div>
              {kpi.trend && (
                <div
                  style={{
                    marginTop: '0.7rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: `${0.95 * contentSizeScale}rem`,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: '0.25rem 0.85rem',
                  }}
                >
                  {isUp && <TrendingUp style={{ width: '1em', height: '1em' }} />}
                  {isDown && <TrendingDown style={{ width: '1em', height: '1em' }} />}
                  {!isUp && !isDown && <Minus style={{ width: '1em', height: '1em' }} />}
                  {isUp ? '상승' : isDown ? '하락' : '보합'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 3.5) Compare 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderCompare = () => {
    if (!slide.leftItems?.length && !slide.rightItems?.length) {
      return <EmptyPlaceholder icon={BarIcon} label="비교 데이터 없음" />;
    }

    const leftItems = slide.leftItems ?? [];
    const rightItems = slide.rightItems ?? [];
    const leftTitle = slide.leftTitle ?? 'AS-IS';
    const rightTitle = slide.rightTitle ?? 'TO-BE';

    return (
      <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
        {/* 왼쪽 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${P.primary}, ${P.accent})`,
              color: '#fff',
              padding: '0.9rem 1.3rem',
              borderRadius: '12px 12px 0 0',
              fontSize: `${1.3 * contentSizeScale}rem`,
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {leftTitle}
          </div>
          <div
            style={{
              flex: 1,
              background: '#f8fafc',
              border: `1px solid ${P.border}`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '1.3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              overflowY: 'auto',
            }}
          >
            {leftItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.8rem',
                  fontSize: contentFontSize,
                  color: P.text,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: `${1.5 * contentSizeScale}rem`,
                    height: `${1.5 * contentSizeScale}rem`,
                    borderRadius: '50%',
                    background: P.primary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `${0.8 * contentSizeScale}rem`,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontWeight: 500 }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 중앙 화살표 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: P.primary,
            flexShrink: 0,
          }}
        >
          <ArrowRight style={{ width: '2.5rem', height: '2.5rem', strokeWidth: 2.5 }} />
        </div>

        {/* 오른쪽 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '0.9rem 1.3rem',
              borderRadius: '12px 12px 0 0',
              fontSize: `${1.3 * contentSizeScale}rem`,
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {rightTitle}
          </div>
          <div
            style={{
              flex: 1,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '1.3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              overflowY: 'auto',
            }}
          >
            {rightItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.8rem',
                  fontSize: contentFontSize,
                  color: P.text,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: `${1.5 * contentSizeScale}rem`,
                    height: `${1.5 * contentSizeScale}rem`,
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `${0.8 * contentSizeScale}rem`,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontWeight: 500 }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 4) 타임라인 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderTimeline = () => {
    const ms = slide.milestones;
    if (!ms?.length) return <EmptyPlaceholder icon={Layers} label="타임라인 데이터 없음" />;

    const stateColor = (state: string) => {
      if (state === 'done') return '#10b981';
      if (state === 'next') return P.primary;
      return '#cbd5e1';
    };

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          height: '100%',
          justifyContent: 'center',
        }}
      >
        {ms.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            {/* 상태 원 */}
            <div
              style={{
                width: `${1.8 * contentSizeScale}rem`,
                height: `${1.8 * contentSizeScale}rem`,
                borderRadius: '50%',
                flexShrink: 0,
                background: stateColor(m.state),
                border: m.state === 'next' ? `3px solid ${P.accent}` : '3px solid transparent',
                boxShadow: m.state === 'done' ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
              }}
            />
            {/* 연결선 (마지막 제외) */}
            {i < ms.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${0.9 * contentSizeScale}rem`,
                  height: '0.85rem',
                  width: 2,
                  background: stateColor(m.state),
                  opacity: 0.4,
                }}
              />
            )}
            {/* 내용 */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: contentFontSize,
                  fontWeight: m.state === 'next' ? 700 : 600,
                  color: m.state === 'todo' ? P.subtext : P.text,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: `${0.9 * contentSizeScale}rem`,
                  color: P.subtext,
                  marginTop: 2,
                }}
              >
                {m.date}
              </div>
            </div>
            {/* 상태 배지 */}
            <div
              style={{
                fontSize: `${0.8 * contentSizeScale}rem`,
                fontWeight: 700,
                padding: '0.2rem 0.7rem',
                borderRadius: 20,
                background:
                  m.state === 'done'
                    ? '#dcfce7'
                    : m.state === 'next'
                    ? '#dbeafe'
                    : '#f1f5f9',
                color:
                  m.state === 'done'
                    ? '#16a34a'
                    : m.state === 'next'
                    ? '#2563eb'
                    : '#94a3b8',
              }}
            >
              {m.state === 'done' ? '완료' : m.state === 'next' ? '진행중' : '예정'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 5) 인용구 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderQuote = () => {
    const text = slide.text || content[0] || '';
    const author = slide.author || content[1] || '';
    if (!text) return <EmptyPlaceholder icon={Layers} label="인용구 없음" />;

    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '1.5rem',
          padding: '1rem 2rem',
        }}
      >
        <div
          style={{
            fontSize: `${4 * contentSizeScale}rem`,
            lineHeight: 0.8,
            color: P.primary,
            fontWeight: 900,
            opacity: 0.3,
          }}
        >
          "
        </div>
        <p
          style={{
            fontSize: `${1.7 * contentSizeScale}rem`,
            fontWeight: 600,
            color: P.text,
            lineHeight: 1.6,
            fontStyle: 'italic',
            maxWidth: '85%',
          }}
        >
          {text}
        </p>
        {author && (
          <div
            style={{
              fontSize: `${1.1 * contentSizeScale}rem`,
              color: P.subtext,
              fontWeight: 600,
              borderTop: `2px solid ${P.border}`,
              paddingTop: '0.8rem',
            }}
          >
            — {author}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 6) 불릿 렌더링 (여러 레이아웃)
  // ══════════════════════════════════════════════════════════════
  const renderBullets = () => {
    if (!content.length) return <EmptyPlaceholder icon={Layers} label="콘텐츠 없음" />;

    if (layout === 'grid') {
      const cols = content.length <= 4 ? 2 : 3;
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '1rem',
            height: '100%',
            alignContent: 'center',
          }}
        >
          {content.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'linear-gradient(135deg,#f0f7ff 0%,#e8f4fd 100%)',
                borderRadius: 14,
                padding: '1.1rem 1.3rem',
                borderLeft: `4px solid ${P.chartColors[i % P.chartColors.length]}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
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
                }}
              >
                {i + 1}
              </div>
              <span
                style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.55, fontWeight: 500 }}
              >
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (layout === 'highlight') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            height: '100%',
            justifyContent: 'center',
          }}
        >
          {content.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.1rem',
                background:
                  i === 0 ? `linear-gradient(135deg,${P.primary}18,${P.primary}06)` : '#f8fafc',
                borderRadius: 12,
                padding: '0.95rem 1.3rem',
                border: i === 0 ? `1.5px solid ${P.primary}40` : `1px solid ${P.border}`,
              }}
            >
              <CheckCircle2
                style={{
                  width: `${1.4 * contentSizeScale}rem`,
                  height: `${1.4 * contentSizeScale}rem`,
                  color: i === 0 ? P.primary : '#94a3b8',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: contentFontSize,
                  fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? P.text : P.subtext,
                  lineHeight: 1.5,
                }}
              >
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // default
    return (
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}
      >
        {content.map((item, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              fontSize: contentFontSize,
              color: P.text,
              lineHeight: 1.55,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: `${1.65 * contentSizeScale}rem`,
                height: `${1.65 * contentSizeScale}rem`,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${0.85 * contentSizeScale}rem`,
                fontWeight: 700,
                marginTop: '0.22rem',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
              }}
            >
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

  // ══════════════════════════════════════════════════════════════
  // 7) 인포그래픽 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '100%',
            gap: '0.8rem',
          }}
        >
          {content.map((item, i) => (
            <React.Fragment key={i}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.55rem',
                  maxWidth: 160,
                }}
              >
                <div
                  style={{
                    width: '7rem',
                    height: '7rem',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg,${P.primary}20,${P.primary}45)`,
                    border: `3px solid ${P.primary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: `${1.05 * contentSizeScale}rem`,
                    fontWeight: 700,
                    padding: '0.75rem',
                    color: P.text,
                    boxShadow: `0 4px 16px ${P.primary}30`,
                  }}
                >
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                <span
                  style={{
                    fontSize: `${0.88 * contentSizeScale}rem`,
                    color: P.subtext,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                >
                  STEP {i + 1}
                </span>
              </div>
              {i < content.length - 1 && (
                <ArrowRight
                  style={{
                    color: P.primary,
                    flexShrink: 0,
                    width: '1.8rem',
                    height: '1.8rem',
                    opacity: 0.7,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (slide.infographicType === 'process') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            height: '100%',
            justifyContent: 'center',
          }}
        >
          {content.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: 10,
                  flexShrink: 0,
                  background: `linear-gradient(135deg,${P.primary},${P.accent})`,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: `${1 * contentSizeScale}rem`,
                  boxShadow: `0 2px 10px ${P.primary}40`,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '0.8rem 1.2rem',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: `1px solid ${P.border}`,
                  fontSize: contentFontSize,
                  fontWeight: 500,
                  color: P.text,
                }}
              >
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
  // 8) 슬라이드 타입별 콘텐츠 선택
  // ══════════════════════════════════════════════════════════════
  const renderContent = () => {
    switch (slide.type) {
      case 'chart':
        return renderChart();
      case 'table':
        return renderTable();
      case 'kpi':
        return renderKPI();
      case 'compare':
        return renderCompare();
      case 'timeline':
        return renderTimeline();
      case 'quote':
        return renderQuote();
      default:
        if (!content.length) return <EmptyPlaceholder icon={Layers} label="콘텐츠 없음" />;
        return renderInfographic();
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 9) 첫 슬라이드 (타이틀 슬라이드) 렌더링
  // ══════════════════════════════════════════════════════════════
  if (
    isFirstSlide &&
    slide.type !== 'chart' &&
    slide.type !== 'table' &&
    slide.type !== 'kpi'
  ) {
    return (
      <div
        className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}
        style={{ background: P.bg }}
      >
        {/* 배경 그라데이션 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg,${P.primary} 0%,${P.accent} 100%)`,
          }}
        />
        {/* 장식 원형들 */}
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: -80,
            width: '50%',
            paddingBottom: '50%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -60,
            bottom: -60,
            width: '38%',
            paddingBottom: '38%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '20%',
            bottom: '15%',
            width: '18%',
            paddingBottom: '18%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            filter: 'blur(1px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '25%',
            top: '12%',
            width: '12%',
            paddingBottom: '12%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            filter: 'blur(1px)',
          }}
        />

        {Watermark}
        <Logo invert />
        <SlideNum light />

        {/* 타이틀 콘텐츠 */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5rem 6.5rem',
            textAlign: 'center',
          }}
        >
          {/* 상단 배지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.22)',
              borderRadius: 50,
              padding: '0.55rem 1.5rem',
              marginBottom: '2.5rem',
              fontSize: `${0.95 * contentSizeScale}rem`,
              color: '#fff',
              fontWeight: 700,
              letterSpacing: 2.5,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              textTransform: 'uppercase',
            }}
          >
            <Zap style={{ width: '1.15em', height: '1.15em', strokeWidth: 2.5 }} />
            Presentation
          </div>

          {/* 메인 타이틀 */}
          <h1
            style={{
              color: '#fff',
              fontWeight: 900,
              lineHeight: 1.15,
              fontSize: `${3.2 * titleSizeScale}rem`,
              letterSpacing: '-0.03em',
              marginBottom: '1.2rem',
              textShadow: '0 4px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
              maxWidth: '90%',
            }}
          >
            {slide.title}
          </h1>

          {/* 구분선 */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}
          >
            <div
              style={{
                width: '2.5rem',
                height: 2,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.8)',
              }}
            />
            <div
              style={{
                width: '2.5rem',
                height: 2,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 2,
              }}
            />
          </div>

          {/* 서브타이틀 */}
          {content.length > 0 && (
            <p
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: `${1.4 * contentSizeScale}rem`,
                fontWeight: 500,
                maxWidth: '75%',
                lineHeight: 1.7,
                textShadow: '0 2px 16px rgba(0,0,0,0.2)',
              }}
            >
              {content[0]}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 10) 일반 슬라이드 렌더링
  // ══════════════════════════════════════════════════════════════
  const hasImage = !!slide.imageUrl;
  const visualRatio = slide.visualRatio ?? 50;
  const textRatio = 100 - visualRatio;
  const imageSide = layout === 'split-right' ? 'left' : 'right';

  return (
    <div
      className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}
    >
      {/* 상단 accent 바 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '0.45rem',
          background: `linear-gradient(90deg,${P.primary},${P.accent})`,
        }}
      />

      {Watermark}
      <Logo />
      <SlideNum />

      <div
        style={{
          height: '100%',
          padding: '3.5rem 3.5rem 3.8rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 제목 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '0.85rem',
            borderBottom: `1.5px solid ${P.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '0.32rem',
              height: `${2.1 * titleSizeScale}rem`,
              background: `linear-gradient(180deg,${P.primary},${P.accent})`,
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontWeight: 900,
              color: P.text,
              fontSize: titleFontSize,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              flex: 1,
              margin: 0,
            }}
          >
            {slide.title}
          </h2>
        </div>

        {/* 콘텐츠 영역 */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            gap: '1.5rem',
            minHeight: 0,
          }}
        >
          {/* 텍스트(콘텐츠) 영역 */}
          <div
            style={{
              width: hasImage ? `${textRatio}%` : '100%',
              overflow: 'hidden',
              order: imageSide === 'left' ? 2 : 1,
            }}
          >
            {renderContent()}
          </div>

          {/* 이미지 영역 */}
          {hasImage && slide.imageUrl && (
            <div
              style={{
                width: `${visualRatio}%`,
                borderRadius: 16,
                overflow: 'hidden',
                flexShrink: 0,
                order: imageSide === 'left' ? 1 : 2,
                boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              }}
            >
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
