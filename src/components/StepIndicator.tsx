import { motion } from 'framer-motion';
import { CheckCircle2, Upload, Settings, Eye, FileSearch } from 'lucide-react';
import { AppStep } from '@/types/presentation';

const steps = [
  { key: 'upload' as AppStep, label: '파일 업로드', num: 1, icon: Upload, hint: '분석할 파일을 올려주세요' },
  { key: 'info' as AppStep, label: '설정', num: 2, icon: Settings, hint: '템플릿과 옵션을 선택하세요' },
  { key: 'preview' as AppStep, label: '편집 & 확인', num: 3, icon: Eye, hint: '슬라이드를 확인하고 수정하세요' },
];

interface StepIndicatorProps {
  currentStep: AppStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepOrder: AppStep[] = ['upload', 'info', 'generating', 'preview'];
  const currentIdx = stepOrder.indexOf(currentStep);

  const activeStep = steps.find((s) => {
    const idx = stepOrder.indexOf(s.key);
    return currentIdx <= idx || (currentStep === 'generating' && s.key === 'preview');
  }) || steps[steps.length - 1];

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => {
        const stepIdx = stepOrder.indexOf(step.key);
        const isActive = currentIdx >= stepIdx || (currentStep === 'generating' && step.key === 'preview');
        const isCurrent = step.key === currentStep || (currentStep === 'generating' && step.key === 'preview');
        const isDone = currentIdx > stepIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all
              ${isCurrent
                ? 'bg-primary text-primary-foreground shadow-sm'
                : isDone
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
              }
            `}>
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px transition-colors ${isDone ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 현재 단계에 대한 도움말 텍스트 반환 */
export function getStepGuide(step: AppStep | 'outline'): { title: string; desc: string } {
  switch (step) {
    case 'upload':
      return { title: '파일을 올려주세요', desc: '엑셀, PDF, Word 등 분석할 파일을 드래그하거나 클릭하여 업로드하세요. 여러 파일을 나눠서 올릴 수 있습니다.' };
    case 'info':
      return { title: '설정을 선택하세요', desc: '발표 유형과 분량을 선택하세요. 나머지는 선택사항이므로 바로 생성해도 됩니다.' };
    case 'outline':
      return { title: '구성안을 확인하세요', desc: 'AI가 제안한 슬라이드 구성입니다. 수정하거나 바로 생성할 수 있습니다.' };
    case 'generating':
      return { title: '생성 중...', desc: 'AI가 발표자료를 만들고 있습니다. 잠시만 기다려주세요.' };
    case 'preview':
      return { title: '완성! 편집하세요', desc: '슬라이드를 클릭하여 제목, 내용, 지표를 직접 수정하세요. 드래그로 순서를 바꿀 수 있습니다.' };
    default:
      return { title: '', desc: '' };
  }
}
