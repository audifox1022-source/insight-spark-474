import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function GeneratingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        </div>
        <motion.div
          className="absolute -inset-3 rounded-3xl border-2 border-accent/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">발표 자료를 생성하고 있습니다</p>
        <p className="text-sm text-muted-foreground mt-1">
          데이터를 분석하고 슬라이드를 구성하는 중입니다...
        </p>
      </div>
    </motion.div>
  );
}
