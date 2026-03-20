// ============================================================
// src/components/DeepResearchProgress.tsx
// 딥 리서치 파이프라인 진행 상황 시각화 UI
// ✅ [강제 종료] 버튼 및 타임아웃 킬스위치 포함
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Globe, Search, Download, Brain, FileText,
  Sparkles, CheckCircle2, Clock, Database, XCircle,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { DEEP_RESEARCH_STAGES, DeepResearchStage } from '@/lib/deep-research-pipeline';

const STAGE_ICONS = [BookOpen, Globe, Search, Download, Brain, FileText, Sparkles];

// ── 무한 로딩 방지: 최대 대기 시간 (ms) ──────────────────────
const MAX_WAIT_MS = 5 * 60 * 1000; // 5분

interface DeepResearchProgressProps {
  currentStage: DeepResearchStage;
  stageIndex: number;
  message: string;
  sourceCount?: number;
  elapsedSeconds?: number;
  /** 강제 종료 콜백 — 부모가 전달. 없으면 버튼 숨김 */
  onForceAbort?: () => void;
}

export function DeepResearchProgress({
  currentStage,
  stageIndex,
  message,
  sourceCount = 0,
  elapsedSeconds = 0,
  onForceAbort,
}: DeepResearchProgressProps) {
  // 카운터 애니메이션용 로컬 상태
  const [displayedCount, setDisplayedCount] = useState(0);
  const [localElapsed, setLocalElapsed] = useState(elapsedSeconds);
  // 자동 타임아웃이 발동됐을 때 사용자에게 알리기 위한 상태
  const [timedOut, setTimedOut] = useState(false);

  const mountedAt = useRef(Date.now());
  const timeoutHandled = useRef(false);

  // ── 경과 시간 로컬 카운터 ──────────────────────────────────
  useEffect(() => {
    setLocalElapsed(elapsedSeconds);
    const timer = setInterval(() => setLocalElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedSeconds]);

  // ── 출처 수 애니메이션 ────────────────────────────────────
  useEffect(() => {
    if (sourceCount <= displayedCount) return;
    const step = Math.ceil((sourceCount - displayedCount) / 20);
    const timer = setInterval(() => {
      setDisplayedCount((c) => {
        const next = c + step;
        if (next >= sourceCount) { clearInterval(timer); return sourceCount; }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [sourceCount]);

  // ── 자동 타임아웃 킬스위치 ────────────────────────────────
  useEffect(() => {
    const remaining = MAX_WAIT_MS - (Date.now() - mountedAt.current);
    if (remaining <= 0 || timeoutHandled.current) return;

    const timeout = setTimeout(() => {
      if (timeoutHandled.current) return;
      timeoutHandled.current = true;
      setTimedOut(true);
      // onForceAbort가 있으면 자동 호출
      if (onForceAbort) {
        onForceAbort();
      }
    }, remaining);

    return () => clearTimeout(timeout);
  }, []); // 마운트 시 1회만 등록

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
  };

  const progressPct = ((stageIndex + 1) / 7) * 100;
  const CurrentIcon = STAGE_ICONS[Math.min(stageIndex, 6)];

  const handleForceAbort = () => {
    if (timeoutHandled.current) return;
    timeoutHandled.current = true;
    if (onForceAbort) onForceAbort();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 gap-8 px-4"
    >
      {/* 메인 로더 */}
      <div className="relative">
        <motion.div
          className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30"
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.3, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.35 }}
            >
              <CurrentIcon className="w-12 h-12 text-white" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* 파동 링 */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute -inset-3 rounded-[36px] border border-violet-400/20"
            animate={{ scale: [1, 1.2 + ring * 0.05, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: ring * 0.5 }}
          />
        ))}
      </div>

      {/* 현재 단계 텍스트 */}
      <div className="text-center space-y-1 max-w-sm">
        <AnimatePresence mode="wait">
          <motion.p
            key={`stage-${stageIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xl font-bold text-foreground"
          >
            {DEEP_RESEARCH_STAGES[Math.min(stageIndex, 6)]?.emoji}{' '}
            {DEEP_RESEARCH_STAGES[Math.min(stageIndex, 6)]?.label}
          </motion.p>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${stageIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-muted-foreground"
          >
            {DEEP_RESEARCH_STAGES[Math.min(stageIndex, 6)]?.desc}
          </motion.p>
        </AnimatePresence>
        {/* 현재 메시지 */}
        {message && (
          <p className="text-xs text-muted-foreground/70 mt-1 break-all">{message}</p>
        )}
      </div>

      {/* 통계 카드 행 */}
      <div className="flex gap-4">
        {/* 출처 수 */}
        <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30 min-w-[90px]">
          <Database className="w-4 h-4 text-violet-500" />
          <motion.span
            className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 tabular-nums"
          >
            {displayedCount}
          </motion.span>
          <span className="text-[10px] text-muted-foreground font-medium">수집 출처</span>
        </div>

        {/* 경과 시간 */}
        <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30 min-w-[90px]">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
            {formatTime(localElapsed)}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">경과 시간</span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{stageIndex + 1} / 7 단계</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 단계 목록 */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {DEEP_RESEARCH_STAGES.map((s, i) => {
          const Icon = STAGE_ICONS[i];
          const isActive = i === stageIndex;
          const isDone = i < stageIndex;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-400 ${
                isActive
                  ? 'bg-violet-500/10 border border-violet-500/30 shadow-sm'
                  : isDone
                  ? 'opacity-50'
                  : 'opacity-25'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md'
                    : isDone
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {s.emoji} {s.label}
                </p>
              </div>
              {isDone && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
                </motion.div>
              )}
              {isActive && (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── 안내 문구 + 강제 종료 버튼 (킬스위치) ── */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <p className="text-xs text-muted-foreground/70 text-center">
          💡 딥 리서치는 약 3~5분 소요됩니다. 브라우저를 닫지 마세요.
        </p>

        {/* ✅ 물리적 킬스위치: [진행 취소 및 강제 종료] 버튼 */}
        {onForceAbort && (
          <button
            onClick={handleForceAbort}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl
              border-2 border-red-400/60 bg-red-50 dark:bg-red-950/30
              text-red-600 dark:text-red-400 font-bold text-sm
              hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-500
              active:scale-95 transition-all duration-150 shadow-sm
            "
            title="진행 중인 요청을 즉시 중단하고 이전 화면으로 돌아갑니다"
          >
            <XCircle className="w-4 h-4" />
            진행 취소 및 강제 종료
          </button>
        )}

        {/* 타임아웃 발동 시 경고 메시지 */}
        {timedOut && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold text-red-500 text-center"
          >
            ⚠️ 5분 초과: 자동으로 종료를 시도합니다.
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
