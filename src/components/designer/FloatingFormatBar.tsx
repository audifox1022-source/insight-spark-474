import React from 'react';
import { useSlideStore, SlideElement } from '@/store/useSlideStore';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Minus, Plus, Type, Palette, ChevronDown,
  Trash2, Copy, MoveUp, MoveDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const FloatingFormatBar: React.FC = () => {
  const { 
    presentation, 
    currentSlideIndex, 
    selectedElementId, 
    updateElement,
    deleteElement,
    duplicateElement,
    bringToFront,
    sendToBack
  } = useSlideStore();

  if (!selectedElementId) return null;

  const currentSlide = presentation?.slides?.[currentSlideIndex];
  const activeElement = currentSlide?.elements?.find((el: any) => el.id === selectedElementId) as SlideElement | undefined;

  if (!activeElement || !currentSlide) return null;

  const handleUpdate = (updates: Partial<SlideElement>) => {
    updateElement(currentSlide.id, selectedElementId, updates);
  };

  const fonts = [
    { name: 'Pretendard', value: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
  ];

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Slate', value: '#475569' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'White', value: '#ffffff' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 p-1.5 bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl animate-in fade-in zoom-in duration-300 pointer-events-auto select-none">
        
        {/* Layering Controls */}
        <div className="flex items-center gap-0.5 px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg" onClick={() => bringToFront(currentSlide.id, selectedElementId)}>
                <MoveUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>맨 앞으로 가져오기 (])</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg" onClick={() => sendToBack(currentSlide.id, selectedElementId)}>
                <MoveDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>맨 뒤로 보내기 ([)</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-[11px] font-black hover:bg-slate-100 rounded-lg">
              <Type className="w-3.5 h-3.5" />
              <span className="max-w-[70px] truncate">
                {fonts.find(f => f.value === activeElement.fontFamily)?.name || 'Pretendard'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-white/90 backdrop-blur-xl border-slate-200 rounded-xl p-1 shadow-2xl">
            {fonts.map((f) => (
              <DropdownMenuItem 
                key={f.name} 
                onClick={() => handleUpdate({ fontFamily: f.value })}
                className={cn("text-xs font-bold p-2.5 rounded-lg cursor-pointer", activeElement.fontFamily === f.value && "bg-indigo-50 text-indigo-600")}
                style={{ fontFamily: f.value }}
              >
                {f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Font Size */}
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg"
            onClick={() => handleUpdate({ fontSize: Math.max(8, (activeElement.fontSize || 40) - 2) })}
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <div className="min-w-[32px] text-center text-[11px] font-black tabular-nums">
            {activeElement.fontSize || 40}
          </div>
          <Button 
            variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg"
            onClick={() => handleUpdate({ fontSize: Math.min(300, (activeElement.fontSize || 40) + 2) })}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Style Toggles */}
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" size="icon" 
            onClick={() => handleUpdate({ fontWeight: activeElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
            className={cn("h-8 w-8 hover:bg-slate-100 rounded-lg", activeElement.fontWeight === 'bold' && "bg-indigo-50 text-indigo-600")}
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" size="icon"
            onClick={() => handleUpdate({ fontStyle: activeElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
            className={cn("h-8 w-8 hover:bg-slate-100 rounded-lg", activeElement.fontStyle === 'italic' && "bg-indigo-50 text-indigo-600")}
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Alignments */}
        <div className="flex items-center gap-0.5">
          {[
            { id: 'left', icon: AlignLeft },
            { id: 'center', icon: AlignCenter },
            { id: 'right', icon: AlignRight },
            { id: 'justify', icon: AlignJustify }
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" size="icon"
              onClick={() => handleUpdate({ textAlign: item.id as any })}
              className={cn("h-8 w-8 hover:bg-slate-100 rounded-lg", activeElement.textAlign === item.id && "bg-indigo-50 text-indigo-600")}
            >
              <item.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg">
              <Palette className="w-3.5 h-3.5" style={{ color: activeElement.color || activeElement.fill }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-2.5 grid grid-cols-3 gap-2 bg-white/90 backdrop-blur-xl border-slate-200 rounded-xl shadow-2xl">
            {colors.map((c) => (
              <button
                key={c.name}
                onClick={() => handleUpdate({ fill: c.value, color: c.value })}
                className={cn(
                  "w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform active:scale-90",
                  (activeElement.fill === c.value || activeElement.color === c.value) && "ring-2 ring-indigo-500 ring-offset-2"
                )}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Actions (Duplicate/Delete) */}
        <div className="flex items-center gap-0.5 pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon" 
                onClick={() => duplicateElement(currentSlide.id, selectedElementId)}
                className="h-8 w-8 hover:bg-indigo-50 text-indigo-600 rounded-lg"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>복제 (Ctrl+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon" 
                onClick={() => deleteElement(currentSlide.id, selectedElementId)}
                className="h-8 w-8 hover:bg-rose-50 text-rose-600 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>삭제 (Del)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
