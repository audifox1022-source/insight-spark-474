import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Brain, FileSearch, CheckCircle2 } from 'lucide-react';

const LOADING_MESSAGES = [
  "입력하신 주제를 분석하고 있습니다...",
  "최적의 발표 목차를 구성하는 중입니다...",
  "슬라이드 초안을 디자인하고 있습니다...",
  "거의 다 되었습니다. 잠시만 기다려주세요!"
];

export const LoadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] h-full w-full bg-slate-50/50 rounded-3xl border border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/50 backdrop-blur-sm animate-in fade-in duration-700">
      
      {/* Central Animation Area */}
      <div className="relative mb-12">
        {/* Decorative Rings */}
        <motion.div 
          className="absolute -inset-8 rounded-full border-2 border-primary/10 border-dashed"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -inset-12 rounded-full border border-primary/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* Main Spinner Icon */}
        <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl shadow-premium flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
          
          {/* Floating Sparkles */}
          <motion.div 
            className="absolute top-2 right-2 text-primary/40"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={14} />
          </motion.div>
        </div>
      </div>

      {/* Dynamic Text Section */}
      <div className="text-center space-y-4 px-6 max-w-md">
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight animate-pulse"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          발표 전문가 수준의 논리 구조와 시각 효과를 적용하여<br />
          최상의 첫인상을 남길 수 있는 자료를 준비하고 있습니다.
        </p>
      </div>

      {/* Progress Pills */}
      <div className="mt-12 flex gap-2">
        {LOADING_MESSAGES.map((_, i) => (
          <motion.div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === messageIndex ? 'w-8 bg-primary shadow-glow-sm' : 'w-2 bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Branding Tag */}
      <div className="absolute bottom-10 flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
          WorkAI Strategic Engine Active
        </span>
      </div>

    </div>
  );
};
