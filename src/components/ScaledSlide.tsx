import React from 'react';
import { ArrowRight, Layers, BarChart3, Table as TableIcon, Target } from 'lucide-react';

// 슬라이드 데이터 타입 정의 (안전한 렌더링을 위해)
interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: string[];
  infographicType?: string;
  chartData?: {
    type?: string;
    labels?: string[];
    datasets?: { label: string; data: number[] }[];
  };
  tableData?: {
    headers?: string[];
    rows?: string[][];
  };
  keyMetrics?: { label: string; value: string; trend?: string }[];
  slideNumber?: number;
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({ slide, containerClassName = '', logoUrl, watermark }) => {
  // 🛡️ 1단계 방어: 본문 내용이 배열이 아니면 강제로 빈 배열 반환
  const rawContent = slide.content || slide.points || slide.items;
  const content = Array.isArray(rawContent) ? rawContent : [];

  // 🎨 인포그래픽 렌더링
  const renderInfographic = () => {
    switch (slide.infographicType) {
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full gap-4">
            {content.map((item, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center p-4 text-center text-sm font-bold bg-white shadow-lg z-10">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                {i < content.length - 1 && <ArrowRight className="absolute -right-8 top-1/2 -translate-y-1/2 text-primary w-8 h-8 z-0" />}
              </div>
            ))}
          </div>
        );
      case 'process':
        return (
          <div className="space-y-4">
            {content.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium">
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
              <li key={i} className="flex items-start gap-4 text-2xl leading-snug text-gray-800">
                <span className="mt-2.5 w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  // 📊 2단계 방어: 차트 데이터 렌더링 (라이브러리 크래시 방지)
  const renderChart = () => {
    const { chartData } = slide;
    // 데이터가 완벽하지 않으면 에러 대신 안내 문구 표시
    if (!chartData || !Array.isArray(chartData.labels) || !Array.isArray(chartData.datasets)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
          <p>차트 데이터를 분석 중입니다...</p>
        </div>
      );
    }

    // CSS를 활용한 안전한 기본 막대 차트 (외부 라이브러리 의존성 없음)
    return (
      <div className="h-full flex flex-col justify-end gap-6 pt-10">
        <div className="flex justify-center gap-4 mb-4">
          {chartData.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <span className="w-3 h-3 rounded-full bg-primary inline-block" style={{ opacity: 1 - i * 0.4 }} />
              {ds.label}
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-end justify-around border-b-2 border-gray-300 pb-2">
          {chartData.labels.map((label, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-full flex justify-center items-end h-48 gap-1">
                {chartData.datasets?.map((ds, dsIdx) => {
                  const value = ds.data[idx] || 0;
                  const maxVal = Math.max(...ds.data, 1); // 0으로 나누기 방지
                  const height = `${(value / maxVal) * 100}%`;
                  return (
                    <div 
                      key={dsIdx} 
                      className="w-12 bg-primary rounded-t-md transition-all duration-500 flex items-start justify-center pt-2 text-xs font-bold text-white/90 overflow-hidden"
                      style={{ height, opacity: 1 - dsIdx * 0.4 }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 📋 3단계 방어: 테이블 데이터 렌더링
  const renderTable = () => {
    const { tableData } = slide;
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <TableIcon className="w-12 h-12 mb-3 opacity-20" />
          <p>표 데이터를 구성 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left text-lg">
          <thead className="bg-primary text-white">
            <tr>
              {tableData.headers.map((header, i) => (
                <th key={i} className="px-6 py-4 font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tableData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
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

  // 🎯 4단계 방어: KPI 지표 렌더링
  const renderKPI = () => {
    const { keyMetrics } = slide;
    if (!keyMetrics || !Array.isArray(keyMetrics)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <Target className="w-12 h-12 mb-3 opacity-20" />
          <p>핵심 지표를 도출 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full content-center">
        {keyMetrics.map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-gray-500 mb-4">{kpi.label}</h3>
            <p className="text-5xl font-black text-primary mb-2">{kpi.value}</p>
            {kpi.trend && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                kpi.trend === 'up' ? 'bg-green-100 text-green-700' : 
                kpi.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {kpi.trend === 'up' ? '▲ 상승' : kpi.trend === 'down' ? '▼ 하락' : '■ 유지'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 슬라이드 타입에 따른 메인 렌더러 분기
  const renderContent = () => {
    switch (slide.type) {
      case 'chart': return renderChart();
      case 'table': return renderTable();
      case 'kpi': return renderKPI();
      default:
        // 일반 content 슬라이드인데 내용마저 없으면 방어
        if (content.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
              <Layers className="w-16 h-16 opacity-20" />
              <p className="text-xl font-medium">슬라이드 내용을 구성 중입니다...</p>
            </div>
          );
        }
        return renderInfographic();
    }
  };

  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
      {/* 워터마크 */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-9xl font-black select-none">
          {watermark}
        </div>
      )}

      {/* 로고 */}
      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div className="p-16 h-full flex flex-col">
        {/* 제목 */}
        <h2 className="text-5xl font-black mb-12 text-gray-900 tracking-tight border-l-[12px] border-primary pl-6">
          {slide.title || "제목 없음"}
        </h2>

        {/* 본문 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>

        {/* 하단 페이지 번호 */}
        {slide.slideNumber && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm font-mono text-gray-400">
            {slide.slideNumber}
          </div>
        )}
      </div>
    </div>
  );
};
