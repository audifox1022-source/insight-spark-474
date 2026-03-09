import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, Languages, CheckCircle2 } from 'lucide-react';

interface ReverseTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  reverseTranslation: string;
  targetLanguage: string;
  isLoading: boolean;
}

const ReverseTranslationModal: React.FC<ReverseTranslationModalProps> = ({
  isOpen,
  onClose,
  originalText,
  reverseTranslation,
  targetLanguage,
  isLoading,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-elevated overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">역번역 검증</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Translation Integrity Check</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: '65vh' }}>
              {/* 번역문 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <Languages className="w-3.5 h-3.5 text-primary/60" />
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">번역문 (Intermediate)</h3>
                </div>
                <div className="p-5 rounded-3xl bg-muted/20 border border-white/5 text-sm leading-relaxed text-foreground/80 font-medium">
                  {originalText}
                </div>
              </div>

              {/* 역번역 결과 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">역번역 결과 ({targetLanguage})</h3>
                </div>
                <div className="p-5 rounded-3xl bg-background/40 border border-white/5 min-h-[120px] relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <p className="text-xs font-bold text-muted-foreground">{targetLanguage}(으)로 복원 중...</p>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground font-medium">
                      {reverseTranslation || '결과가 없습니다.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold leading-relaxed">
                팁: 역번역 결과가 원문과 의미상 차이가 크다면, AI가 문맥을 오해했을 가능성이 있습니다. 이 경우 원문을 조금 더 명확하게 수정하여 다시 번역해보시는 것을 추천합니다.
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-muted/30 border-t border-white/5 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-foreground text-background text-sm font-black rounded-2xl hover:opacity-90 transition-all shadow-lg"
              >
                확인 완료
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReverseTranslationModal;
