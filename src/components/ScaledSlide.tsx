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
  leftItems?: string[];
  rightItems?: string[];
  leftTitle?: string;
  rightTitle?: string;
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
export const ScaledSlide: React.FC<ScaledSlideProps> = ({ slide, containerClassName = '', logoUrl, watermark }) => {
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content: string[] = Array.isArray(rawContent) ? (rawContent as string[]) : [];

  const titleSizeScale = slide.titleSizeScale ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const layout = slide.layout ?? 'default';

  const titleFontSize = `${3 * titleSizeScale}rem`;
  const contentFontSize = `${1.45 * contentSizeScale}rem`;

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
      <div style={{ position: 'absolute', bottom: '1rem', left: '2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: '1.9rem',
            height: '1.9rem',
            borderRadius: '50%',
            background: light ? 'rgba(255,255,255,0.25)' : `linear-gradient(135deg,${P.primary},${P.accent})`,
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
          <Bar dataKey="value" name={cd.series1Label ?? '시리즈1'} fill={colors[0]} radius={[6, 6, 0, 0]} maxBarSize={54} />
          {cd.data[0]?.value2 !== undefined && (
            <Bar dataKey="value2" name={cd.series2Label ?? '시리즈2'} fill={colors[1]} radius={[6, 6, 0, 0]} maxBarSize={54} />
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

    const paddingY = slide.tableDensity === 'compact' ? '0.55rem' : slide.tableDensity === 'relaxed' ? '1.2rem' : '0.85rem';

    return (
      <div style={{ width: '100%', overflowX: 'auto', borderRadius: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${P.border}` }}>
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
                    borderRight: i < td.headers!.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
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
  // 3) KPI 렌더링 — 오버플로우 방지 개선
  // ══════════════════════════════════════════════════════════════
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km?.length) return <EmptyPlaceholder icon={Target} label="KPI 데이터 없음" />;

    const cols = km.length <= 2 ? km.length : km.length === 4 ? 2 : 3;
    
    // ✅ KPI 개수에 따라 폰트 크기 자동 축소
    const valueFontSize = km.length >= 6 ? 2.2 : km.length >= 4 ? 2.6 : 3.0;
    const labelFontSize = km.length >= 6 ? 0.85 : km.length >= 4 ? 0.95 : 1.05;
    const trendFontSize = km.length >= 6 ? 0.75 : km.length >= 4 ? 0.85 : 0.95;
    const cardPadding = km.length >= 6 ? '1rem 0.9rem' : '1.5rem 1.3rem';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1.1rem', height: '100%', alignContent: 'center' }}>
        {km.map((kpi, i) => {
          const isUp = kpi.trend === 'up';
          const isDown = kpi.trend === 'down';
          return (
            <div
              key={i}
              style={{
                background: P.kpiGradients[i % P.kpiGradients.length],
                borderRadius: 16,
                padding: cardPadding,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: `${labelFontSize * contentSizeScale}rem`,
                  fontWeight: 700,
                  opacity: 0.82,
                  marginBottom: '0.4rem',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {kpi.label}
              </div>
              <div style={{ 
                fontSize: `${valueFontSize * contentSizeScale}rem`, 
                fontWeight: 900, 
                lineHeight: 1.1, 
                letterSpacing: -1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {kpi.value}
              </div>
              {kpi.trend && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: `${trendFontSize * contentSizeScale}rem`,
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: '0.2rem 0.75rem',
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
  // 3.5) Compare 렌더링 — 색상 대비 + 여백 재조정
  // ══════════════════════════════════════════════════════════════
  const renderCompare = () => {
    if (!slide.leftItems?.length && !slide.rightItems?.length) {
      return <EmptyPlaceholder icon={BarIcon} label="비교 데이터 없음" />;
    }

    const leftItems  = slide.leftItems  ?? [];
    const rightItems = slide.rightItems ?? [];
    const leftTitle  = slide.leftTitle  ?? 'AS-IS';
    const rightTitle = slide.rightTitle ?? 'TO-BE';

    // ✅ 대비 강화 색상 팔레트 (WCAG AA 준수)
    const LEFT_BG     = '#1e3a8a';   // 진한 파랑 헤더
    const LEFT_LIGHT  = '#eff6ff';   // 연한 파랑 바디
    const LEFT_BADGE  = '#1d4ed8';   // 파랑 번호 뱃지
    const LEFT_BORDER = '#93c5fd';   // 파랑 테두리
    const LEFT_TEXT   = '#1e3a8a';   // 파랑 텍스트

    const RIGHT_BG    = '#064e3b';   // 진한 초록 헤더
    const RIGHT_LIGHT = '#f0fdf4';   // 연한 초록 바디
    const RIGHT_BADGE = '#047857';   // 초록 번호 뱃지
    const RIGHT_BORDER= '#86efac';   // 초록 테두리
    const RIGHT_TEXT  = '#064e3b';   // 초록 텍스트

    const maxRows = Math.max(leftItems.length, rightItems.length);

    // ✅ 항목 수에 따라 폰트·패딩·간격 자동 축소 (여백 증가)
    const itemFontSize  = `${Math.max(0.85, 1.3 - maxRows * 0.07) * contentSizeScale}rem`;
    const itemPadding   = maxRows >= 7 ? '0.4rem 0.8rem' : maxRows >= 5 ? '0.55rem 0.95rem' : '0.7rem 1.1rem';
    const itemGap       = maxRows >= 7 ? '0.5rem' : maxRows >= 5 ? '0.65rem' : '0.8rem';
    const bodyPadding   = maxRows >= 7 ? '0.7rem' : maxRows >= 5 ? '0.9rem' : '1.1rem';
    const badgeSize     = `${Math.max(1.3, 1.6 - maxRows * 0.04) * contentSizeScale}rem`;
    const badgeFontSize = `${Math.max(0.7, 0.8 - maxRows * 0.02) * contentSizeScale}rem`;

    const renderPanel = (
      items: string[],
      title: string,
      headerBg: string,
      bodyBg: string,
      badgeColor: string,
      borderColor: string,
      textColor: string,
    ) => (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* ✅ 헤더: 진한 배경 + 흰색 글자 (WCAG AA 대비 보장) */}
        <div style={{
          background: headerBg,
          color: '#ffffff',
          padding: '0.9rem 1.2rem',
          borderRadius: '12px 12px 0 0',
          fontSize: `${1.2 * contentSizeScale}rem`,
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: 0.5,
          flexShrink: 0,
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          {title}
        </div>

        {/* ✅ 스크롤바 제거 + 여백 증가 */}
        <div style={{
          flex: 1,
          background: bodyBg,
          border: `2px solid ${borderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          padding: bodyPadding,
          display: 'flex',
          flexDirection: 'column',
          gap: itemGap,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#ffffff',
              borderRadius: 10,
              padding: itemPadding,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}>
              {/* ✅ 번호 뱃지: 진한 배경 + 흰 글자 */}
              <span style={{
                flexShrink: 0,
                width: badgeSize,
                height: badgeSize,
                borderRadius: '50%',
                background: badgeColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: badgeFontSize,
                fontWeight: 800,
              }}>
                {i + 1}
              </span>

              {/* ✅ 텍스트: 흰 배경 위 패널별 진한 색상 텍스트 + 말줄임표 */}
              <span style={{
                fontSize: itemFontSize,
                fontWeight: 700,
                color: textColor,
                lineHeight: 1.35,
                flex: 1,
                wordBreak: 'keep-all',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        height: '100%',
        alignItems: 'stretch',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {renderPanel(leftItems, leftTitle, LEFT_BG, LEFT_LIGHT, LEFT_BADGE, LEFT_BORDER, LEFT_TEXT)}

        {/* 중앙 화살표 — 크기 증가 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          paddingTop: '3rem',
        }}>
          <div style={{
            width: '2.8rem',
            height: '2.8rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e3a8a, #047857)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            <ArrowRight style={{ width: '1.4rem', height: '1.4rem', color: '#ffffff', strokeWidth: 3 }} />
          </div>
        </div>

        {renderPanel(rightItems, rightTitle, RIGHT_BG, RIGHT_LIGHT, RIGHT_BADGE, RIGHT_BORDER, RIGHT_TEXT)}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 4) 불릿 렌더링 (여러 레이아웃)
  // ══════════════════════════════════════════════════════════════
  const renderBullets = () => {
    if (!content.length) return <EmptyPlaceholder icon={Layers} label="콘텐츠 없음" />;

    // 레이아웃: grid
    if (layout === 'grid') {
      const cols = content.length <= 4 ? 2 : 3;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem', height: '100%', alignContent: 'center' }}>
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
              <span style={{ fontSize: contentFontSize, color: P.text, lineHeight: 1.55, fontWeight: 500 }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // 레이아웃: highlight
    if (layout === 'highlight') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', height: '100%', justifyContent: 'center' }}>
          {content.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.1rem',
                background: i === 0 ? `linear-gradient(135deg,${P.primary}18,${P.primary}06)` : '#f8fafc',
                borderRadius: 12,
                padding: '0.95rem 1.3rem',
                border: i === 0 ? `1.5px solid ${P.primary}40` : `1px solid ${P.border}`,
                transition: 'all 0.2s',
              }}
            >
              <CheckCircle2
                style={{ width: `${1.4 * contentSizeScale}rem`, height: `${1.4 * contentSizeScale}rem`, color: i === 0 ? P.primary : '#94a3b8', flexShrink: 0 }}
              />
              <span style={{ fontSize: contentFontSize, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P.text : P.subtext, lineHeight: 1.5 }}>
                {typeof item === 'string' ? item : JSON.stringify(item)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // default / split-left / split-right
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {content.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: contentFontSize, color: '#1a2133', lineHeight: 1.55 }}>
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
            <span style={{ fontWeight: 600, color: '#1a2133' }}>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // 5) 인포그래픽 렌더링
  // ══════════════════════════════════════════════════════════════
  const renderInfographic = () => {
    if (slide.infographicType === 'cycle') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '100%', gap: '0.8rem' }}>
          {content.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', maxWidth: 160 }}>
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
                <span style={{ fontSize: `${0.88 * contentSizeScale}rem`, color: P.subtext, fontWeight: 600, letterSpacing: 0.5 }}>
                  STEP {i + 1}
                </span>
              </div>
              {i < content.length - 1 && <ArrowRight style={{ color: P.primary, flexShrink: 0, width: '1.8rem', height: '1.8rem', opacity: 0.7 }} />}
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
  // 6) 슬라이드 타입별 콘텐츠 선택
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
      default:
        if (!content.length) return <EmptyPlaceholder icon={Layers} label="콘텐츠 없음" />;
        return renderInfographic();
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 7) 첫 슬라이드 (타이틀 슬라이드) 렌더링 — 일반 슬라이드와 통일된 디자인
  // ══════════════════════════════════════════════════════════════
  if (isFirstSlide && slide.type !== 'chart' && slide.type !== 'table' && slide.type !== 'kpi') {
    return (
      <div className={`aspect-video w-full relative overflow-hidden ${containerClassName}`} style={{ background: P.bg }}>
        {/* 상단 accent 바 (일반 슬라이드와 동일) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.45rem', background: `linear-gradient(90deg,${P.primary},${P.accent})` }} />

        {Watermark}
        <Logo />
        <SlideNum />

        <div style={{ height: '100%', padding: '3.5rem 3.5rem 3.8rem', display: 'flex', flexDirection: 'column' }}>
          {/* 타이틀 영역 (일반 슬라이드 제목 스타일 적용) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '0.85rem', borderBottom: `1.5px solid ${P.border}`, flexShrink: 0 }}>
            <div style={{ width: '0.32rem', height: `${2.8 * titleSizeScale}rem`, background: `linear-gradient(180deg,${P.primary},${P.accent})`, borderRadius: 4, flexShrink: 0 }} />
            <h1 style={{ fontWeight: 900, color: P.text, fontSize: `${3.5 * titleSizeScale}rem`, letterSpacing: '-0.02em', lineHeight: 1.2, flex: 1, margin: 0 }}>
              {slide.title}
            </h1>
          </div>

          {/* 콘텐츠 영역 (중앙 정렬) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem' }}>
            {/* Presentation 배지 */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                background: `linear-gradient(135deg,${P.primary}15,${P.accent}15)`,
                border: `2px solid ${P.primary}`,
                borderRadius: 50,
                padding: '0.9rem 2.5rem',
                fontSize: `${1.2 * contentSizeScale}rem`,
                color: P.primary,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                boxShadow: `0 4px 16px ${P.primary}20`,
              }}
            >
              <Zap style={{ width: '1.5em', height: '1.5em', strokeWidth: 2.5 }} />
              Presentation
            </div>

            {/* 서브타이틀 (큰 텍스트) */}
            {content.length > 0 && (
              <div style={{ 
                textAlign: 'center',
                maxWidth: '85%',
                background: P.muted,
                borderRadius: 16,
                padding: '2rem 3rem',
                border: `1px solid ${P.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}>
                <p style={{ 
                  color: P.text, 
                  fontSize: `${2 * contentSizeScale}rem`, 
                  fontWeight: 600, 
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {content[0]}
                </p>
              </div>
            )}

            {/* 추가 콘텐츠 (있는 경우) */}
            {content.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '75%' }}>
                {content.slice(1).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: '1rem 1.5rem',
                      border: `1px solid ${P.border}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <CheckCircle2 style={{ width: `${1.5 * contentSizeScale}rem`, height: `${1.5 * contentSizeScale}rem`, color: P.primary, flexShrink: 0 }} />
                    <span style={{ fontSize: `${1.3 * contentSizeScale}rem`, fontWeight: 500, color: P.subtext, lineHeight: 1.5 }}>
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 8) 일반 슬라이드 렌더링
  // ══════════════════════════════════════════════════════════════
  const hasImage = !!slide.imageUrl;
  const visualRatio = slide.visualRatio ?? 50;
  const textRatio = 100 - visualRatio;
  const imageSide = layout === 'split-right' ? 'left' : 'right';

  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
      {/* 상단 accent 바 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.45rem', background: `linear-gradient(90deg,${P.primary},${P.accent})` }} />

      {Watermark}
      <Logo />
      <SlideNum />

      <div style={{ height: '100%', padding: '3.5rem 3.5rem 3.8rem', display: 'flex', flexDirection: 'column' }}>
        {/* 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '0.85rem', borderBottom: `1.5px solid ${P.border}`, flexShrink: 0 }}>
          <div style={{ width: '0.32rem', height: `${2.1 * titleSizeScale}rem`, background: `linear-gradient(180deg,${P.primary},${P.accent})`, borderRadius: 4, flexShrink: 0 }} />
          <h2 style={{ fontWeight: 900, color: P.text, fontSize: titleFontSize, letterSpacing: '-0.02em', lineHeight: 1.2, flex: 1, margin: 0 }}>
            {slide.title}
          </h2>
        </div>

        {/* 콘텐츠 영역 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '1.5rem', minHeight: 0 }}>
          {/* 텍스트 영역 */}
          <div style={{ width: hasImage ? `${textRatio}%` : '100%', overflow: 'hidden', order: imageSide === 'left' ? 2 : 1 }}>
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
              <img src={slide.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
