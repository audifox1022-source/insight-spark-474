import { motion } from 'framer-motion';
import { FileSearch, Brain, LayoutDashboard, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEPS = [
  { icon: FileSearch, label: '파일 데이터 분석 중', desc: '업로드된 파일의 구조와 핵심 데이터를 파악합니다' },
  { icon: Brain, label: 'AI가 콘텐츠를 구성 중', desc: '데이터 기반으로 슬라이드 내용을 생성합니다' },
  { icon: LayoutDashboard, label: '차트 및 레이아웃 설계 중', desc: '시각적 요소와 발표 흐름을 최적화합니다' },
  { icon: Sparkles, label: '최종 검수 및 완성', desc: '발표 자료의 완성도를 높이고 있습니다' },
];

export function GeneratingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
        {/* 펄스 링 */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute -inset-3 rounded-3xl border border-accent/20"
            animate={{ scale: [1, 1.15 + ring * 0.05, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: ring * 0.4 }}
          />
        ))}
      </div>

      {/* 제목 */}
      <div className="text-center">
        <motion.p
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold"
        >
          {STEPS[activeStep].label}
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
                <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : ''}`}>{step.label}</p>
              </div>
              {isDone && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
