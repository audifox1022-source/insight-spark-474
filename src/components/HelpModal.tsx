// ============================================================
// HelpModal.tsx — WorkAI 전체 사용 가이드 (완전 재설계)
// ============================================================
import React, { useEffect } from 'react';
import { X, Sparkles, FileText, Globe, KeyRound, ChevronRight, Zap, AlertCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const Section: React.FC<{ icon: React.ReactNode; title: string; color: string; children: React.ReactNode }> = ({ icon, title, color, children }) => (
    <div className={`rounded-2xl border p-5 space-y-3 ${color}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );

  const Step: React.FC<{ num: number; children: React.ReactNode }> = ({ num, children }) => (
    <div className="flex gap-3 items-start">
      <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{num}</div>
      <p className="leading-relaxed">{children}</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">WorkAI 사용 가이드</h2>
              <p className="text-xs text-muted-foreground">AI 발표자료 · 문서 생성 · 번역 올인원 도구</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 custom-scrollbar">

          {/* ── 1. 발표자료 생성기 */}
          <Section
            icon={<Sparkles className="w-4 h-4 text-white" />}
            title="📊 발표자료 생성기"
            color="bg-primary/5 border-primary/20 text-foreground"
          >
            <Step num={1}>상단 탭에서 <strong>발표자료</strong>를 선택합니다.</Step>
            <Step num={2}>주제를 직접 입력하거나 프리셋(신제품 발표, 업무 보고, 제안서)을 선택하세요.</Step>
            <Step num={3}>파일을 업로드하면 PDF·Word·Excel 내용을 AI가 자동 분석해 슬라이드를 만듭니다.</Step>
            <Step num={4}>생성 후 <strong>자유 편집 모드</strong>에서 텍스트, 표, 이미지를 클릭해 바로 수정할 수 있습니다.</Step>
            <Step num={5}><strong>PPTX 내보내기</strong> 또는 <strong>PDF 내보내기</strong>로 파일을 다운로드하세요.</Step>
            <div className="flex items-start gap-2 bg-primary/10 rounded-xl p-3 mt-1">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary">💡 <strong>AI 채팅 수정</strong>으로 "이 슬라이드를 더 임팩트 있게 바꿔줘"처럼 자연어로 수정을 요청할 수 있습니다.</p>
            </div>
          </Section>

          {/* ── 2. 문서 생성기 */}
          <Section
            icon={<FileText className="w-4 h-4 text-white" />}
            title="📝 문서 생성기 (AI 양식 생성)"
            color="bg-emerald-500/5 border-emerald-500/20 text-foreground"
          >
            <Step num={1}>상단 탭에서 <strong>문서 생성기</strong>를 선택합니다.</Step>
            <Step num={2}>왼쪽에서 양식 종류 (보고서, 계획서, 회의록, 품의서 등)를 선택하거나 직접 입력합니다.</Step>
            <Step num={3}>요청사항에 "결재란 3단계 포함" 같은 세부 조건을 입력하고 <strong>AI 양식 생성</strong>을 클릭합니다.</Step>
            <Step num={4}>우측 라이브 미리보기에서 결과를 확인하고, <strong>HTML 다운로드</strong>로 저장하거나 새 창에서 PDF로 인쇄하세요.</Step>
          </Section>

          {/* ── 3. AI 번역기 */}
          <Section
            icon={<Globe className="w-4 h-4 text-white" />}
            title="🌍 AI 번역기"
            color="bg-violet-500/5 border-violet-500/20 text-foreground"
          >
            <Step num={1}>상단 탭에서 <strong>AI 번역기</strong>를 선택합니다.</Step>
            <Step num={2}>텍스트를 붙여넣거나 .txt · .pdf · .docx 파일을 업로드하세요.</Step>
            <Step num={3}>번역할 언어를 선택하고 <strong>번역 및 분석</strong>을 클릭하면 자동 번역 + AI 분석이 시작됩니다.</Step>
            <Step num={4}>번역 결과에서 하이라이트된 용어에 마우스를 올리면 AI 상세 분석 내용이 나타납니다.</Step>
            <Step num={5}><strong>역번역 확인</strong>으로 영어→한국어 번역의 의미가 잘 전달됐는지 검증하세요.</Step>
          </Section>

          {/* ── 4. API 키 안내 */}
          <Section
            icon={<KeyRound className="w-4 h-4 text-white" />}
            title="🔑 API 키란? (무료로 받는 나만의 AI 전용 통행증)"
            color="bg-amber-500/5 border-amber-500/20 text-foreground"
          >
            <div className="bg-amber-500/10 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>API 키가 없어도 WorkAI를 이용할 수 있습니다.</strong> 단, 많은 사용자가 동시에 접속하면 속도가 느려질 수 있습니다.
              </p>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              API 키는 구글이 제공하는 <strong className="text-foreground">개인 전용 AI 이용권</strong>입니다. 고속도로 전용 차선처럼, 개인 키가 있으면 공용 대기열을 우회해 더 빠르고 안정적으로 AI를 사용할 수 있습니다.
            </p>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">무료 발급 방법:</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline underline-offset-2">aistudio.google.com/app/apikey</a> 접속 (구글 계정 필요)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span><strong className="text-foreground">"Create API Key"</strong> 버튼 클릭 → 키 복사</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>WorkAI 우측 상단 <strong className="text-foreground">🔑 AI 전용 통행권</strong> 버튼 클릭 → 붙여넣기 → 저장</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">• 개인 키는 본인 브라우저에만 저장되며 서버로 전송되지 않습니다 (보안 안전).</p>
          </Section>

        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">WorkAI — AI 기반 올인원 업무 생산성 도구</p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
