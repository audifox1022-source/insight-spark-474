'use client';

import React from 'react';
import { FabricCanvas } from './FabricCanvas';
import { DesignerSidebar } from './DesignerSidebar';
import { DesignerToolbar } from './DesignerToolbar';
import { useDesignerStore } from '@/store/useDesignerStore';
import { Button } from '@/components/ui/button';
import { 
  Plus, Download, Layout, Play, Save, ChevronLeft, ChevronRight,
  Sparkles, Wand2
} from 'lucide-react';
import { toast } from 'sonner';

import { exportDesignerToPptx } from '@/lib/export-designer-pptx';

export const DesignerWorkspace: React.FC = () => {
  const { slides, activeSlideId, addSlide, canvas } = useDesignerStore();

  const handleExport = async () => {
    if (!canvas) return;
    
    try {
      toast.info('PPTX 내보내기를 생성 중입니다...');
      await exportDesignerToPptx(canvas);
      toast.success('PPTX 다운로드가 완료되었습니다!');
    } catch (error) {
      console.error('PPTX Export failed:', error);
      toast.error('PPTX 내보내기 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
      {/* Top Banner / Breadcrumb */}
      <div className="px-6 py-2 border-b border-border bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-black text-foreground">AI 프리젠테이션 디자이너</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-tighter">BETA</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Wand2 className="w-3.5 h-3.5" /> AI 스마트 정렬
          </Button>
          <Button onClick={handleExport} size="sm" className="h-8 gap-2 gradient-primary border-0 shadow-glow">
            <Download className="w-3.5 h-3.5" /> PPT 다운로드
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <DesignerSidebar />

        {/* Central Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
          <DesignerToolbar />
          
          <div className="flex-1 overflow-hidden relative">
            <FabricCanvas />
            
            {/* Bottom Slide Nav */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-card/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-elevated">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><ChevronLeft className="w-4 h-4" /></Button>
              <div className="flex items-center gap-1.5 px-3">
                {slides.map((s, idx) => (
                  <button 
                    key={s.id}
                    className={`w-2 h-2 rounded-full transition-all ${s.id === activeSlideId ? 'bg-primary w-4' : 'bg-muted-foreground/30'}`}
                  />
                ))}
              </div>
              <Button onClick={addSlide} variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><Plus className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Floating AI Helper (Optional right sidebar could go here) */}
      </div>
    </div>
  );
};
