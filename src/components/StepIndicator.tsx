import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { AppStep } from '@/types/presentation';

const steps = [
  { key: 'upload' as AppStep, label: '파일 업로드', num: 1 },
  { key: 'info' as AppStep, label: '회의 정보', num: 2 },
  { key: 'preview' as AppStep, label: '자료 확인', num: 3 },
];

interface StepIndicatorProps {
  currentStep: AppStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepOrder: AppStep[] = ['upload', 'info', 'generating', 'preview'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const stepIdx = stepOrder.indexOf(step.key);
        const isActive = currentIdx >= stepIdx;
        const isDone = currentIdx > stepIdx;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className="font-mono">{step.num}</span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${isActive ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
