// ══════════════════════════════════════════════════════════════
// ScaledSlide.tsx — 완전 전체 코드 (2026.03.04 이미지 표시 수정)
// ✅ imageUrl: crossOrigin + onError 처리 추가
// ══════════════════════════════════════════════════════════════

import React from 'react';
import {
  ArrowRight, Layers, CheckCircle2,
  TrendingUp, TrendingDown, Minus,
  BarChart3 as BarIcon, Target, Table as TableIcon, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
interface SlideMetric { label: string; value: string; trend?: 'up' | 'down' | 'flat'; }
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
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 차트 렌더러
// ══════════════════════════════════════════════════════════════
function renderChart(chartData: SlideChartData, height = 220) {
  const { chartType = 'bar', data = [], series1Label = '값', series2Label, showLegend } = chartData;
  const hasSecondary = data.some(d => d.value2 !== undefined);
  const commonProps = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 4 },
  };
  const axisStyle = { fontSize: 10, fill: P.subtext };
  const gridStyle = { stroke: P.border, strokeDasharray: '3 3' };

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            outerRadius={height * 0.38} label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={P.chartColors[i % P.chartColors.length]} />)}
          </Pie>
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...commonProps}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} width={36} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Line type="monotone" dataKey="value" name={series1Label}
            stroke={P.chartColors[0]} strokeWidth={2.5} dot={{ r: 3 }} />
          {hasSecondary && <Line type="monotone" dataKey="value2" name={series2Label || '값2'}
            stroke={P.chartColors[1]} strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 3" />}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={P.chartColors[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={P.chartColors[0]} stopOpacity={0} />
            </linearGradient>
            {hasSecondary && (
              <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={P.chartColors[1]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={P.chartColors[1]} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis tick={axisStyle} width={36} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Area type="monotone" dataKey="value" name={series1Label}
            stroke={P.chartColors[0]} fill="url(#ag1)" strokeWidth={2} />
          {hasSecondary && <Area type="monotone" dataKey="value2" name={series2Label || '값2'}
            stroke={P.chartColors[1]} fill="url(#ag2)" strokeWidth={2} />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  // default: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart {...commonProps}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey="name" tick={axisStyle} />
        <YAxis tick={axisStyle} width={36} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
        <Bar dataKey="value" name={series1Label} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={P.chartColors[i % P.chartColors.length]} />)}
        </Bar>
        {hasSecondary && (
          <Bar dataKey="value2" name={series2Label || '값2'}
            fill={P.chartColors[1]} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 타입별 렌더러
// ══════════════════════════════════════════════════════════════

// ── title ──────────────────────────────────────────────────
function TitleSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const subtitle = slide.content?.[0] || '';
  const extra = slide.content?.slice(1) || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    }}>
      {/* AI 배경 이미지 */}
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.2, zIndex: 0,
          }}
        />
      )}
      {/* 장식 원 */}
      <div style={{
        position: 'absolute', top: -80, right: -80, width: 320, height: 320,
        borderRadius: '50%', background: 'rgba(59,130,246,0.12)', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60, width: 240, height: 240,
        borderRadius: '50%', background: 'rgba(139,92,246,0.1)', zIndex: 1,
      }} />
      {/* 슬라이드 번호 */}
      {slide.slideNumber !== undefined && (
        <div style={{
          position: 'absolute', top: 20, left: 28, fontSize: 11,
          color: 'rgba(255,255,255,0.35)', fontWeight: 500, zIndex: 3,
        }}>
          {String(slide.slideNumber).padStart(2, '0')}
        </div>
      )}
      {/* 로고 */}
      {logoUrl && (
        <img src={logoUrl} alt="logo" style={{
          position: 'absolute', top: 20, right: 28, height: 32,
          objectFit: 'contain', zIndex: 3, opacity: 0.85,
        }} />
      )}
      {/* 메인 콘텐츠 */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 60px', maxWidth: '85%' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(59,130,246,0.25)',
          border: '1px solid rgba(59,130,246,0.4)', borderRadius: 20,
          padding: '4px 16px', fontSize: 11, color: '#93c5fd',
          fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
        }}>
          PRESENTATION
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 800, color: '#f1f5f9',
          lineHeight: 1.2, marginBottom: 20,
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {slide.title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
            {subtitle}
          </p>
        )}
        {extra.map((line, i) => (
          <p key={i} style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{line}</p>
        ))}
      </div>
      {/* 하단 라인 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, zIndex: 3,
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
      }} />
      {watermark && (
        <div style={{
          position: 'absolute', bottom: 16, right: 24, fontSize: 9,
          color: 'rgba(255,255,255,0.2)', fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', zIndex: 3,
        }}>
          {watermark}
        </div>
      )}
    </div>
  );
}

// ── agenda ─────────────────────────────────────────────────
function AgendaSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const items = slide.content || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#3b82f6" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '12px 36px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: items.length > 4 ? '1fr 1fr' : '1fr', gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 10,
              background: i % 2 === 0 ? 'linear-gradient(135deg,#eff6ff,#f0f9ff)' : P.muted,
              border: `1px solid ${P.border}`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: P.text, lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── content ────────────────────────────────────────────────
function ContentSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const items = slide.content || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#3b82f6" />
      <div style={{ flex: 1, padding: '8px 36px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '9px 14px', marginBottom: 6, borderRadius: 8,
            background: P.muted, border: `1px solid ${P.border}`,
            transition: 'all 0.2s',
          }}>
            <CheckCircle2 style={{ width: 15, height: 15, color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: P.text, lineHeight: 1.5, fontWeight: 450 }}>{item}</span>
          </div>
        ))}
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── process ────────────────────────────────────────────────
function ProcessSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const steps = slide.content || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#8b5cf6" />
      <div style={{ flex: 1, padding: '8px 28px 20px', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: steps.length > 4 ? 'column' : 'row', gap: 8, alignItems: 'center' }}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, textAlign: 'center',
                background: `linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]}18,${P.chartColors[i % P.chartColors.length]}08)`,
                border: `1.5px solid ${P.chartColors[i % P.chartColors.length]}40`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]},${P.chartColors[(i + 1) % P.chartColors.length]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: P.text, lineHeight: 1.4 }}>{step}</span>
              </div>
              {i < steps.length - 1 && steps.length <= 4 && (
                <ArrowRight style={{ width: 16, height: 16, color: P.subtext, flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── compare ────────────────────────────────────────────────
function CompareSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const leftItems = slide.leftItems || [];
  const rightItems = slide.rightItems || [];
  const leftTitle = slide.leftTitle || 'AS-IS';
  const rightTitle = slide.rightTitle || 'TO-BE';
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#f59e0b" />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '8px 28px 20px', position: 'relative', zIndex: 1 }}>
        {/* 왼쪽 */}
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{
            textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#ef4444',
            marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #fecaca',
          }}>
            {leftTitle}
          </div>
          {leftItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7,
              padding: '6px 10px', background: 'rgba(239,68,68,0.06)', borderRadius: 6,
            }}>
              <span style={{ color: '#ef4444', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✕</span>
              <span style={{ fontSize: 12, color: P.text, lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
        {/* 오른쪽 */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{
            textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#10b981',
            marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #bbf7d0',
          }}>
            {rightTitle}
          </div>
          {rightItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7,
              padding: '6px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 6,
            }}>
              <span style={{ color: '#10b981', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 12, color: P.text, lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── chart ──────────────────────────────────────────────────
function ChartSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#06b6d4" />
      <div style={{ flex: 1, padding: '4px 28px 16px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {slide.chartData?.title && (
          <p style={{ fontSize: 11, color: P.subtext, textAlign: 'center', marginBottom: 4 }}>
            {slide.chartData.title}
          </p>
        )}
        {slide.chartData
          ? renderChart(slide.chartData, 230)
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarIcon style={{ width: 48, height: 48, color: P.border }} />
            </div>
        }
        {slide.content && slide.content.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {slide.content.map((c, i) => (
              <span key={i} style={{
                fontSize: 10, color: P.subtext, background: P.muted,
                border: `1px solid ${P.border}`, borderRadius: 4, padding: '2px 8px',
              }}>{c}</span>
            ))}
          </div>
        )}
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── table ──────────────────────────────────────────────────
function TableSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const headers = slide.tableData?.headers || [];
  const rows = slide.tableData?.rows || [];
  const density = slide.tableDensity || 'normal';
  const cellPy = density === 'compact' ? 4 : density === 'relaxed' ? 10 : 6;
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#10b981" />
      <div style={{ flex: 1, padding: '4px 28px 16px', overflow: 'auto', position: 'relative', zIndex: 1 }}>
        {headers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{
                    padding: `${cellPy + 2}px 12px`, textAlign: 'left',
                    background: 'linear-gradient(135deg,#1e3a5f,#1e293b)',
                    color: '#e2e8f0', fontWeight: 600, fontSize: 11,
                    borderBottom: '2px solid #3b82f6',
                    borderRight: i < headers.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? P.bg : P.muted }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: `${cellPy}px 12px`, color: ci === 0 ? P.text : P.subtext,
                      fontWeight: ci === 0 ? 500 : 400, fontSize: 11,
                      borderBottom: `1px solid ${P.border}`,
                      borderRight: ci < row.length - 1 ? `1px solid ${P.border}` : 'none',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <TableIcon style={{ width: 40, height: 40, color: P.border }} />
          </div>
        )}
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── kpi ────────────────────────────────────────────────────
function KpiSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const metrics = slide.keyMetrics || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#f59e0b" />
      <div style={{
        flex: 1, padding: '8px 28px 20px', display: 'flex', alignItems: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, 1fr)`, gap: 12,
        }}>
          {metrics.map((m, i) => {
            const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
            const trendColor = m.trend === 'up' ? '#10b981' : m.trend === 'down' ? '#ef4444' : P.subtext;
            return (
              <div key={i} style={{
                borderRadius: 12, padding: '16px 14px', textAlign: 'center',
                background: P.kpiGradients[i % P.kpiGradients.length],
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: 6 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
                  {m.value}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <TrendIcon style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.8)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                    {m.trend === 'up' ? '상승' : m.trend === 'down' ? '하락' : '유지'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── cards ──────────────────────────────────────────────────
function CardsSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const items = slide.content || [];
  const cols = items.length <= 3 ? items.length : items.length <= 4 ? 2 : 3;
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#8b5cf6" />
      <div style={{
        flex: 1, padding: '8px 28px 20px', display: 'flex', alignItems: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
          {items.map((item, i) => {
            const [titlePart, ...descParts] = item.split(':');
            const hasColon = item.includes(':');
            return (
              <div key={i} style={{
                borderRadius: 10, padding: '14px 14px',
                background: `linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]}14,${P.chartColors[i % P.chartColors.length]}06)`,
                border: `1.5px solid ${P.chartColors[i % P.chartColors.length]}30`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, marginBottom: 8,
                  background: `linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]},${P.chartColors[(i + 1) % P.chartColors.length]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap style={{ width: 14, height: 14, color: '#fff' }} />
                </div>
                {hasColon ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 4 }}>{titlePart.trim()}</div>
                    <div style={{ fontSize: 11, color: P.subtext, lineHeight: 1.5 }}>{descParts.join(':').trim()}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 500, color: P.text, lineHeight: 1.5 }}>{item}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── quote ──────────────────────────────────────────────────
function QuoteSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg,#0f172a,#1e293b)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.15, zIndex: 0,
          }}
        />
      )}
      {logoUrl && (
        <img src={logoUrl} alt="logo" style={{
          position: 'absolute', top: 20, right: 28, height: 28,
          objectFit: 'contain', zIndex: 3, opacity: 0.7,
        }} />
      )}
      {slide.slideNumber !== undefined && (
        <div style={{
          position: 'absolute', top: 20, left: 28, fontSize: 10,
          color: 'rgba(255,255,255,0.3)', fontWeight: 500, zIndex: 3,
        }}>
          {String(slide.slideNumber).padStart(2, '0')}
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 60px', maxWidth: '80%' }}>
        <div style={{ fontSize: 48, color: '#3b82f6', lineHeight: 1, marginBottom: 16, opacity: 0.8 }}>"</div>
        <p style={{ fontSize: 18, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.7, marginBottom: 20 }}>
          {slide.text || slide.content?.[0] || ''}
        </p>
        {(slide.author || slide.content?.[1]) && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', background: 'rgba(59,130,246,0.2)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20,
          }}>
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 500 }}>
              — {slide.author || slide.content?.[1]}
            </span>
          </div>
        )}
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, zIndex: 3,
        background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
      }} />
      {watermark && (
        <div style={{
          position: 'absolute', bottom: 12, right: 24, fontSize: 9,
          color: 'rgba(255,255,255,0.2)', zIndex: 3,
        }}>{watermark}</div>
      )}
    </div>
  );
}

// ── timeline ───────────────────────────────────────────────
function TimelineSlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const milestones = slide.milestones || [];
  const stateColors: Record<string, string> = {
    done: '#10b981', next: '#3b82f6', todo: '#94a3b8',
  };
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: P.bg, display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.06, zIndex: 0,
          }}
        />
      )}
      <SlideHeader slide={slide} logoUrl={logoUrl} accentColor="#06b6d4" />
      <div style={{ flex: 1, padding: '8px 28px 20px', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', position: 'relative' }}>
          {/* 중앙 라인 */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg,${P.chartColors[0]},${P.chartColors[2]})`,
            transform: 'translateY(-50%)', zIndex: 0,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ fontSize: 10, color: P.subtext, fontWeight: 500, textAlign: 'center' }}>{m.date}</div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: stateColors[m.state] || P.subtext,
                  border: `3px solid ${P.bg}`, boxShadow: `0 0 0 2px ${stateColors[m.state] || P.subtext}`,
                }} />
                <div style={{
                  fontSize: 11, fontWeight: m.state === 'next' ? 700 : 500,
                  color: m.state === 'todo' ? P.subtext : P.text,
                  textAlign: 'center', maxWidth: 80, lineHeight: 1.3,
                }}>
                  {m.label}
                </div>
                {m.state === 'done' && (
                  <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>완료</span>
                )}
                {m.state === 'next' && (
                  <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>진행중</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideFooter watermark={watermark} />
    </div>
  );
}

// ── summary ────────────────────────────────────────────────
function SummarySlide({ slide, logoUrl, watermark }: { slide: Slide; logoUrl?: string; watermark?: string }) {
  const items = slide.content || [];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt=""
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.15, zIndex: 0,
          }}
        />
      )}
      {slide.slideNumber !== undefined && (
        <div style={{
          position: 'absolute', top: 20, left: 28, fontSize: 10,
          color: 'rgba(255,255,255,0.3)', fontWeight: 500, zIndex: 3,
        }}>
          {String(slide.slideNumber).padStart(2, '0')}
        </div>
      )}
      {logoUrl && (
        <img src={logoUrl} alt="logo" style={{
          position: 'absolute', top: 20, right: 28, height: 28,
          objectFit: 'contain', zIndex: 3, opacity: 0.7,
        }} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 40px', position: 'relative', zIndex: 2 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 24, textAlign: 'center' }}>
          {slide.title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg,${P.chartColors[i % P.chartColors.length]},${P.chartColors[(i + 1) % P.chartColors.length]})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, zIndex: 3,
        background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4)',
      }} />
      {watermark && (
        <div style={{
          position: 'absolute', bottom: 12, right: 24, fontSize: 9,
          color: 'rgba(255,255,255,0.2)', zIndex: 3,
        }}>{watermark}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 공통 헤더 / 푸터
// ══════════════════════════════════════════════════════════════
function SlideHeader({ slide, logoUrl, accentColor = '#3b82f6' }: {
  slide: Slide; logoUrl?: string; accentColor?: string;
}) {
  return (
    <div style={{
      padding: '16px 28px 10px', flexShrink: 0, position: 'relative', zIndex: 2,
      borderBottom: `2px solid ${accentColor}20`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {slide.slideNumber !== undefined && (
            <div style={{ fontSize: 10, color: P.subtext, fontWeight: 500, marginBottom: 3 }}>
              {String(slide.slideNumber).padStart(2, '0')}
            </div>
          )}
          <h2 style={{
            fontSize: 18, fontWeight: 700, color: P.text, lineHeight: 1.3,
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: 10, margin: 0,
          }}>
            {slide.title}
          </h2>
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="logo" style={{
            height: 28, objectFit: 'contain', opacity: 0.8, marginLeft: 12,
          }} />
        )}
      </div>
    </div>
  );
}

function SlideFooter({ watermark }: { watermark?: string }) {
  if (!watermark) return null;
  return (
    <div style={{
      padding: '6px 28px', flexShrink: 0, zIndex: 2,
      borderTop: `1px solid ${P.border}`,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <span style={{ fontSize: 9, color: P.subtext, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {watermark}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 메인 export: ScaledSlide
// ══════════════════════════════════════════════════════════════
export function ScaledSlide({ slide, containerClassName, logoUrl, watermark }: ScaledSlideProps) {
  const renderSlide = () => {
    switch (slide.type) {
      case 'title':
        return <TitleSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'agenda':
        return <AgendaSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'process':
        return <ProcessSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'compare':
        return <CompareSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'chart':
        return <ChartSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'table':
        return <TableSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'kpi':
        return <KpiSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'cards':
        return <CardsSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'quote':
        return <QuoteSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'timeline':
        return <TimelineSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'summary':
        return <SummarySlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
      case 'content':
      default:
        return <ContentSlide slide={slide} logoUrl={logoUrl} watermark={watermark} />;
    }
  };

  return (
    <div
      className={containerClassName}
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        position: 'relative',
        background: P.bg,
      }}
    >
      {renderSlide()}
    </div>
  );
}
