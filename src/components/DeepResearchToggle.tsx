// ============================================================
// src/components/DeepResearchToggle.tsx
// 딥 리서치 모드 ON/OFF 토글 UI 컴포넌트
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Globe, Zap, Clock, BookOpen } from 'lucide-react';

interface DeepResearchToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export function DeepResearchToggle({ enabled, onToggle }: DeepResearchToggleProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* 헤더 토글 Row */}
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={`w-full flex items-center gap-4 px-5 py-4 transition-all duration-300 ${
          enabled
            ? 'bg-gradient-to-r from-violet-600/10 via-purple-600/8 to-indigo-600/5'
            : 'hover:bg-muted/30'
        }`}
      >
        {/* 아이콘 */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            enabled
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30'
              : 'bg-muted'
          }`}
        >
          <FlaskConical
            className={`w-5 h-5 transition-colors ${enabled ? 'text-white' : 'text-muted-foreground'}`}
          />
        </div>

        {/* 텍스트 */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">딥 리서치 모드</p>
            {enabled && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white uppercase tracking-wide"
              >
                ON
              </motion.span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            NotebookLM이 ~40개 출처를 심층 리서치하여 고품질 발표자료를 생성합니다
          </p>
        </div>

        {/* 토글 스위치 */}
        <div
          className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
            enabled ? 'bg-violet-500' : 'bg-muted-foreground/30'
          }`}
        >
          <motion.div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
            animate={{ left: enabled ? '26px' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </button>

      {/* 활성화 시 상세 정보 */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 border-t border-violet-500/20">
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
                  <Globe className="w-4 h-4 text-violet-500" />
                  <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 text-center">~40개 출처</p>
                  <p className="text-[9px] text-muted-foreground text-center leading-tight">웹 심층 리서치</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
                  <Clock className="w-4 h-4 text-violet-500" />
                  <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 text-center">3~5분 소요</p>
                  <p className="text-[9px] text-muted-foreground text-center leading-tight">딥 리서치 시간</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
                  <BookOpen className="w-4 h-4 text-violet-500" />
                  <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 text-center">인용 포함</p>
                  <p className="text-[9px] text-muted-foreground text-center leading-tight">출처 슬라이드 자동 추가</p>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  NotebookLM이 최신 웹 정보를 수집합니다. 일반 모드보다 시간이 더 걸리지만, 
                  통계·인용·근거가 포함된 훨씬 풍부한 발표자료를 생성합니다.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
