import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { Slide } from '@/types/presentation';
import { TrendingUp, TrendingDown, Minus, ArrowRightCircle, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

const typeThemes: Record<string, { bg: string; accent: string; badge: string; }> = {
  title: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100', accent: '#2563eb', badge: 'INTRO' },
  section: { bg: 'bg-gradient-to-br from-indigo-50 to-slate-100', accent: '#4f46e5', badge: 'CHAPTER' },
  agenda: { bg: 'bg-gradient-to-br from-slate-50 to-white', accent: '#3b82f6', badge: 'INDEX' },
  data: { bg: 'bg-gradient-to-br from-white to-slate-50', accent: '#7c3aed', badge: 'DATA' },
  chart: { bg: 'bg-gradient-to-br from-slate-50 to-white', accent: '#0d9488', badge: 'CHART' },
  action: { bg: 'bg-gradient-to-br from-orange-50 to-white', accent: '#ea580c', badge: 'ACTION' },
  summary: { bg: 'bg-gradient-to-br from-blue-50 to-white', accent: '#0284c7', badge: 'SUMMARY' },
  closing: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100', accent: '#0ea5e9', badge: 'FINISH' },
};

export function ScaledSlide({ slide, containerClassName = '', logoUrl, watermark }: { slide: Slide; containerClassName?: string; logoUrl?: string; watermark?: string; }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setScale(Math.min(entry.contentRect.width / SLIDE_W, entry.contentRect.height / SLIDE_H));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const theme = typeThemes[slide.type] || typeThemes.data;
  const tScale = slide.titleSizeScale ?? 1.0;
  const cScale = slide.contentSizeScale ?? 1.0;

  // ✨ [React Error #31 방어] 데이터를 안전하게 문자열로 변환하는 함수
  const safeString = (val: any): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // {type, content} 형태인 경우 content를 우선 추출, 아니면 JSON 직렬화
      return val.content || val.text || val.title || JSON.stringify(val);
    }
    return String(val);
  };

  const headers = (slide.headers || slide.tableData?.headers || []).map(safeString);
  const rows = (slide.rows || slide.tableData?.rows || []).map(row => (Array.isArray(row) ? row.map(safeString) : []));
  const stats = slide.stats || slide.chartData?.stats || [];
  const items = (slide.items || []).map(it => (typeof it === 'object' ? { ...it, title: safeString(it.title || it) } : safeString(it)));
  const content = (slide.content || slide.points || []).map(safeString);

  const renderHighlightedText = (text: string, baseSize: number, appliedScale: number, isBold: boolean = false) => {
    const str = safeString(text);
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return (
      <span style={{ fontSize: `${baseSize * appliedScale}px` }} className={`${isBold ? 'font-bold' : 'font-medium'} break-words whitespace-pre-wrap leading-[1.6]`}>
        {parts.map((p, i) => p.startsWith('**') ? <span key={i} style={{ color: theme.accent }} className="font-extrabold">{p.slice(2, -2)}</span> : <span key={i}>{p}</span>)}
      </span>
    );
  };

  const renderHeader = () => (
    <div className="px-[140px] pt-[80px] pb-[28px] relative z-[3] flex-shrink-0">
      <div className="flex items-center gap-[16px] mb-[24px]">
        <span className="font-bold uppercase font-mono px-[20px] py-[8px] rounded-full bg-white border border-slate-200 shadow-sm" style={{ color: theme.accent, fontSize: `${18 * cScale}px` }}>{theme.badge || slide.type}</span>
        <div className="w-[3px] h-[24px] bg-slate-300" />
        <span className="font-mono text-slate-400 font-bold" style={{ fontSize: `${20 * cScale}px` }}>{String(slide.slideNumber).padStart(2, '0')}</span>
      </div>
      <h1 className="font-black leading-[1.2] max-w-[1500px] break-words whitespace-pre-wrap text-slate-900" style={{ fontSize: `${64 * tScale}px` }}>
        {renderHighlightedText(slide.title, 64, tScale, true)}
      </h1>
      <div className="h-[3px] rounded-full mt-[32px] w-[200px]" style={{ background: theme.accent }} />
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${containerClassName}`} style={{ aspectRatio: '16/9' }}>
      <div className="absolute" style={{ width: SLIDE_W, height: SLIDE_H, left: '50%', top: '50%', marginLeft: -SLIDE_W / 2, marginTop: -SLIDE_H / 2, transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <div className={`w-full h-full ${theme.bg} text-slate-900 flex flex-col relative overflow-hidden`}>
          {logoUrl && <img src={logoUrl} className="absolute top-[50px] right-[60px] h-[70px] z-[50]" />}
          <div className="absolute left-0 top-0 bottom-0 w-[8px] z-[2]" style={{ background: theme.accent }} />

          {slide.type === 'title' ? (
            <div className="flex-1 flex flex-col justify-center items-start px-[180px]">
              <h1 className="font-black leading-[1.15] max-w-[1400px] text-slate-900" style={{ fontSize: `${96 * tScale}px` }}>{renderHighlightedText(slide.title, 96, tScale, true)}</h1>
            </div>
          ) : (headers.length > 0) ? (
            <div className="flex-1 flex flex-col">
              {renderHeader()}
              <div className="flex-1 px-[140px] py-[40px] overflow-hidden">
                <table className="w-full text-left border-collapse bg-white rounded-[24px] shadow-xl overflow-hidden">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>{headers.map((h, i) => <th key={i} className="p-[24px] font-black text-slate-800" style={{ fontSize: `${24 * cScale}px` }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {row.map((cell, j) => <td key={j} className="p-[24px] font-medium text-slate-600" style={{ fontSize: `${22 * cScale}px` }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {renderHeader()}
              <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center">
                {(content.length > 0 || items.length > 0) && (
                  <ul className="space-y-[24px]">
                    {(content.length > 0 ? content : items).map((it: any, i) => (
                      <li key={i} className="bg-white p-[32px] rounded-[24px] shadow-sm flex items-center gap-6">
                        <span className="font-black text-slate-200" style={{ fontSize: `${40 * cScale}px` }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-bold text-slate-700" style={{ fontSize: `${32 * cScale}px` }}>{renderHighlightedText(typeof it === 'object' ? it.title : it, 32, cScale)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
