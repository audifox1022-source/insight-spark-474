import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlideNavigationProps {
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onPlay?: () => void;
}

export const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentIndex,
  totalSlides,
  onPrev,
  onNext,
  onPlay
}) => {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50 overflow-hidden"
    >
      {/* Visual Progress Bar (Top Edge) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-100">
        <motion.div 
          className="h-full bg-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={currentIndex === 0}
        title="이전 슬라이드 (←)"
        className="h-10 w-10 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-all"
      >
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </Button>

      <div className="px-4 py-1.5 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center gap-2">
        <span className="text-[13px] font-black text-indigo-600 tabular-nums">
          {currentIndex + 1}
        </span>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          of
        </span>
        <span className="text-[13px] font-black text-slate-400 tabular-nums">
          {totalSlides}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={currentIndex >= totalSlides - 1}
        title="다음 슬라이드 (→)"
        className="h-10 w-10 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-all"
      >
        <ChevronRight className="w-5 h-5 text-slate-700" />
      </Button>
      
      <div className="w-px h-6 bg-slate-200 mx-1" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlay}
        title="프레젠테이션 시작 (F5)"
        className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-all"
      >
        <Play className="w-4 h-4 fill-current" />
      </Button>
    </motion.div>
  );
};
