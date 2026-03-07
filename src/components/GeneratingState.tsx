// ============================================================
// GeneratingState.tsx — 3단계 파이프라인 시각화 UI (Feature 5)
// ============================================================
import { motion } from 'framer-motion';
import { FileSearch, Brain, LayoutDashboard, Sparkles, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PIPELINE_STAGES } from '@/lib/pipeline';

// 파이프라인 단계와 내부 기존 단계를 매핑
const STEPS = [
  {
    icon: FileSearch,
    label: PIPELINE_STAGES[0].label,
    desc: '업로드된 파일의 구조와 핵심 데이터를 파악합니다',
    emoji: PIPELINE_STAGES[0].emoji,
  },
  {
    icon: Brain,
    label: PIPELINE_STAGES[1].label,
    desc: 'Gemini AI가 원시 데이터에서 핵심 내용을 추출·요약합니다',
    emoji: PIPELINE_STAGES[1].emoji,
  },
  {
    icon: LayoutDashboard,
    label: PIPELINE_STAGES[2].label,
    desc: '슬라이드 JSON 구조로 매핑하고 시각 요소를 최적화합니다',
    emoji: PIPELINE_STAGES[2].emoji,
  },
  {
    icon: Sparkles,
    label: PIPELINE_STAGES[3].label,
    desc: 'PPTX 다운로드 준비 및 최종 검수를 완료합니다',
    emoji: PIPELINE_STAGES[3].emoji,
  },
];

interface GeneratingStateProps {
  currentStage?: number; // 0~3 외부에서 주입 가능
}

export function GeneratingState({ currentStage }: GeneratingStateProps) {
  const [activeStep, setActiveStep] = useState(currentStage ?? 0);

  useEffect(() => {
    if (currentStage !== undefined) {
      setActiveStep(currentStage);
      return;
    }
    // 외부 주입이 없으면 자동 타이머
    const interval = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, [currentStage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-10"
    >
      {/* 메인 로더 */}
      <div className="relative">
        <motion.div
          className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {(() => {
            const Icon = STEPS[activeStep].icon;
            return (
              <motion.div key={activeStep} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                <Icon className="w-10 h-10 text-primary-foreground" />
              </motion.div>
            );
          })()}
        </motion.div>
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute -inset-3 rounded-3xl border border-accent/20"
            animate={{ scale: [1, 1.15 + ring * 0.05, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: ring * 0.4 }}
          />
        ))}
      </div>

      {/* 현재 단계 텍스트 */}
      <div className="text-center">
        <motion.p
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold"
        >
          {STEPS[activeStep].emoji} {STEPS[activeStep].label}
        </motion.p>
        <motion.p
          key={`desc-${activeStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-muted-foreground mt-2"
        >
          {STEPS[activeStep].desc}
        </motion.p>

        {/* 파이프라인 진행률 바 */}
        <div className="mt-4 w-64 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
          <motion.div
            className="h-full gradient-primary rounded-full"
            animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
          {activeStep + 1} / {STEPS.length} 단계
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                isActive ? 'bg-primary/10 border border-primary/20 shadow-sm' :
                isDone ? 'opacity-60' : 'opacity-30'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                isActive ? 'gradient-primary text-primary-foreground shadow-glow' :
                isDone ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : ''}`}>
                  {step.emoji} {step.label}
                </p>
              </div>
              {isDone && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </motion.div>
              )}
              {isActive && (
                <motion.div
                  className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
