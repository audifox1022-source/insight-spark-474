/**
 * ScaledSlide.tsx
 *
 * 수정 사항:
 * 1. [차트 수정] SlideChart(Recharts) 컴포넌트를 실제로 사용하도록 연결.
 *    기존에는 오래된 chartData.labels/datasets 구조를 기대했지만,
 *    실제 Slide 타입은 SlideChartData({ chartType, data[] }) 구조이므로 타입 맞춤.
 * 2. [배경 수정] 단순 흰 배경 → 슬라이드 타입별 세련된 그라디언트/디자인 배경 적용.
 * 3. ScaledSlide는 16:9 비율 내부에서 1920×1080 기준으로 렌더링되며,
 *    부모가 CSS transform scale로 크기를 조정합니다.
 */

import React from 'react';
import { ArrowRight, Layers, BarChart3, Table as TableIcon, Target } from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

// presentation.ts 의 Slide 타입 사용 (경로는 프로젝트에 맞게 유지)
import type { Slide, SlideChartData } from '@/types/presentation';

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ─── 슬라이드 타입별 배경 스타일 ────────────────────────────────────────────
function getSlideBackground(type: string | undefined, imageUrl?: string): React.CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.75) 100%), url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: '#fff',
    };
  }

  switch (type) {
    case 'title':
      return {
        background: 'linear-gradient(135deg, hsl(215,60%,22%) 0%, hsl(200,80%,30%) 100%)',
        color: '#fff',
      };
    case 'section':
      return {
        background: 'linear-gradient(135deg, hsl(215,55%,18%) 0%, hsl(215,60%,26%) 100%)',
        color: '#fff',
      };
    case 'closing':
      return {
        background: 'linear-gradient(135deg, hsl(200,80%,28%) 0%, hsl(215,60%,20%) 100%)',
        color: '#fff',
      };
    case 'kpi':
      return {
        background: 'linear-gradient(160deg, #f8fafc 0%, #e8f4fd 100%)',
      };
    case 'chart':
    case 'data':
      return {
        background: 'linear-gradient(160deg, #f8fafc 0%, #eef6fb 100%)',
      };
    default:
      return {
        background: 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)',
      };
  }
}

// ─── 제목 텍스트 색 (배경에 따라) ────────────────────────────────────────────
function getTitleColor(type: string | undefined, imageUrl?: string): string {
  if (imageUrl) return '#fff';
  switch (type) {
    case 'title':
    case 'section':
    case 'closing':
      return '#fff';
    default:
      return 'hsl(215,60%,22%)';
  }
}

// ─── 액센트 바 색상 ───────────────────────────────────────────────────────────
function getAccentColor(type: string | undefined, imageUrl?: string): string {
  if (imageUrl || type === 'title' || type === 'section' || type === 'closing') {
    return 'rgba(255,255,255,0.5)';
  }
  return 'hsl(200,80%,44%)';
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  const bgStyle = getSlideBackground(slide.type, slide.imageUrl);
  const isDark =
    !!slide.imageUrl ||
    slide.type === 'title' ||
    slide.type === 'section' ||
    slide.type === 'closing';
  const titleColor = getTitleColor(slide.type, slide.imageUrl);
  const accentColor = getAccentColor(slide.type, slide.imageUrl);

  // ── 일반 불릿 컨텐츠 ──────────────────────────────────────────────────────
  const rawContent = slide.points || slide.items || (slide as any).content;
  const content: string[] = Array.isArray(rawContent) ? rawContent : [];

  // ── 인포그래픽 렌더링 ─────────────────────────────────────────────────────
  const renderInfographic = () => {
    switch ((slide as any).infographicType) {
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full gap-4">
            {content.map((item, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full border-4 flex items-center justify-center p-4 text-center text-sm font-bold shadow-lg z-10"
                  style={{ borderColor: accentColor, background: isDark ? 'rgba(255,255,255,0.12)' : 'white', color: isDark ? '#fff' : 'hsl(215,60%,22%)' }}
                >
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                {i < content.length - 1 && (
                  <ArrowRight className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-8 z-0" style={{ color: accentColor }} />
                )}
              </div>
            ))}
          </div>
        );
      case 'process':
        return (
          <div className="space-y-4">
            {content.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold flex-shrink-0"
                  style={{ background: accentColor }}
                >
                  {i + 1}
                </div>
                <div
                  className="flex-1 p-4 rounded-xl border font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : '#f8fafc',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
                    color: isDark ? '#fff' : '#1e293b',
                  }}
                >
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return (
          <ul className="space-y-6">
            {content.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-4 text-2xl leading-snug"
                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#334155' }}
              >
                <span
                  className="mt-2.5 w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: accentColor }}
                />
                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  // ── ✅ 차트 렌더링 - SlideChart(Recharts) 컴포넌트 사용 ──────────────────
  const renderChart = () => {
    const chartData: SlideChartData | undefined = slide.chartData;

    if (!chartData || !Array.isArray(chartData.data) || chartData.data.length === 0) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#e2e8f0', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}
        >
          <BarChart3 className="w-12 h-12 mb-3 opacity-40" />
          <p>차트 데이터를 분석 중입니다...</p>
        </div>
      );
    }

    return (
      // ✨ isSlideView=true → 큰 폰트로 전체 슬라이드 크기에 맞게 렌더링
      <SlideChart chartData={chartData} isSlideView={true} />
    );
  };

  // ── 테이블 렌더링 ─────────────────────────────────────────────────────────
  const renderTable = () => {
    const tableData = (slide as any).tableData;
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#e2e8f0', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}
        >
          <TableIcon className="w-12 h-12 mb-3 opacity-40" />
          <p>표 데이터를 구성 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="w-full overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: '#e2e8f0' }}>
        <table className="w-full text-left text-lg">
          <thead style={{ background: 'hsl(215,60%,22%)', color: '#fff' }}>
            <tr>
              {tableData.headers.map((header: string, i: number) => (
                <th key={i} className="px-6 py-4 font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y bg-white" style={{ divideColor: '#f1f5f9' }}>
            {tableData.rows.map((row: string[], i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-6 py-4 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── KPI 렌더링 ────────────────────────────────────────────────────────────
  const renderKPI = () => {
    const { keyMetrics } = slide;
    if (!keyMetrics || !Array.isArray(keyMetrics)) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#e2e8f0', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}
        >
          <Target className="w-12 h-12 mb-3 opacity-40" />
          <p>핵심 지표를 도출 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full content-center">
        {keyMetrics.map((kpi, i) => (
          <div
            key={i}
            className="p-8 rounded-2xl border flex flex-col items-center text-center shadow-md"
            style={{
              background: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
            }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
              {kpi.label}
            </h3>
            <p className="text-5xl font-black mb-2" style={{ color: isDark ? '#fff' : 'hsl(215,60%,22%)' }}>
              {kpi.value}
            </p>
            {kpi.trend && (
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  background:
                    kpi.trend === 'up' ? '#dcfce7' :
                    kpi.trend === 'down' ? '#fee2e2' : '#f1f5f9',
                  color:
                    kpi.trend === 'up' ? '#15803d' :
                    kpi.trend === 'down' ? '#b91c1c' : '#475569',
                }}
              >
                {kpi.trend === 'up' ? '▲ 상승' : kpi.trend === 'down' ? '▼ 하락' : '■ 유지'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── 슬라이드 타입 분기 ────────────────────────────────────────────────────
  const renderContent = () => {
    const type = slide.type;

    if (type === 'chart' || type === 'data') return renderChart();
    if (type === 'table') return renderTable();
    if (type === 'kpi') return renderKPI();

    if (type === 'title') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-6">
          <div
            className="w-16 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.4)' }}
          />
          {slide.subhead && (
            <p className="text-3xl font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {slide.subhead}
            </p>
          )}
          {slide.notes && (
            <p className="text-2xl mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {slide.notes}
            </p>
          )}
        </div>
      );
    }

    if (content.length === 0) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-3xl"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0', color: isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1' }}
        >
          <Layers className="w-16 h-16 opacity-30" />
          <p className="text-xl font-medium">슬라이드 내용을 구성 중입니다...</p>
        </div>
      );
    }

    return renderInfographic();
  };

  return (
    <div
      className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}
      style={bgStyle}
    >
      {/* ── 장식 요소 (다크 슬라이드) ── */}
      {isDark && (
        <>
          <div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(200,80%,60%) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(200,80%,60%) 0%, transparent 70%)' }}
          />
        </>
      )}

      {/* ── 워터마크 ── */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-9xl font-black select-none">
          {watermark}
        </div>
      )}

      {/* ── 로고 ── */}
      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
        </div>
      )}

      <div className="p-16 h-full flex flex-col relative z-10">
        {/* ── 슬라이드 번호 배지 ── */}
        {slide.slideNumber && (
          <div
            className="absolute top-8 left-16 text-xs font-mono px-2 py-1 rounded-md"
            style={{
              background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
              color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
            }}
          >
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}

        {/* ── 제목 ── */}
        {slide.type !== 'title' && (
          <div className="mb-10 flex items-start gap-5">
            <div
              className="w-1.5 flex-shrink-0 rounded-full mt-1"
              style={{ background: accentColor, height: '3rem' }}
            />
            <div>
              <h2
                className="text-5xl font-black tracking-tight leading-tight"
                style={{ color: titleColor }}
              >
                {slide.title || '제목 없음'}
              </h2>
              {slide.subhead && (
                <p
                  className="text-2xl mt-2 font-medium"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}
                >
                  {slide.subhead}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── 타이틀 슬라이드 제목 (가운데 정렬) ── */}
        {slide.type === 'title' && (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <h1
              className="text-7xl font-black tracking-tight leading-tight mb-4"
              style={{ color: '#fff' }}
            >
              {slide.title || '제목 없음'}
            </h1>
          </div>
        )}

        {/* ── 본문 콘텐츠 ── */}
        {slide.type !== 'title' && (
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        )}

        {/* ── title 슬라이드 전용 서브 콘텐츠 ── */}
        {slide.type === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* h1은 위에서 렌더링되므로 여기서 subhead/notes만 추가로 표시 */}
          </div>
        )}

        {/* ── 하단 발표자 노트 (슬라이드에서는 표시 안 함) ── */}

        {/* ── 출처 표기 ── */}
        {slide.source && (
          <p
            className="absolute bottom-6 right-16 text-sm"
            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}
          >
            출처: {slide.source}
          </p>
        )}
      </div>
    </div>
  );
};
