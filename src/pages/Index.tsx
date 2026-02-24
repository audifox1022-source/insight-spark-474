import { useState } from 'react';
import { usePresentation } from '@/hooks/usePresentation';
import { StepIndicator, getStepGuide } from '@/components/StepIndicator';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import { GeneratingState } from '@/components/GeneratingState';
import { SlideEditor } from '@/components/SlideEditor';
import { HistoryPanel } from '@/components/HistoryPanel';
import { OutlinePreview } from '@/components/OutlinePreview';
import { ChatEditPanel } from '@/components/ChatEditPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight, HelpCircle, LogOut, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false); // ✨ 커스텀 테마 메뉴 상태

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('로그아웃 되었습니다.');
    navigate('/auth', { replace: true });
  };

  const {
    step, setStep,
    dataSummary, fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    outline, isLoadingOutline,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen,
    openHistory, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen,
    reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme, // ✨ 테마 로직
    handleFilesUpload, removeFile,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  } = usePresentation();

  const guide = getStepGuide(step);

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300">
      {/* ── 헤더 ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight">AI 발표자료</h1>
              <p className="text-[11px] text-muted-foreground font-medium">데이터 → 발표자료 자동 생성</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StepIndicator currentStep={step === 'outline' ? 'info' : step as any} />
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            
            <Button variant="ghost" size="sm" onClick={openHistory} className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex">
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">저장 목록</span>
            </Button>
            
            {/* ✨ 테마 변경 드롭다운 메뉴 */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setThemeMenuOpen(!themeMenuOpen)} 
                className="w-9 h-9 text-muted-foreground hover:text-foreground"
                title="테마 색상 변경"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1 overflow-hidden"
                  >
                    <button onClick={() => {changeTheme('blue'); setThemeMenuOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme==='blue' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-border"></div> 블루 (기본)
                    </button>
                    <button onClick={() => {changeTheme('navy'); setThemeMenuOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme==='navy' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-border"></div> 네이비 (기업)
                    </button>
                    <button onClick={() => {changeTheme('purple'); setThemeMenuOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme==='purple' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-border"></div> 퍼플 (크리에이티브)
                    </button>
                    <button onClick={() => {changeTheme('green'); setThemeMenuOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme==='green' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-border"></div> 그린 (친환경)
                    </button>
                    <button onClick={() => {changeTheme('orange'); setThemeMenuOpen(false);}} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme==='orange' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-border"></div> 오렌지 (활력)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button variant="ghost" size="icon" onClick={toggleDark} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="다크 모드 변경">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── 단계 가이드 배너 ── */}
      {step !== 'preview' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="border-b border-border bg-accent/5"
          >
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{guide.title}</p>
                <p className="text-xs text-muted-foreground">{guide.desc}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <main className={`mx-auto px-6 py-10 ${step === 'preview' ? 'max-w-7xl' : 'max-w-6xl'}`}>

        {/* ── 업로드 ── */}
        {step === 'upload' && (
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                <Sparkles className="w-3 h-3" />
                AI 기반 자동 생성
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-tight">
                파일만 올리면
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  발표자료가 완성됩니다
                </span>
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                엑셀, PDF, Word 등 파일을 업로드하면<br className="hidden sm:block" />
                AI가 전문적인 발표 자료를 자동으로 생성합니다
              </p>
            </motion.div>
            <FileUploadZone onFilesSelect={handleFilesUpload} fileNames={fileNames} onRemoveFile={removeFile} />
            {fileNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <Button onClick={() => setStep('info')} size="lg" className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow">
                  다음: 설정하기 <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── 발표자료 설정 ── */}
        {step === 'info' && dataSummary && (
          <div className="space-y-6">
            <PresentationSetupForm
              info={meetingInfo}
              onChange={setMeetingInfo}
              settings={settings}
              onSettingsChange={setSettings}
              onGenerate={requestOutline}
              onBack={() => setStep('upload')}
              isGenerating={isLoadingOutline}
              fileNames={fileNames}
              dataSummary={dataSummary}
            />
          </div>
        )}

        {/* ── 구성안 미리보기 ── */}
        {step === 'outline' && (
          <div className="space-y-6">
            {isLoadingOutline || !outline ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">파일을 분석하고 구성안을 생성하는 중...</p>
              </div>
            ) : (
              <OutlinePreview
                outline={outline}
                isGenerating={isGenerating}
                onConfirm={(approvedOutline) => generatePresentation(approvedOutline)}
                onBack={() => setStep('info')}
              />
            )}
          </div>
        )}

        {/* ── 생성 중 ── */}
        {step === 'generating' && <GeneratingState />}

        {/* ── 슬라이드 에디터 ── */}
        {step === 'preview' && presentation && (
          <SlideEditor
            presentation={presentation}
            onReset={reset}
            onUpdateSlide={updateSlide}
            onAddSlide={addSlide}
            onDeleteSlide={deleteSlide}
            onDuplicateSlide={duplicateSlide}
            onMoveSlide={moveSlide}
            onUpdateTitle={updatePresentationTitle}
            onSave={handleSave}
            isSaving={isSaving}
            onRegenerateSlide={regenerateSlide}
            onOpenChat={() => setChatOpen(true)}
            onOpenReview={() => setReviewOpen(true)}
            onReviewAndFix={reviewAndFixPresentation}
            isFixing={isFixing}
          />
        )}
      </main>

      {/* ── 히스토리 패널 ── */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={savedList}
        isLoading={isLoadingList}
        onLoad={loadFromHistory}
        onDelete={deleteFromHistory}
      />

      {/* ── 채팅 수정 패널 ── */}
      {step === 'preview' && presentation && (
        <ChatEditPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          currentSlide={presentation.slides[0]}
          slideIndex={0}
          onApply={(updatedSlide) => updateSlide(0, updatedSlide)}
          onRequestEdit={requestChatEdit}
        />
      )}

      {/* ── 리뷰 패널 ── */}
      {step === 'preview' && presentation && (
        <ReviewPanel
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          review={reviewResult}
          isLoading={isReviewing}
          onRequestReview={requestReview}
          onGoToSlide={(index) => { setReviewOpen(false); }}
          onApplyFix={applyReviewFix}
        />
      )}

      {/* ── 푸터 ── */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 text-center text-xs text-muted-foreground">
        Made with ❤️ by <span className="font-semibold text-foreground">Hyeon</span> · <a href="mailto:audifox1022@gmail.com" className="hover:text-primary transition-colors underline underline-offset-2">audifox1022@gmail.com</a>
      </footer>
    </div>
  );
};

export default Index;
