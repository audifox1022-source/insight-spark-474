// ============================================================
// src/components/pdf/PDFFloatingToolbar.tsx
// ============================================================
import React from 'react';
import { 
  MousePointer2, Type, Highlighter, Image as ImageIcon, 
  Pencil, Trash2, Layers, Search, Sidebar, Save, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PDFFloatingToolbarProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export const PDFFloatingToolbar: React.FC<PDFFloatingToolbarProps> = ({ activeTool, onToolSelect }) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: '선택 (V)' },
    { id: 'text', icon: Type, label: '텍스트 (T)' },
    { id: 'draw', icon: Highlighter, label: '형광펜 (H)' },
    { id: 'image', icon: ImageIcon, label: '이미지 (I)' },
    { id: 'signature', icon: Pencil, label: '서명 (S)' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl animate-in fade-in zoom-in duration-300 pointer-events-auto select-none">
        
        <div className="flex items-center gap-0.5 px-0.5">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => onToolSelect(tool.id)}
                  className={cn(
                    "h-9 w-9 rounded-xl transition-all duration-200",
                    activeTool === tool.id 
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105" 
                      : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <tool.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1.5" />

        <div className="flex items-center gap-0.5 pr-0.5">
           <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon"
                className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>레이어 관리</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon"
                className="h-9 w-9 rounded-xl hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>전체 삭제</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
