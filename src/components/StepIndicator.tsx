// StepIndicator.tsx
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
  const stepOrder: AppStep[] = ['upload', 'info', 'generating', 'preview'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const stepIdx  = stepOrder.indexOf(step.key);
        const isActive = currentIdx >= stepIdx ||
                         (currentStep === 'generating' && step.key === 'preview');
        const isCurrent = step.key === currentStep ||
                          (currentStep === 'generating' && step.key === 'preview');
        const isDone = currentIdx > stepIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* 스텝 뱃지 */}
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
              {/* 아이콘 or 체크 */}
              <span className="flex-shrink-0">
                {isDone
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <Icon className="w-3.5 h-3.5" />
                }
              </span>

              {/* 숫자 + 라벨 — sm 이상에서 표시 */}
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

            {/* 연결선 */}
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

export function getStepGuide(step: AppStep): { title: string; desc: string } {
  switch (step) {
    case 'upload':     return { title: '📂 파일 업로드',    desc: '발표 자료 파일(PDF, Word, 텍스트 등)을 업로드하거나 주제를 직접 입력하세요.' };
    case 'info':       return { title: '⚙️ 발표 설정',      desc: '발표 목적, 청중, 시간 등 세부 설정을 입력하면 AI가 최적의 구성을 제안합니다.' };
    case 'outline':    return { title: '📋 목차 확인',      desc: 'AI가 생성한 목차를 검토하고 수정한 뒤 승인하면 슬라이드를 만들기 시작합니다.' };
    case 'generating': return { title: '✨ 생성 중…',       desc: 'AI가 슬라이드를 만들고 있습니다. 잠시만 기다려주세요.' };
    case 'preview':    return { title: '🎉 편집 & 확인',    desc: '슬라이드를 클릭해 내용을 수정하고, 저장하거나 발표 모드로 확인하세요.' };
    default:           return { title: '안내',              desc: '' };
  }
}
