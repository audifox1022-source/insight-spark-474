import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Languages, Zap, MessageSquare, 
  Search, ShieldCheck, Download, Pencil, BookOpen 
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const StepCard = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
    <div className="relative p-6 rounded-3xl bg-background/40 border border-white/5 hover:border-primary/20 transition-all group">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
        <span className="text-xs font-black text-primary">{number}</span>
      </div>
      <h4 className="text-sm font-black text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h4>
      <div className="text-xs text-muted-foreground font-medium leading-relaxed">
        {children}
      </div>
    </div>
  );

  const ToolInfo = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/20 border border-white/5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h5 className="text-xs font-black text-foreground mb-1">{title}</h5>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-card/70 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-8 py-6 flex justify-between items-center border-b border-white/5 bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">AI 전문 번역기 사용 가이드</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Smart Translation & Analysis Engine</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-10">
                {/* Steps Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">번역 프로세스</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StepCard number="01" title="원문 입력">
                      텍스트를 직접 입력하거나 <strong>PDF, DOCX, TXT</strong> 파일을 업로드하여 분석을 시작하세요.
                    </StepCard>
                    <StepCard number="02" title="문맥 감지">
                      AI가 실시간으로 문서의 전문 분야(IT, 법률, 의학 등)와 문체를 자동으로 감지합니다.
                    </StepCard>
                    <StepCard number="03" title="용어 분석">
                      추출된 핵심 전문 용어와 문맥 분석 결과를 확인하고, 필요에 따라 추천 번역어를 선택하세요.
                    </StepCard>
                    <StepCard number="04" title="최종 검증">
                      역번역 검증 기능을 통해 번역의 정확도를 체크하고, 결과물을 파일로 안전하게 저장하세요.
                    </StepCard>
                  </div>
                </section>

                {/* Features Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">핵심 도구 설명</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToolInfo 
                      icon={BookOpen} 
                      title="핵심 용어 자동 추출" 
                      description="문서 내의 반복되는 전문 용어나 고유 명사를 AI가 정확하게 발굴하여 일관성 있는 번역을 보장합니다."
                    />
                    <ToolInfo 
                      icon={MessageSquare} 
                      title="문맥 주의 기반 번역" 
                      description="단순 직역이 아닌, 앞뒤 문장과 문서 전체의 흐름을 파악하여 가장 자연스러운 비즈니스 어투를 제공합니다."
                    />
                    <ToolInfo 
                      icon={ShieldCheck} 
                      title="역번역 검증 엔진" 
                      description="번역된 결과물을 다시 원문 언어로 교차 검증하여 의미 왜곡이 없는지 한눈에 확인할 수 있습니다."
                    />
                    <ToolInfo 
                      icon={Download} 
                      title="다양한 포맷 내보내기" 
                      description="완성된 번역본을 원본 서식을 최대한 유지하며 워드(.docx)나 일반 텍스트(.txt)로 즉시 저장 가능합니다."
                    />
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-8 py-6 bg-muted/30 border-t border-white/5 flex justify-end">
              <button
                onClick={onClose}
                className="px-10 py-3.5 bg-foreground text-background text-sm font-black rounded-[1.25rem] hover:opacity-90 transition-all shadow-xl shadow-foreground/10"
              >
                가이드 닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;