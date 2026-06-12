import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export type LoadingStage = 'uploading' | 'analyzing' | 'generating' | 'reviewing' | 'complete';

interface ProgressiveLoadingProps {
  stage: LoadingStage;
  progress: number;
  message?: string;
}

const stageConfig: Record<LoadingStage, { label: string; description: string }> = {
  uploading: {
    label: '파일 업로드 중',
    description: '파일을 서버에 전송하고 있습니다',
  },
  analyzing: {
    label: 'AI 분석 중',
    description: 'AI가 문서를 분석하고 있습니다',
  },
  generating: {
    label: '슬라이드 생성 중',
    description: 'AI가 슬라이드를 생성하고 있습니다',
  },
  reviewing: {
    label: '품질 검수 중',
    description: '생성된 슬라이드를 검수하고 있습니다',
  },
  complete: {
    label: '완료',
    description: '작업이 완료되었습니다',
  },
};

export function ProgressiveLoading({ stage, progress, message }: ProgressiveLoadingProps) {
  const config = stageConfig[stage];
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        {stage !== 'complete' && (
          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
        )}
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold">{config.label}</h3>
        <p className="text-sm text-muted-foreground">
          {message || config.description}
        </p>
      </div>
      
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-center text-muted-foreground">
          {Math.round(progress)}% 완료
        </p>
      </div>
      
      <div className="flex gap-2 text-xs text-muted-foreground">
        {(['uploading', 'analyzing', 'generating', 'reviewing', 'complete'] as LoadingStage[]).map((s) => (
          <div
            key={s}
            className={`flex items-center gap-1 ${
              s === stage ? 'text-primary font-medium' : 
              getStageIndex(s) < getStageIndex(stage) ? 'text-muted-foreground' : 'text-muted-foreground/50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              getStageIndex(s) < getStageIndex(stage) ? 'bg-primary' :
              s === stage ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
            }`} />
            <span className="hidden sm:inline">{stageConfig[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStageIndex(stage: LoadingStage): number {
  const stages: LoadingStage[] = ['uploading', 'analyzing', 'generating', 'reviewing', 'complete'];
  return stages.indexOf(stage);
}
