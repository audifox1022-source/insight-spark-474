import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Globe, Zap, FileText, ArrowRightLeft, Sparkles, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const SectionTitle: React.FC<{ icon: React.ReactNode, children: React.ReactNode }> = ({ icon, children }) => (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{children}</h3>
    </div>
  );

  const StepCard: React.FC<{ number: string, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="group p-5 rounded-3xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all hover:border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white">{number}</span>
        <h4 className="text-sm font-black text-foreground">{title}</h4>
      </div>
      <div className="space-y-2 text-xs text-muted-foreground font-medium leading-relaxed pl-1">
        {children}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-3xl bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-elevated overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">AI 번역 워크스페이스 가이드</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Premium User Manual</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar" style={{ maxHeight: '70vh' }}>
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-2">
                <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                  본 포털은 <span className="text-primary font-black">Gemini 1.5 Pro</span> 기반의 문맥 인지 엔진을 탑재한 전문 번역 환경입니다. 
                  단순 언어 변환을 넘어 산업 도메인을 자동으로 감지하고, 비즈니스 문맥에 최적화된 용어와 문체를 제안합니다.
                </p>
              </div>

              <SectionTitle icon={<Zap className="w-4 h-4" />}>핵심 워크플로우</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StepCard number="01" title="원문 데이터 준비">
                   텍스트를 직접 입력하거나, <span className="text-foreground font-bold">PDF, DOCX, TXT</span> 파일을 업로드하세요. 
                   AI가 문서 구조를 분석하여 최적의 마크다운 형식으로 자동 변환합니다.
                </StepCard>
                <StepCard number="02" title="스마트 번역 및 분석">
                   도착 언어를 선택하고 실행 버튼을 누르면, 실시간으로 <span className="text-primary font-bold">문맥 / 용어 / 문체</span> 3단계 심층 분석이 동시에 진행됩니다.
                </StepCard>
                <StepCard number="03" title="하이라이트 검토">
                   번역 결과 내의 주요 용어는 하이라이트됩니다. <span className="text-accent font-bold">마우스를 올려</span> AI가 왜 해당 번역을 추천했는지 근거를 확인하세요.
                </StepCard>
                <StepCard number="04" title="역번역 및 최종 내보내기">
                   '역번역 검증'을 통해 의미 왜곡 여부를 체크한 후, 편집 모드에서 최종 교정하여 파일로 저장하세요.
                </StepCard>
              </div>

              <SectionTitle icon={<Sparkles className="w-4 h-4" />}>주요 도구 설명</SectionTitle>
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/20 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Pencil className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-foreground mb-1">정교한 마무리를 위한 편집 모드</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">연필 아이콘을 클릭하여 AI가 생성한 번역문을 직접 수정할 수 있습니다. 수정 중에도 분석 패널은 실시간으로 유지됩니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/20 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-foreground mb-1">정확도 보증을 위한 역번역</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">번역된 문장을 다시 원문 언어로 번역하여, 의미가 제대로 전달되었는지 교차 검증할 수 있는 강력한 기능입니다.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-muted/30 border-t border-white/5 flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-primary to-accent text-white text-sm font-black rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
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
�문을 직접 편집할 수 있는 모드로 전환됩니다.
                  </ListItem>
                 <ListItem title="역번역 확인">
                  번역문의 의미가 원문과 일치하는지 검토하고 싶을 때 '역번역 확인' 버튼을 누르면, 번역문을 다시 원문 언어로 번역한 결과를 팝업으로 보여줍니다.
                </ListItem>
                 <ListItem title="복사 및 저장">
                  각 패널 상단의 복사 및 다운로드 아이콘을 사용하여 원문과 번역문을 클립보드에 복사하거나, <strong>.txt</strong> 또는 <strong>.docx</strong> 파일로 저장할 수 있습니다.
                </ListItem>
              </ul>
            </li>
          </ol>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
