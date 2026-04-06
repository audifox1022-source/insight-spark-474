import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ✨ [경로 수정됨]
import type { ContextualTerm, TerminologyTerm } from '@/types/translation';

interface PopoverProps {
  content: {
    term: ContextualTerm | TerminologyTerm;
    position: { top: number; left: number };
  } | null;
}

const isTerminologyTerm = (term: any): term is TerminologyTerm => {
    return 'englishTerm' in term && 'definition' in term;
};

export const AnalysisPopover: React.FC<PopoverProps> = ({ content }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (content && popoverRef.current) {
      const { top, left } = content.position;
      const { offsetWidth, offsetHeight } = popoverRef.current;
      
      let newTop = top + 20;
      let newLeft = left + 20;

      // 뷰포트 우측 경계 체크
      if (newLeft + offsetWidth > window.innerWidth) {
        newLeft = left - offsetWidth - 20;
      }
      
      // 뷰포트 하단 경계 체크
      if (newTop + offsetHeight > window.innerHeight) {
        newTop = top - offsetHeight - 20;
      }

      // 최소값 방어 (상단/좌측으로 나가는 경우)
      newLeft = Math.max(10, newLeft);
      newTop = Math.max(10, newTop);

      setAdjustedPosition({ top: newTop, left: newLeft });
    }
  }, [content]);

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            top: adjustedPosition.top,
            left: adjustedPosition.left
          }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="fixed bg-card/80 backdrop-blur-3xl border border-primary/20 rounded-3xl shadow-2xl p-6 max-w-sm z-[9999] text-sm pointer-events-none"
          style={{
            position: 'fixed'
          }}
        >
          {isTerminologyTerm(content.term) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <p className="font-black text-teal-600 dark:text-teal-400">
                  {content.term.koreanTerm} <span className="text-muted-foreground/50 mx-1">→</span> {content.term.englishTerm}
                </p>
              </div>
              <p className="text-muted-foreground font-medium text-xs leading-relaxed pl-3.5">
                {(content.term as TerminologyTerm).definition}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="font-black text-primary text-xs uppercase tracking-tight">문맥 분석 결과</p>
              </div>
              <div className="pl-3.5 space-y-1.5">
                <p className="font-black text-foreground">{(content.term as ContextualTerm).originalContext}</p>
                <p className="text-xs font-bold text-primary">추천: {(content.term as ContextualTerm).suggestedTranslation}</p>
                <p className="text-[11px] text-muted-foreground font-medium italic">"{(content.term as ContextualTerm).reasoning}"</p>
              </div>
            </div>
          )}
          
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary/20 rounded-full blur-sm animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnalysisPopover;
