// ============================================================
// src/components/designer/SlideLayoutRenderer.tsx
// [CRITICAL UPGRADE] Dynamic Aspect Ratio (16:9 / 4:3) Layout Shield
// [Phase 45] Strict Overflow Defense (line-clamp-4, break-words)
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Target, Lightbulb, PieChart, TrendingUp, 
  Clock, ArrowRight, CheckCircle2, AlertCircle,
  LayoutGrid, Layers, Columns, Quote
} from 'lucide-react';
import { useSlideStore } from '@/store/useSlideStore';

interface SlideLayoutRendererProps {
  slide: any;
  slideIndex: number;
  thumbnailMode?: boolean;
}

/** 
 * [Utility] 글자 수에 따른 동적 폰트 크기 계산 (비율 대응)
 */
const getDynamicFontSize = (text: string, baseSize: number, minSize: number, ratio: '16:9' | '4:3' = '16:9') => {
  const length = text?.length || 0;
  const multiplier = ratio === '4:3' ? 0.9 : 1.0; // 4:3에서는 공간이 좁으므로 기본적으로 더 작게 시작
  if (length > 100) return Math.max(minSize, baseSize * 0.7 * multiplier);
  if (length > 50) return Math.max(minSize, baseSize * 0.85 * multiplier);
  return baseSize * multiplier;
};

export const SlideLayoutRenderer: React.FC<SlideLayoutRendererProps> = ({ slide, slideIndex, thumbnailMode = false }) => {
  const { aspectRatio, updateSlideTitle, updateSlideSubtitle, updateContentItem } = useSlideStore();
  const { layout = 'default', title, subtitle, content = [], theme = {}, style = {} } = slide;

  // 공통 클래스: [CRITICAL] 4:3 비율에서도 레이아웃이 깨지지 않도록 강제 제약 조건 설정
  const containerClass = `w-full h-full relative overflow-hidden flex flex-col p-12 select-none pointer-events-auto ${aspectRatio === '4:3' ? 'p-10' : 'p-12'}`;
  const titleClass = `font-black tracking-tighter leading-[1.1] mb-2 break-keep line-clamp-2 text-ellipsis`;
  const descClass = `font-medium opacity-80 leading-relaxed break-keep line-clamp-4 text-ellipsis`;
  
  // 텍스트 수정을 위한 컨텐츠 에디팅 핸들러 (Atomic Update)
  const handleContentEdit = (idx: number, field: string, value: string) => {
    if (thumbnailMode) return;
    updateContentItem(slideIndex, idx, field, value);
  };

  const renderLayout = () => {
    switch (layout) {
      case 'cover':
        return (
          <div className={`${containerClass} items-center justify-center text-center bg-gradient-to-br from-primary/5 to-primary/10`}>
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6 max-w-4xl">
                <h2 
                  contentEditable={!thumbnailMode}
                  onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)}
                  suppressContentEditableWarning
                  className={`${titleClass} text-7xl text-primary font-black uppercase`}
                  style={{ fontSize: getDynamicFontSize(title, 72, 48, aspectRatio) }}
                >
                  {title}
                </h2>
                <div className="w-24 h-2 bg-primary mx-auto rounded-full" />
                <p 
                  contentEditable={!thumbnailMode}
                  onBlur={(e) => updateSlideSubtitle(slideIndex, e.target.innerText)}
                  suppressContentEditableWarning
                  className={`${descClass} text-2xl text-slate-500 font-bold`}
                >
                  {subtitle || 'PRESENTATION STRATEGY'}
                </p>
             </motion.div>
          </div>
        );

      case 'timeline':
        return (
          <div className={containerClass}>
            <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-5xl mb-12`}>{title}</h2>
            <div className="flex-1 flex items-center justify-between gap-6 relative px-4">
               <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
               {(Array.isArray(content) ? content : []).slice(0, 4).map((item: any, idx: number) => (
                 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative z-10 flex flex-col gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20 shrink-0">
                       {idx + 1}
                    </div>
                    <div className="space-y-2 overflow-hidden">
                       <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="font-black text-xl text-slate-800 truncate">{item.heading}</h3>
                       <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">{item.description}</p>
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className={containerClass}>
             <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-5xl text-center mb-12`}>{title}</h2>
             <div className="flex-1 grid grid-cols-2 gap-12 items-stretch pb-10">
                {(Array.isArray(content) ? content : []).slice(0, 2).map((item: any, idx: number) => (
                   <div key={idx} className={`rounded-[40px] p-10 flex flex-col gap-8 transition-all border-4 ${idx === 0 ? 'bg-slate-50 border-slate-200' : 'bg-primary/5 border-primary/20 shadow-2xl shadow-primary/10'}`}>
                      <div className="flex items-center justify-between">
                         <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-3xl font-black tracking-tighter">{item.heading}</h3>
                         {idx === 0 ? <AlertCircle className="w-8 h-8 text-slate-400" /> : <CheckCircle2 className="w-8 h-8 text-primary" />}
                      </div>
                      <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-lg font-medium text-slate-600 leading-relaxed overflow-hidden line-clamp-5">{item.description}</p>
                      <div className="mt-auto pt-6 border-t border-slate-200/50">
                         <div className="flex items-center gap-2 text-primary font-black text-sm">
                            <Target className="w-4 h-4" /> Case Study Analysis
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        );

      case 'matrix':
        return (
          <div className={containerClass}>
             <div className="flex items-center justify-between mb-8">
                <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-4xl`}>{title}</h2>
                <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">Strategic Matrix</div>
             </div>
             <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
                {(Array.isArray(content) ? content : []).slice(0, 4).map((item: any, idx: number) => (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} key={idx} className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col gap-3 hover:border-primary/30 transition-all shadow-sm group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-xs font-black group-hover:bg-primary group-hover:text-white transition-colors">{idx + 1}</div>
                         <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="font-black text-sm uppercase tracking-tight text-slate-800">{item.heading}</h3>
                      </div>
                      <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-3 break-words">{item.description}</p>
                   </motion.div>
                ))}
             </div>
          </div>
        );

      case 'grid':
        return (
          <div className={containerClass}>
            <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-5xl mb-12`}>{title}</h2>
            <div className={`grid gap-6 h-full pb-10 ${content.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
               {(Array.isArray(content) ? content : []).map((item: any, idx: number) => (
                 <div key={idx} className="bg-slate-50 border border-slate-200 rounded-[32px] p-8 flex flex-col gap-4 group hover:bg-white hover:shadow-2xl hover:border-primary/20 transition-all min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                       {idx + 1}
                    </div>
                    <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-xl font-black text-slate-800 truncate">{item.heading}</h3>
                    <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 break-words">{item.description}</p>
                 </div>
               ))}
            </div>
          </div>
        );

      case 'split':
        return (
          <div className={`${containerClass} flex-row p-0`}>
            <div className="flex-1 bg-slate-900 p-16 flex flex-col justify-center text-white gap-8 overflow-hidden min-h-0">
               <motion.h2 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-6xl break-words`}>{title}</motion.h2>
               <div className="w-12 h-1 bg-primary rounded-full shrink-0" />
               <p onBlur={(e) => updateSlideSubtitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${descClass} text-xl text-slate-400 font-bold line-clamp-4 overflow-hidden`}>{subtitle}</p>
            </div>
            <div className="flex-1 bg-white p-16 flex flex-col justify-center gap-12 overflow-hidden min-h-0">
               {(Array.isArray(content) ? content : []).map((item: any, idx: number) => (
                 <div key={idx} className="flex gap-6 min-w-0">
                    <div className="mt-1 shrink-0"><CheckCircle2 className="w-6 h-6 text-primary" /></div>
                    <div className="space-y-2 overflow-hidden">
                       <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-2xl font-black text-slate-800 break-words line-clamp-2">{item.heading}</h3>
                       <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 break-words">{item.description}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className={`${containerClass} items-center justify-center bg-slate-50`}>
             <div className="max-w-4xl text-center space-y-12 relative p-16 bg-white rounded-[60px] shadow-2xl border border-slate-100 overflow-hidden min-h-0">
                <Quote className="absolute top-8 left-8 w-20 h-20 text-primary/10 -rotate-12" />
                <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-5xl font-black tracking-tight leading-tight text-slate-900 break-words line-clamp-3" style={{ fontSize: getDynamicFontSize(title, 48, 32, aspectRatio) }}>
                  "{title}"
                </h2>
                <div className="flex flex-col items-center gap-3">
                   <div className="w-12 h-1 bg-primary/30 rounded-full" />
                   <p onBlur={(e) => updateSlideSubtitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-xl font-bold text-primary italic truncate max-w-full px-4">{subtitle}</p>
                </div>
             </div>
          </div>
        );

      default:
        return (
          <div className={containerClass}>
            <div className="flex flex-col gap-2 mb-12">
               <h2 onBlur={(e) => updateSlideTitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className={`${titleClass} text-5xl`}>{title}</h2>
               <p onBlur={(e) => updateSlideSubtitle(slideIndex, e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-xl font-bold text-primary tracking-tight truncate">{subtitle}</p>
            </div>
            <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar min-h-0">
               {(Array.isArray(content) ? content : []).map((item: any, idx: number) => (
                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex gap-8 group min-w-0">
                    <div className="w-12 h-12 rounded-[18px] bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                       <TrendingUp className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-2 overflow-hidden flex-1">
                       <h3 onBlur={(e) => handleContentEdit(idx, 'heading', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-2xl font-black text-slate-800 line-clamp-2 break-words leading-tight">{item.heading}</h3>
                       <p onBlur={(e) => handleContentEdit(idx, 'description', e.target.innerText)} contentEditable={!thumbnailMode} suppressContentEditableWarning className="text-base text-slate-500 font-medium leading-relaxed line-clamp-4 break-words">{item.description}</p>
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full relative font-sans overflow-hidden bg-white text-slate-900 border-none rounded-none outline-none shadow-none ring-0">
      {renderLayout()}
      {!thumbnailMode && (
        <div className="absolute bottom-10 right-10 flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity pointer-events-none">
           <div className="h-0.5 w-12 bg-slate-300 rounded-full" />
           <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Work AI Enterprise • {aspectRatio}</span>
        </div>
      )}
    </div>
  );
};
