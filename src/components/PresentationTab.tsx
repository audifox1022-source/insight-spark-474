import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, MessageSquare, Send, PencilLine, UploadCloud, SlidersHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { usePresentation } from '@/hooks/usePresentation';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import { GeneratingState } from '@/components/GeneratingState';
import { SlideEditor } from '@/components/SlideEditor';
import { HistoryPanel } from '@/components/HistoryPanel';
import { OutlinePreview } from '@/components/OutlinePreview';
import { ChatEditPanel } from '@/components/ChatEditPanel';
import { ReviewPanel } from '@/components/ReviewPanel';

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] };
type Preset = {
  id: string; icon: string; label: string;
  fields: PresetField[];
  generate: (data: Record<string, string>) => string;
};

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'newproduct', icon: '🚀', label: '신제품 발표',
    fields: [
      { id: 'topic', label: '제품명/서비스명', placeholder: 'B2B SaaS 플랫폼', suggestions: ['B2B SaaS', 'AI 어시스턴트'] },
      { id: 'target', label: '타겟 고객', placeholder: 'HR 담당자', suggestions: ['2030세대', 'HR담당자', 'IT팀', 'MZ세대'] },
      { id: 'goal', label: '핵심 목표', placeholder: '도입 2배 증가', suggestions: ['매출 20%', '비용 10% 절감', '효율 30% 향상'] },
    ],
    generate: d => `${d.topic} 신제품 발표자료. 타겟: ${d.target}. 목표: ${d.goal}`,
  },
  {
    id: 'report', icon: '📊', label: '업무 보고',
    fields: [
      { id: 'period', label: '보고 기간', placeholder: '2025년 1분기', suggestions: ['2026년 1분기', '상반기', '2025년'] },
      { id: 'achievement', label: '주요 성과', placeholder: '매출 25% 달성', suggestions: ['매출 25% 달성', '고객 1만명 돌파', 'NPS 15점 상승'] },
      { id: 'plan', label: 'Next Step', placeholder: '다음 분기 계획 2가지', suggestions: ['시장 확대', '신규 채용', '제품 개선'] },
    ],
    generate: d => `${d.period} 업무 보고. 성과: ${d.achievement}. Next Step: ${d.plan}`,
  },
  {
    id: 'proposal', icon: '🤝', label: '제안서',
    fields: [
      { id: 'client', label: '고객사', placeholder: 'A사 IT팀', suggestions: ['A사', 'B그룹', 'C공사'] },
      { id: 'solution', label: '제안 솔루션', placeholder: 'AI 자동화', suggestions: ['RPA 도입', 'AI 전환', '클라우드 마이그레이션'] },
      { id: 'benefit', label: '기대 Benefit', placeholder: '비용 30% 절감', suggestions: ['ROI 300%', '시간 50% 단축', '오류 5분의1 감소'] },
    ],
    generate: d => `${d.client} 대상 ${d.solution} 제안서. 기대효과: ${d.benefit}`,
  },
];

type PresentationHooks = ReturnType<typeof usePresentation>;

interface PresentationTabProps extends PresentationHooks {}

export function PresentationTab(props: PresentationTabProps) {
  const [activePresetId, setActivePresetId] = useState<string>('manual');
  const [presetData, setPresetData] = useState<Record<string, string>>({});
  const [manualPrompt, setManualPrompt] = useState('');

  const activePreset = PROMPT_PRESETS.find(p => p.id === activePresetId);

  const {
    step, setStep,
    dataSummary, fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    template, setTemplate,
    outline, isLoadingOutline,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen, currentChatSlideIndex,
    reviewOpen, setReviewOpen,
    reviewResult, isReviewing,
    requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    handleFilesUpload, removeFile,
    handlePromptSubmit,
    requestOutline, generatePresentation,
    regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout,
    updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide, updateAllSlides, addSlide,
    deleteSlide, duplicateSlide,
    moveSlide, splitSlide, updatePresentationTitle,

    referenceFileName,
    isAnalyzingReference,
    referenceStructure,
    handleReferenceFileUpload,
    clearReferenceFile,
    currentSlideIndex, setCurrentSlideIndex,
    selectedText, setSelectedText, handleFactCheck,
    brandKit,
  } = props;

  return (
    <>
      <main className={[
        'mx-auto transition-all duration-300 w-full overflow-y-auto',
        step === 'preview' ? 'max-w-full h-full p-2 sm:p-4' : 'max-w-6xl px-6 py-8',
      ].join(' ')}>
        
        {/* STEP: upload */}
        {step === 'upload' && (
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                <Sparkles className="w-3 h-3" /> AI 발표자료 생성기
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-tight">
                WorkAI로<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  발표자료 자동 생성
                </span>
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                주제를 입력하거나 파일을 올리면<br className="hidden sm:block" />
                PDF·Word 등 모든 자료를 분석해 완성도 높은 발표자료를 만들어 드립니다.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-3xl mx-auto space-y-4"
            >
              {/* 프리셋 탭 */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4 p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
                <button
                  onClick={() => setActivePresetId('manual')}
                  className={[
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                    activePresetId === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <PencilLine className="w-4 h-4" /> 직접 입력
                </button>
                {PROMPT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => { setActivePresetId(preset.id); setPresetData({}) }}
                    className={[
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                      activePresetId === preset.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* 입력 영역 */}
              <AnimatePresence mode="wait">
                {activePreset ? (
                  <motion.div
                    key={activePreset.id}
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-glow space-y-6"
                  >
                    <div className="space-y-5">
                      {activePreset.fields.map(field => (
                        <div key={field.id} className="space-y-2.5">
                          <label className="text-sm font-bold text-foreground">{field.label}</label>
                          <div className="flex flex-wrap gap-2">
                            {field.suggestions.map(sug => (
                              <button
                                key={sug}
                                onClick={() => setPresetData(p => ({ ...p, [field.id]: sug }))}
                                className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-left"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                          <Input
                            value={presetData[field.id] ?? ''}
                            onChange={e => setPresetData(p => ({ ...p, [field.id]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="bg-background h-11"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-border">
                      <Button
                        onClick={() => handlePromptSubmit(activePreset.generate(presetData))}
                        className="w-full h-14 rounded-xl gap-2 gradient-primary border-0 text-white font-bold text-base shadow-sm"
                      >
                        <Sparkles className="w-5 h-5" /> AI 발표자료 생성
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4"
                  >
                    <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-glow flex items-start gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1 mt-1">
                        <MessageSquare className="w-6 h-6 text-primary" />
                      </div>
                      <Textarea
                        value={manualPrompt}
                        onChange={e => setManualPrompt(e.target.value)}
                        placeholder="예) 2026년 상반기 생산 실적 보고서 / 태웅 15000톤 프레스 가동 현황..."
                        className="flex-1 min-h-[60px] max-h-[240px] border-0 bg-transparent shadow-none focus-visible:ring-0 text-base font-medium px-2 py-3 resize-none leading-relaxed"
                        rows={manualPrompt.split('\n').length > 1 ? Math.min(manualPrompt.split('\n').length, 8) : 2}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handlePromptSubmit(manualPrompt)
                          }
                        }}
                      />
                      <Button
                        onClick={() => handlePromptSubmit(manualPrompt)}
                        disabled={!manualPrompt.trim()}
                        className="h-14 rounded-xl px-6 gap-2 gradient-primary border-0 text-white font-bold mt-1 shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 구분선 */}
              <div className="relative flex items-center justify-center py-2 max-w-3xl mx-auto">
                <div className="border-t border-border absolute w-full" />
                <span className="bg-background px-4 text-sm text-muted-foreground font-medium relative z-10">또는 파일 업로드</span>
              </div>

              <FileUploadZone
                onFilesSelect={handleFilesUpload}
                fileNames={fileNames}
                onRemoveFile={removeFile}
                onReferenceSelect={handleReferenceFileUpload}
                referenceFileName={referenceFileName}
                onRemoveReference={clearReferenceFile}
                isAnalyzingReference={isAnalyzingReference}
                referenceStructure={referenceStructure}
              />

              {fileNames.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                  <Button
                    onClick={() => setStep('info')}
                    size="lg"
                    className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow"
                  >
                    다음 단계로 <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* STEP: info */}
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
              template={template}
              setTemplate={setTemplate}
              referenceFileName={referenceFileName}
              isAnalyzingReference={isAnalyzingReference}
              referenceStructure={referenceStructure}
              onReferenceFileUpload={handleReferenceFileUpload}
              onClearReferenceFile={clearReferenceFile}
            />
          </div>
        )}

        {/* STEP: outline */}
        {step === 'outline' && (
          <div className="space-y-6">
            {isLoadingOutline && !outline ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">목차를 구성하고 있습니다…</p>
              </div>
            ) : (
              <OutlinePreview
                outline={outline!}
                isGenerating={isGenerating}
                onConfirm={(approvedOutline) => generatePresentation(approvedOutline)}
                onBack={() => setStep('info')}
              />
            )}
          </div>
        )}

        {/* STEP: generating */}
        {step === 'generating' && <GeneratingState />}

        {/* STEP: preview (슬라이드 에디터) */}
        {step === 'preview' && presentation && (
          <SlideEditor
            presentation={presentation}
            currentSlide={currentSlideIndex}
            onSlideChange={setCurrentSlideIndex}
            onReset={reset}
            onUpdateSlide={updateSlide}
            onUpdateAllSlides={updateAllSlides}
            onAddSlide={addSlide}
            onDeleteSlide={deleteSlide}
            onDuplicateSlide={duplicateSlide}
            onMoveSlide={moveSlide}
            onSplitSlide={splitSlide}
            onUpdateTitle={updatePresentationTitle}
            onSave={handleSave}
            isSaving={isSaving}
            onRegenerateSlide={regenerateSlide}
            onOpenChat={() => setChatOpen(true)}
            onOpenReview={() => setReviewOpen(true)}
            onReviewAndFix={reviewAndFixPresentation}
            isFixing={isFixing}
            onChangePersona={changeSlidePersona}
            onCycleLayout={cycleLayout}
            updatePresentationMaster={updatePresentationMaster}
            isGeneratingImage={isGeneratingImage}
            generateSlideImage={generateSlideImage}

            selectedText={selectedText}
            onSelectText={setSelectedText}
            onClearSelectedText={() => setSelectedText(undefined)}
            onFactCheck={handleFactCheck}

            onAddContent={(idx) => {
              const newContent = [...(presentation.slides[idx].content || []), '새 항목'];
              updateSlide(idx, { content: newContent });
            }}
            onRemoveContent={(sIdx, cIdx) => {
              const newContent = presentation.slides[sIdx].content?.filter((_, i) => i !== cIdx);
              updateSlide(sIdx, { content: newContent });
            }}

            onOpenExport={async (format?: string) => {
              toast.loading('문서를 생성 중입니다...', { id: 'export' });
              try {
                const { exportToPdf, exportToPptxAsImage, exportToPptx } = await import('@/lib/export-presentation');

                if (format === 'pdf') {
                  await exportToPdf(presentation);
                } else if (format === 'pptx-image') {
                  await exportToPptxAsImage(presentation);
                } else {
                  await exportToPptx(presentation, brandKit); // brandKit 전달
                }

                toast.success('다운로드가 완료되었습니다!', { id: 'export' });
              } catch (error) {
                console.error(error);
                toast.error('내보내기 중 오류가 발생했습니다.', { id: 'export' });
              }
            }}
          />
        )}
      </main>

      {/* 히스토리 / 채팅 / 리뷰 패널 */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={savedList}
        isLoading={isLoadingList}
        onLoad={loadFromHistory}
        onDelete={deleteFromHistory}
      />
      {step === 'preview' && presentation && (
        <>
          <ChatEditPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            currentSlide={presentation.slides[currentChatSlideIndex || 0]}
            slideIndex={currentChatSlideIndex || 0}
            onApply={(updatedSlide) => updateSlide(currentChatSlideIndex || 0, updatedSlide)}
            onRequestEdit={requestChatEdit}
            selectedText={selectedText}
            onClearSelectedText={() => setSelectedText(undefined)}
            onFactCheck={handleFactCheck}
          />
          <ReviewPanel
            open={reviewOpen}
            onClose={() => setReviewOpen(false)}
            review={reviewResult}
            isLoading={isReviewing}
            onRequestReview={requestReview}
            onGoToSlide={() => setReviewOpen(false)}
            onApplyFix={applyReviewFix}
          />
        </>
      )}
    </>
  );
}
