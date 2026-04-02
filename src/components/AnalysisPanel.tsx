import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Brain, FileText, Layout, 
  MessageSquare, Sparkles, TrendingUp,
  AlertCircle, CheckCircle2, Info, ChevronRight,
  Target, Zap, Globe, Languages
} from 'lucide-react';
import type { AnalysisResults } from '@/types/translation';

interface AnalysisPanelProps {
  results: AnalysisResults | null;
  isLoading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ results, isLoading }) => {
  const getMappedStyleValue = (value: string | undefined): string => {
    if (!value) return '분석 중...';
    // [Safety Fix] split('/') 호출 전 value 존재 보장
    const parts = value.split('/');
    if (parts.length < 2) return value;
    return `${parts[1]} (${parts[0]})`;
  };

  if (isLoading) {
    return (
      <div className="w-[450px] flex flex-col gap-6 p-6 overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="h-10 w-48 bg-muted/40 animate-pulse rounded-xl" />
          <div className="h-4 w-full bg-muted/20 animate-pulse rounded-lg" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3 p-5 rounded-3xl bg-card/40 border border-border/40">
            <div className="h-5 w-1/3 bg-muted/40 animate-pulse rounded-lg" />
            <div className="h-20 w-full bg-muted/20 animate-pulse rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="w-[450px] flex flex-col items-center justify-center p-12 text-center border-l border-border/40 bg-card/20 backdrop-blur-sm">
        <div className="w-20 h-20 rounded-[2.5rem] bg-muted/30 flex items-center justify-center mb-6 shadow-inner">
          <Brain className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <h3 className="text-xl font-black text-foreground tracking-tight">AI 심층 분석 대기 중</h3>
        <p className="text-sm text-muted-foreground mt-3 font-medium leading-relaxed">
          번역을 시작하면 문맥 분석과<br />전문 용어 추출 결과가 여기에 표시됩니다.
        </p>
        <div className="mt-8 flex flex-col gap-2 w-full max-w-[200px]">
          <div className="h-1 bg-primary/10 rounded-full overflow-hidden">
             <motion.div 
               animate={{ x: [-200, 200] }} 
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-1/2 h-full bg-primary/40 rounded-full"
             />
          </div>
        </div>
      </div>
    );
  }

  const { contextAnalysis = [], terminologyAnalysis = [], styleAnalysis } = results;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[450px] flex flex-col gap-6 p-8 overflow-y-auto custom-scrollbar border-l border-border/40 bg-card/20 backdrop-blur-xl"
    >
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">인텔리전스 분석 리포트</h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">AI Insights & Terminology</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 스타일 분석 섹션 */}
        {styleAnalysis && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">문체 및 스타일 가이드</h3>
            </div>
            <div className="p-6 rounded-[2rem] bg-card/60 border border-white/5 shadow-xl space-y-4 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10">
                   <p className="text-[10px] text-primary/60 font-black uppercase tracking-tighter mb-1">Tone of Voice</p>
                   <p className="text-[13px] font-black text-foreground truncate">{getMappedStyleValue(styleAnalysis.tone)}</p>
                 </div>
                 <div className="p-3.5 rounded-2xl bg-accent/5 border border-accent/10">
                   <p className="text-[10px] text-accent/60 font-black uppercase tracking-tighter mb-1">Honorifics</p>
                   <p className="text-[13px] font-black text-foreground truncate">{getMappedStyleValue(styleAnalysis.honorifics)}</p>
                 </div>
              </div>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/40">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter mb-2">Translation Strategy</p>
                <div className="flex items-start gap-2">
                   <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                   <p className="text-xs font-medium text-foreground/80 leading-relaxed italic">
                     "{styleAnalysis.styleFocus || '문맥의 의도를 보존하는 자연스러운 번역 전략이 적용되었습니다.'}"
                   </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 문맥 분석 섹션 */}
        {(contextAnalysis || []).length > 0 && (
          <section className="space-y-4">
             <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">문맥 기반 보정 사항</h3>
            </div>
            <div className="space-y-4">
              {contextAnalysis.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-5 rounded-3xl bg-card border border-white/10 shadow-lg hover:border-primary/40 hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                     <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                       Insight #{i+1}
                     </span>
                     <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="space-y-3">
                     <div className="flex flex-col gap-1.5">
                       <p className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-tighter">원본 의도</p>
                       <p className="text-sm font-bold text-foreground/90 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                         "{item.originalContext || ''}"
                       </p>
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <p className="text-[11px] font-black text-primary/60 uppercase tracking-tighter">AI 보정 번역</p>
                       <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-black text-primary">
                         {item.suggestedTranslation || ''}
                       </div>
                     </div>
                     <div className="pt-2 flex items-start gap-2">
                        <Zap className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                          {item.reasoning || ''}
                        </p>
                     </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* 전문 용어 섹션 */}
        {(terminologyAnalysis || []).length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-500" />
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">추출된 전문 용어 사전</h3>
            </div>
            <div className="p-4 rounded-[2.5rem] bg-card/60 border border-white/5 backdrop-blur-md shadow-xl overflow-hidden">
               <div className="divide-y divide-white/5">
                 {terminologyAnalysis.map((term, i) => (
                   <div key={i} className="py-4 first:pt-2 last:pb-2 group">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-black text-teal-600/80 dark:text-teal-400/80 uppercase tracking-tighter mb-0.5">Technical Term</p>
                           <h4 className="text-sm font-black text-foreground group-hover:text-teal-500 transition-colors uppercase">{term.englishTerm || ''}</h4>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                           <p className="text-xs font-black text-teal-600 dark:text-teal-300">{term.koreanTerm || ''}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-medium group-hover:text-foreground/70 transition-colors pl-1">
                        {term.definition || '이 용어에 대한 특정 정의가 분석 결과에 포함되어 있지 않습니다.'}
                      </p>
                   </div>
                 ))}
               </div>
            </div>
          </section>
        )}
      </div>

      <div className="mt-auto pt-8">
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/10 to-accent/10 border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
           <Globe className="w-8 h-8 text-primary/20 absolute -right-2 -bottom-2 group-hover:scale-150 group-hover:rotate-12 transition-transform duration-700" />
           <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-2">System Status</p>
           <h4 className="text-sm font-black text-foreground tracking-tight">AI 엔진 실시간 동기화 중</h4>
           <p className="text-[11px] text-muted-foreground/80 mt-1 font-medium italic">Gemini 1.5 Pro via spark-insight-core</p>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisPanel;
