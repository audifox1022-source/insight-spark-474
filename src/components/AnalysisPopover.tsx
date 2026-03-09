import React from 'react';
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
    return 'englishTerm' in term && 'description' in term;
};

const AnalysisPopover: React.FC<PopoverProps> = ({ content }) => {
  return (
    <AnimatePresence>
      {content && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="fixed bg-card/60 backdrop-blur-2xl border border-primary/10 rounded-3xl shadow-elevated p-6 max-w-sm z-[100] text-sm pointer-events-none"
          style={{
            top: `${content.position.top + 20}px`,
            left: `${content.position.left + 20}px`,
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
                {content.term.description}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="font-black text-primary text-xs uppercase tracking-tight">문맥 분석 결과</p>
              </div>
              <div className="pl-3.5 space-y-1.5">
                <p className="font-black text-foreground">{(content.term as ContextualTerm).koreanTerm}</p>
                <p className="text-xs font-bold text-primary">추천: {(content.term as ContextualTerm).suggestedTranslation}</p>
                <p className="text-[11px] text-muted-foreground font-medium italic">"{(content.term as ContextualTerm).alternatives}"</p>
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
