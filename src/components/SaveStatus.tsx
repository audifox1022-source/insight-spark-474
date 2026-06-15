import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, CloudOff } from 'lucide-react';
import type { AutoSaveStatus } from '@/hooks/useAutoSave';

interface SaveStatusProps {
  status: AutoSaveStatus;
  lastSaved?: string;
}

export const SaveStatus = ({ status, lastSaved }: SaveStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: '저장 중...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      case 'saved':
        return {
          icon: <Check className="w-3 h-3" />,
          text: '저장됨',
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: '저장 실패',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {config && (
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${config.bgColor} ${config.borderColor} ${config.color}`}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {status === 'idle' && lastSaved && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <CloudOff className="w-3 h-3" />
          <span className="hidden sm:inline">{lastSaved}</span>
        </div>
      )}
    </div>
  );
};
