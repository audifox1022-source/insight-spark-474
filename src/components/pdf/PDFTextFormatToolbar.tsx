// ============================================================
// src/components/pdf/PDFTextFormatToolbar.tsx
// [Enterprise] Text Formatting & Styling Toolbar (v1.0)
// ============================================================
import React from 'react';
import { 
  Type, Plus, Minus, Palette, ChevronDown, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PDFTextFormatToolbarProps {
  fontSize: number;
  fontFamily: string;
  color: string;
  onChangeFontSize: (size: number) => void;
  onChangeFontFamily: (font: string) => void;
  onChangeColor: (color: string) => void;
  className?: string;
}

const FONTS = [
  { id: 'Noto Sans KR', label: '노토산스 (고딕)' },
  { id: 'Batang', label: '바탕체 (명조)' },
  { id: 'Gulim', label: '굴림체' },
  { id: 'Dotum', label: '돋움체' },
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
  '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
];

export const PDFTextFormatToolbar: React.FC<PDFTextFormatToolbarProps> = ({
  fontSize,
  fontFamily,
  color,
  onChangeFontSize,
  onChangeFontFamily,
  onChangeColor,
  className
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 p-2 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.12)] rounded-2xl pointer-events-auto",
        className
      )}
    >
      {/* Font Family Selector */}
      <div className="flex items-center gap-1.5 px-1 border-r border-slate-100">
        <Select value={fontFamily} onValueChange={onChangeFontFamily}>
          <SelectTrigger className="w-[140px] h-8 border-none bg-slate-50 rounded-lg text-xs font-bold focus:ring-0">
            <SelectValue placeholder="폰트 선택" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200">
            {FONTS.map(f => (
              <SelectItem key={f.id} value={f.id} className="text-xs font-bold py-2 rounded-lg cursor-pointer">
                <span style={{ fontFamily: f.id === 'Noto Sans KR' ? 'inherit' : f.id }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size Controls */}
      <div className="flex items-center gap-1 px-1 border-r border-slate-100">
        <Button 
          variant="ghost" size="icon" 
          onClick={() => onChangeFontSize(Math.max(8, fontSize - 1))}
          className="w-7 h-7 rounded-lg hover:bg-slate-100"
        >
          <Minus className="w-3 h-3 text-slate-600" />
        </Button>
        <div className="w-10 text-center font-black text-xs text-slate-800 tracking-tighter">
          {fontSize}
        </div>
        <Button 
          variant="ghost" size="icon" 
          onClick={() => onChangeFontSize(Math.min(120, fontSize + 1))}
          className="w-7 h-7 rounded-lg hover:bg-slate-100"
        >
          <Plus className="w-3 h-3 text-slate-600" />
        </Button>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 px-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2 rounded-lg hover:bg-slate-50 transition-all">
              <div 
                className="w-4 h-4 rounded-full border border-black/10 shadow-sm transition-transform active:scale-90" 
                style={{ backgroundColor: color }} 
              />
              <Palette className="w-3.5 h-3.5 text-slate-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 rounded-2xl border-slate-200 shadow-2xl">
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onChangeColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border border-black/5 hover:scale-110 active:scale-95 transition-all flex items-center justify-center",
                      color === c ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HEX</label>
                <Input 
                  value={color} 
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="h-7 text-[10px] font-mono font-bold uppercase py-0 px-2 rounded-md bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </motion.div>
  );
};

export default PDFTextFormatToolbar;
