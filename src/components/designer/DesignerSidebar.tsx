'use client';

import React from 'react';
import { 
  Type, Image as ImageIcon, Square, Circle, Triangle, 
  Layers, Layout, Palette, Sparkles, Box 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesignerStore } from '@/store/useDesignerStore';
import { fabric } from 'fabric';

export const DesignerSidebar: React.FC = () => {
  const { canvas } = useDesignerStore();

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('텍스트를 입력하세요', {
      left: 100,
      top: 100,
      fontFamily: 'Pretendard',
      fontSize: 24,
      fill: '#333333',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      fill: '#3B82F6',
      width: 100,
      height: 100,
      rx: 8,
      ry: 8
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      fill: '#10B981',
      radius: 50,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  return (
    <div className="w-[300px] border-r border-border bg-white/40 backdrop-blur-xl flex flex-col h-full shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.03)] z-10">
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
            <VisualAddButton 
              icon={<Triangle size={18} />} 
              label="삼각형" 
              onClick={() => {}} 
              color="bg-amber-500" 
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
            <TemplatePreview 
              name="비즈니스 모던" 
              targetColors={['#1e293b', '#3b82f6', '#f8fafc']} 
              description="깔끔하고 정돈된 기업용 디자인"
            />
            <TemplatePreview 
              name="미니멀 파스텔" 
              targetColors={['#fdf2f8', '#fce7f3', '#db2777']} 
              description="밝고 화사한 발표용 디자인"
            />
            <TemplatePreview 
              name="테크 브랜딩" 
              targetColors={['#0f172a', '#0ea5e9', '#38bdf8']} 
              description="강력한 인상의 기술 보고서"
            />
          </div>
        </section>

        {/* Layers (Compact) */}
        <section>
          <Button variant="ghost" className="w-full justify-between h-12 px-4 rounded-xl border border-dashed border-border hover:bg-muted/50 transition-all">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-muted-foreground" />
              <span className="text-sm font-semibold">레이어 관리</span>
            </div>
            <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">0</span>
          </Button>
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

const TemplatePreview = ({ name, targetColors, description }: any) => (
  <div className="group cursor-pointer">
    <div className="aspect-[4/3] rounded-2xl border border-border/60 overflow-hidden bg-muted/20 mb-2 relative group-hover:border-primary/40 group-hover:shadow-premium transition-all duration-300">
      {/* MOCK PREVIEW UI */}
      <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
        <div className="w-2/3 h-3 rounded-sm" style={{ background: targetColors[0] }} />
        <div className="w-full h-1 rounded-full opacity-20" style={{ background: targetColors[1] }} />
        <div className="w-1/2 h-1 rounded-full opacity-20" style={{ background: targetColors[1] }} />
        <div className="mt-auto flex gap-1">
          <div className="w-full h-12 rounded-sm" style={{ background: targetColors[2] }} />
          <div className="w-full h-12 rounded-sm" style={{ background: targetColors[1], opacity: 0.3 }} />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <h4 className="text-[13px] font-bold text-foreground px-1">{name}</h4>
    <p className="text-[10px] text-muted-foreground px-1 line-clamp-1">{description}</p>
  </div>
);
