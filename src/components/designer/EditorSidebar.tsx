'use client';

import React from 'react';
import { 
  Type, Square, Circle, Minus, ArrowRight, Star, Box, Layout 
} from 'lucide-react';
import { useSlideStore } from '@/store/useSlideStore';

export const EditorSidebar: React.FC = () => {
  const { presentation, currentSlideIndex, addElement: storeAddElement, setPresentation } = useSlideStore();

  const addElement = (element: any) => {
    const slideId = presentation?.slides?.[currentSlideIndex]?.id;
    if (slideId) {
      storeAddElement(slideId, element);
    }
  };

  const applyTemplate = (colors: string[]) => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    const currentSlide = newSlides[currentSlideIndex];
    if (currentSlide) {
      currentSlide.background = colors[0];
      currentSlide.elements = (currentSlide.elements || []).map((el: any) => {
        if (el.type === 'text') return { ...el, color: colors[2] };
        if (el.fill) return { ...el, fill: colors[1] };
        return el;
      });
      setPresentation({ ...presentation, slides: newSlides });
    }
  };

  // 모든 6가지 요소 타입 생성 로직 (Bug 2 Fix)
  const addText = () => addElement({ type: 'text', left: 400, top: 300, fontSize: 80, fill: '#333333', text: '새 텍스트 내용을 입력하세요' });
  const addRect = () => addElement({ type: 'rect', left: 400, top: 300, width: 400, height: 250, fill: '#3B82F6', text: '텍스트 입력' });
  const addCircle = () => addElement({ type: 'circle', left: 400, top: 300, fill: '#10B981', radius: 100 });
  const addLine = () => addElement({ type: 'line', left: 400, top: 300, width: 500, stroke: '#333333', strokeWidth: 8 });
  const addArrow = () => addElement({ type: 'arrow', left: 400, top: 300, width: 500, stroke: '#FF6B6B', strokeWidth: 8 }); 
  const addStar = () => addElement({ type: 'star', left: 400, top: 300, width: 200, height: 200, fill: '#FFD93D' });

  return (
    <div className="w-[280px] border-r border-border bg-card flex flex-col h-full shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)] z-10 transition-all">
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
        
        {/* Elements Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">디자인 요소</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <VisualAddButton icon={<Type size={18} />} label="텍스트" onClick={addText} color="bg-blue-500" />
            <VisualAddButton icon={<Square size={18} />} label="사각형" onClick={addRect} color="bg-indigo-500" />
            <VisualAddButton icon={<Circle size={18} />} label="원형" onClick={addCircle} color="bg-emerald-500" />
            <VisualAddButton icon={<Minus size={18} />} label="선" onClick={addLine} color="bg-slate-500" />
            <VisualAddButton 
              icon={<ArrowRight size={18} />} 
              label="화살표" 
              onClick={addArrow} 
              color="bg-orange-500" 
            />
            <VisualAddButton 
              icon={<Star size={18} />} 
              label="스타" 
              onClick={addStar} 
              color="bg-yellow-500" 
            />
          </div>
        </section>

        {/* Templates Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Layout className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">추천 템플릿</h3>
          </div>
          <div className="space-y-4">
            {/* Phase 7: Using pure Solid HEX codes to prevent html2canvas gradient bugs */}
            <TemplatePreview 
              name="비즈니스 모던" 
              targetColors={['#1e293b', '#3b82f6', '#f8fafc']} 
              description="깔끔하고 정돈된 기업용 디자인"
              onClick={() => applyTemplate(['#1e293b', '#3b82f6', '#f8fafc'])}
            />
            <TemplatePreview 
              name="미니멀 파스텔" 
              targetColors={['#27272a', '#db2777', '#fdf2f8']} 
              description="밝고 화사한 발표용 디자인"
              onClick={() => applyTemplate(['#27272a', '#db2777', '#fdf2f8'])}
            />
            <TemplatePreview 
              name="테크 브랜딩" 
              targetColors={['#f8fafc', '#0ea5e9', '#0f172a']} 
              description="강력한 인상의 기술 보고서"
              onClick={() => applyTemplate(['#f8fafc', '#0ea5e9', '#0f172a'])}
            />
            <TemplatePreview 
              name="스타트업 바이브" 
              targetColors={['#ffffff', '#6366f1', '#f5f3ff']} 
              description="젊고 혁신적인 디자인"
              onClick={() => applyTemplate(['#ffffff', '#6366f1', '#f5f3ff'])}
            />
            <TemplatePreview 
              name="다크 엘레강스" 
              targetColors={['#c5a059', '#333333', '#111111']} 
              description="고급스러운 블랙 & 골드 테마"
              onClick={() => applyTemplate(['#c5a059', '#333333', '#111111'])}
            />
            <TemplatePreview 
              name="에코 프렌들리" 
              targetColors={['#f0fdf4', '#10b981', '#064e3b']} 
              description="자연과 환경을 위한 그린 테마"
              onClick={() => applyTemplate(['#f0fdf4', '#10b981', '#064e3b'])}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const VisualAddButton = ({ icon, label, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-border/60 bg-white hover:border-primary/40 hover:shadow-premium transition-all duration-300 transform hover:-translate-y-1"
  >
    <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-sm group-hover:shadow-glow-sm transition-all`}>
      {icon}
    </div>
    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
  </button>
);

const TemplatePreview = ({ name, targetColors, description, onClick }: any) => (
  <div className="group cursor-pointer" onClick={onClick}>
    <div className="aspect-[4/3] rounded-2xl border border-border/60 overflow-hidden bg-muted/20 mb-2 relative group-hover:border-primary/40 group-hover:shadow-premium transition-all duration-300">
      <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
        {/* ── [Safe Array Access with Fallbacks] ── */}
        <div className="w-2/3 h-3 rounded-sm" style={{ background: (targetColors || [])[0] || "#ccc" }} />
        <div className="w-full h-1 rounded-full opacity-20" style={{ background: (targetColors || [])[1] || "#888" }} />
        <div className="w-1/2 h-1 rounded-full opacity-20" style={{ background: (targetColors || [])[1] || "#888" }} />
        <div className="mt-auto flex gap-1">
          <div className="w-full h-12 rounded-sm" style={{ background: (targetColors || [])[2] || "#eee" }} />
          <div className="w-full h-12 rounded-sm" style={{ background: (targetColors || [])[1] || "#888", opacity: 0.3 }} />
        </div>
      </div>
      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <h4 className="text-[13px] font-bold text-foreground px-1">{name}</h4>
    <p className="text-[10px] text-muted-foreground px-1 line-clamp-1">{description}</p>
  </div>
);
