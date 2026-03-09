'use client';

import React from 'react';
import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, 
  Layout, Search, Plus, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fabric } from 'fabric';
import { useDesignerStore } from '@/store/useDesignerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const DesignerSidebar: React.FC = () => {
  const { canvas } = useDesignerStore();

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('여기에 텍스트를 입력하세요', {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: 'Pretendard',
      fill: '#333333',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'red',
      width: 100,
      height: 100,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      fill: 'blue',
      radius: 50,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const addTriangle = () => {
    if (!canvas) return;
    const triangle = new fabric.Triangle({
      left: 100,
      top: 100,
      fill: 'green',
      width: 100,
      height: 100,
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result;
      fabric.Image.fromURL(data as string, (img) => {
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-[300px] h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="이미지, 요소 검색..." className="pl-10 h-9 text-xs" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {/* 디자인 요소 */}
        <section>
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-4">디자인 요소</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={addText} variant="outline" className="h-20 flex flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all">
              <Type className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">텍스트</span>
            </Button>
            <label className="h-20 border border-border rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all bg-background">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              <span className="text-[11px] font-bold">이미지</span>
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
            <Button onClick={addRect} variant="outline" className="h-20 flex flex-col gap-2 rounded-2xl">
              <Square className="w-5 h-5" />
              <span className="text-[11px]">사각형</span>
            </Button>
            <Button onClick={addCircle} variant="outline" className="h-20 flex flex-col gap-2 rounded-2xl">
              <Circle className="w-5 h-5" />
              <span className="text-[11px]">원형</span>
            </Button>
            <Button onClick={addTriangle} variant="outline" className="h-20 flex flex-col gap-2 rounded-2xl">
              <Triangle className="w-5 h-5" />
              <span className="text-[11px]">삼각형</span>
            </Button>
          </div>
        </section>

        {/* 템플릿 프리셋 */}
        <section>
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-4">추천 템플릿</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-video bg-muted/40 rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-all group relative">
                <div className="absolute inset-x-0 bottom-0 p-2 bg-black/40 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-[10px] text-white font-bold">비즈니스 모던 #{i}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <Button variant="outline" className="w-full text-xs font-bold gap-2 rounded-xl">
          <Layers className="w-4 h-4" /> 레이어 관리
        </Button>
      </div>
    </div>
  );
};
