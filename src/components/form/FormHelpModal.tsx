import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Sparkles, LayoutList, Type,
  Download, Edit3, Settings2
} from 'lucide-react';

interface FormHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormHelpModal: React.FC<FormHelpModalProps> = ({ isOpen, onClose }) => {
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
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">AI 문서 생성기 사용 가이드</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Smart Document Generator</p>
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
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">문서 생성 프로세스</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StepCard number="01" title="양식 및 내용 입력">
                      원하는 문서 양식을 선택하고, 포함되어야 할 세부 <strong>요청사항</strong>을 자유롭게 입력합니다.
                    </StepCard>
                    <StepCard number="02" title="AI 초안 생성">
                      입력된 정보를 바탕으로 AI가 즉시 한국어 비즈니스 환경에 맞는 <strong>최적화된 HTML 양식</strong>을 만듭니다.
                    </StepCard>
                    <StepCard number="03" title="자유 편집 & 서식">
                      생성된 문서를 직접 클릭하여 <strong>무료 텍스트 입력 및 서식(굵게, 형광펜 등) 변경</strong>을 통해 정교하게 다듬습니다.
                    </StepCard>
                    <StepCard number="04" title="저장 및 내보내기">
                      '완성 미리보기'로 결과물을 확인한 뒤 <strong>HTML로 직접 다운로드</strong>하여 실무에 바로 활용하세요.
                    </StepCard>
                  </div>
                </section>

                {/* Features Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">주요 기능 안내</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToolInfo 
                      icon={Settings2} 
                      title="고급 설정 (Compact & Auto-fill)" 
                      description="Compact Layout으로 표 간격을 좁혀 한 페이지에 많은 정보를 담거나, Auto-fill로 실제와 유사한 더미 데이터를 미리 채울 수 있습니다."
                    />
                    <ToolInfo 
                      icon={Edit3} 
                      title="직접 편집 모드 (리치 텍스트)" 
                      description="단순 조회용이 아닌, Google Docs처럼 텍스트를 클릭해 직접 지우거나 쓰면서 레이아웃을 마음대로 변경할 수 있습니다."
                    />
                    <ToolInfo 
                      icon={Sparkles} 
                      title="AI 수정 요청" 
                      description="수동 편집이 번거로울 땐 '결재란 한 칸 더 추가해줘' 같이 말로만 설명하면 AI가 구조를 알아서 개선해 줍니다."
                    />
                    <ToolInfo 
                      icon={LayoutList} 
                      title="완성 미리보기 모드" 
                      description="편집을 가이드하는 흐린 테두리와 커서를 숨기고 인쇄 시의 깔끔한 결과물과 동일한 클린 뷰를 제공합니다."
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
