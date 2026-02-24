import { usePresentation } from '@/hooks/usePresentation';
import { StepIndicator } from '@/components/StepIndicator';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import { GeneratingState } from '@/components/GeneratingState';
import { SlideEditor } from '@/components/SlideEditor';
import { HistoryPanel } from '@/components/HistoryPanel';
import { OutlinePreview } from '@/components/OutlinePreview';
import { ChatEditPanel } from '@/components/ChatEditPanel';
import { Sparkles, Moon, Sun, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
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
    isDark, toggleDark,
    handleFilesUpload, removeFile,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  } = usePresentation();

  return (
    <div className="min-h-screen gradient-surface">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">AI 발표자료 생성기</h1>
              <p className="text-xs text-muted-foreground">파일 업로드 → 자동 슬라이드 완성</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StepIndicator currentStep={step === 'outline' ? 'info' : step as any} />
            <Button variant="outline" size="sm" onClick={openHistory} className="gap-2 hidden sm:flex">
              <FolderOpen className="w-4 h-4" />
              저장 목록
            </Button>
            <Button variant="outline" size="sm" onClick={toggleDark} className="w-9 h-9 p-0">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* 업로드 */}
        {step === 'upload' && (
          <div className="space-y-8">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">
                파일만 올리면
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  발표자료가 완성됩니다
                </span>
              </h2>
              <p className="text-muted-foreground mt-3">
                엑셀, PDF, Word, 텍스트, 이미지 등 다양한 파일을 업로드하면 AI가 발표 자료를 자동 생성합니다
              </p>
            </div>
            <FileUploadZone onFilesSelect={handleFilesUpload} fileNames={fileNames} onRemoveFile={removeFile} />
            {fileNames.length > 0 && (
              <div className="flex justify-center">
                <Button onClick={() => setStep('info')} className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-8 py-5 text-base">
                  다음 단계로 <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 발표자료 설정 */}
        {step === 'info' && dataSummary && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">발표자료 설정</h2>
              <p className="text-sm text-muted-foreground mt-1">템플릿을 선택하거나 AI가 자동으로 구성을 제안합니다</p>
            </div>
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

        {/* 구성안 미리보기 */}
        {step === 'outline' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">구성안 확인</h2>
              <p className="text-sm text-muted-foreground mt-1">AI가 제안한 슬라이드 구성을 확인하고 수정하세요</p>
            </div>
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

        {/* 생성 중 */}
        {step === 'generating' && <GeneratingState />}

        {/* 슬라이드 에디터 */}
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
          />
        )}
      </main>

      {/* 히스토리 패널 */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={savedList}
        isLoading={isLoadingList}
        onLoad={loadFromHistory}
        onDelete={deleteFromHistory}
      />

      {/* 채팅 수정 패널 */}
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
    </div>
  );
};

export default Index;
