import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export type LoadingVariant = 'spinner' | 'dots' | 'progress' | 'pulse';
export type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingIndicatorProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  progress?: number;
  status?: 'loading' | 'success' | 'error';
  className?: string;
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const containerClasses: Record<LoadingSize, string> = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

export function LoadingIndicator({
  variant = 'spinner',
  size = 'md',
  message,
  progress,
  status = 'loading',
  className,
}: LoadingIndicatorProps) {
  const renderIndicator = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Loader2
            className={`${sizeClasses[size]} animate-spin ${
              status === 'error' ? 'text-destructive' : 'text-primary'
            }`}
          />
        );

      case 'dots':
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  status === 'error' ? 'bg-destructive' : 'bg-primary'
                }`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        );

      case 'progress':
        return (
          <div className="w-full max-w-xs">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {progress !== undefined && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {Math.round(progress)}%
              </p>
            )}
          </div>
        );

      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} rounded-full bg-primary/20`}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className || ''}`}
    >
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderIndicator()}
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
          >
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {message && (
        <p className="text-sm text-muted-foreground font-medium text-center">
          {message}
        </p>
      )}
    </div>
  );
}

// ── 풀스크린 로딩 ──

interface FullScreenLoadingProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
}

export function FullScreenLoading({
  message = '로딩 중...',
  progress,
  showProgress = false,
}: FullScreenLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8">
        <LoadingIndicator variant="spinner" size="lg" />
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-foreground">{message}</p>
          {showProgress && progress !== undefined && (
            <LoadingIndicator variant="progress" progress={progress} />
          )}
        </div>
      </div>
    </div>
  );
}
