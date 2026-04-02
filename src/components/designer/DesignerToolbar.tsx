'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, 
  ChevronDown, Type, Palette, Trash2, Layers, 
  ArrowUp, ArrowDown, Copy
} from 'lucide-react';
import { useDesignerStore } from '@/store/useDesignerStore';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const GOOGLE_FONTS = [
  'Pretendard', 'Inter', 'Roboto', 'Noto Sans KR', 'Montserrat', 
  'Playfair Display', 'Poppins', 'Lato', 'Open Sans'
];

export const DesignerToolbar: React.FC = () => {
  const { canvas, selectedObjectId } = useDesignerStore();
  const [activeObject, setActiveObject] = useState<any>(null);

  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      setActiveObject(canvas.getActiveObject());
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setActiveObject(null));
    canvas.on('object:modified', handleSelection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
      canvas.off('object:modified');
    };
  }, [canvas]);

  const updateStyle = (prop: string, value: any) => {
    if (!canvas || !activeObject) return;
    activeObject.set(prop, value);
    canvas.requestRenderAll();
    setActiveObject({ ...activeObject, [prop]: value }); // Trigger re-render of toolbar
  };

  const deleteObject = () => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const bringToFront = () => {
    if (!canvas || !activeObject) return;
    activeObject.bringToFront();
    canvas.requestRenderAll();
  };

  const sendToBack = () => {
    if (!canvas || !activeObject) return;
    activeObject.sendToBack();
    canvas.requestRenderAll();
  };

  if (!activeObject) return (
    <div className="h-14 border-b border-border bg-card flex items-center px-6 text-sm text-muted-foreground italic">
      편집할 요소를 선택하세요.
    </div>
  );

  const isText = activeObject.type === 'i-text' || activeObject.type === 'text';

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {isText && (
          <>
            <Select 
              value={activeObject.fontFamily} 
              onValueChange={(v) => updateStyle('fontFamily', v)}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs font-bold border-muted">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_FONTS.map(f => (
                  <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/40 rounded-lg border border-border/50">
              <input 
                type="number" 
                value={Math.round(activeObject.fontSize)}
                onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                className="w-10 bg-transparent text-xs font-bold focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground font-mono">PT</span>
            </div>

            <div className="h-6 w-px bg-border mx-1" />

            <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/60">
              <Button 
                variant="ghost" size="icon" 
                className={`w-7 h-7 rounded-lg ${activeObject.fontWeight === 'bold' ? 'bg-background text-primary shadow-sm' : ''}`}
                onClick={() => updateStyle('fontWeight', activeObject.fontWeight === 'bold' ? 'normal' : 'bold')}
              >
                <Bold className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" size="icon" 
                className={`w-7 h-7 rounded-lg ${activeObject.fontStyle === 'italic' ? 'bg-background text-primary shadow-sm' : ''}`}
                onClick={() => updateStyle('fontStyle', activeObject.fontStyle === 'italic' ? 'normal' : 'italic')}
              >
                <Italic className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3 rounded-xl border-muted">
              <div 
                className="w-4 h-4 rounded-full border border-black/10" 
                style={{ backgroundColor: activeObject.fill as string }} 
              />
              <span className="text-[11px] font-bold">색상</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-3">
            <div className="grid grid-cols-4 gap-2">
              {['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                <button 
                  key={c} 
                  className="w-6 h-6 rounded-md border border-black/10" 
                  style={{ backgroundColor: c }}
                  onClick={() => updateStyle('fill', c)}
                />
              ))}
            </div>
            <input 
              type="text" 
              defaultValue={activeObject.fill as string}
              className="mt-3 w-full h-8 px-2 border border-border rounded text-[10px] font-mono"
              onBlur={(e) => updateStyle('fill', e.target.value)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={bringToFront} title="맨 앞으로">
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={sendToBack} title="맨 뒤로">
          <ArrowDown className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button 
          variant="ghost" size="icon" 
          className="text-destructive hover:bg-destructive/10"
          onClick={deleteObject}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
