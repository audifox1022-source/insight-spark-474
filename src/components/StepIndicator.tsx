// StepIndicator.tsx (Hardened)
import { motion } from 'framer-motion';
import { CheckCircle2, Upload, Settings, Eye } from 'lucide-react';
import { AppStep } from '@/types/presentation';

const steps: { key: AppStep; label: string; num: number; icon: any }[] = [
  { key: 'upload',  label: '파일 업로드', num: 1, icon: Upload   },
  { key: 'info',    label: '발표 설정',   num: 2, icon: Settings  },
  { key: 'preview', label: '편집 & 확인', num: 3, icon: Eye       },
];

interface StepIndicatorProps { currentStep: AppStep }

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  // ── [Safe Guard for currentStep] ──
  const safeCurrentStep = currentStep || 'upload';
  const stepOrder: AppStep[] = ['upload', 'info', 'generating', 'preview'];
  const currentIdx = stepOrder.indexOf(safeCurrentStep);

  return (
    <div className="flex items-center gap-1">
      {(steps || []).map((step, i) => {
        if (!step) return null;
        const stepIdx  = stepOrder.indexOf(step.key);
        // ── [Safe Guard for isActive Logic] ──
        const isActive = currentIdx >= stepIdx ||
                         (safeCurrentStep === 'generating' && step.key === 'preview');
        const isCurrent = step.key === safeCurrentStep ||
                          (safeCurrentStep === 'generating' && step.key === 'preview');
        const isDone = currentIdx > stepIdx;
        const Icon = step.icon;

        if (!Icon) return null;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <motion.div
              layout
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                transition-all duration-300 border
                ${isCurrent
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25'
                  : isDone
                  ? 'bg-primary/12 text-primary border-primary/20'
                  : 'bg-muted/60 text-muted-foreground border-border/50'}
              `}
            >
              <span className="flex-shrink-0">
                {isDone
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <Icon className="w-3.5 h-3.5" />
                }
              </span>

              <span className="hidden sm:flex items-center gap-1.5">
                <span className={`
                  text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                  ${isCurrent ? 'bg-white/20' : isDone ? 'bg-primary/15' : 'bg-border/60'}
                `}>
                  {step.num}
                </span>
                <span className="whitespace-nowrap tracking-tight">{step.label}</span>
              </span>
            </motion.div>

            {i < steps.length - 1 && (
              <div className={`
                w-5 h-px mx-0.5 rounded-full transition-colors duration-300
                ${isDone ? 'bg-primary/50' : 'bg-border/60'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}
