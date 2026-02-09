import { usePresentation } from '@/hooks/usePresentation';
import { StepIndicator } from '@/components/StepIndicator';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MeetingInfoForm } from '@/components/MeetingInfoForm';
import { GeneratingState } from '@/components/GeneratingState';
import { PresentationPreview } from '@/components/PresentationPreview';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  const {
    step, setStep,
    excelData, fileNames,
    meetingInfo, setMeetingInfo,
    presentation, isGenerating,
    handleFilesUpload, removeFile, generatePresentation, reset,
  } = usePresentation();

  return (
    <div className="min-h-screen gradient-surface">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">가스원단위 절감 TFT</h1>
              <p className="text-xs text-muted-foreground">발표자료 생성 시스템</p>
            </div>
          </div>
          <StepIndicator currentStep={step} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {step === 'upload' && (
          <div className="space-y-8">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">
                엑셀 데이터로
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  발표자료를 자동 생성
                </span>
              </h2>
              <p className="text-muted-foreground mt-3">
                가스원단위 실적 데이터를 업로드하면 대표이사 보고용 발표 자료를 생성합니다
              </p>
            </div>
            <FileUploadZone
              onFilesSelect={handleFilesUpload}
              fileNames={fileNames}
              onRemoveFile={removeFile}
            />
            {fileNames.length > 0 && (
              <div className="flex justify-center">
                <Button onClick={() => setStep('info')} className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90">
                  다음 단계로
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'info' && excelData && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">회의 정보 입력</h2>
              <p className="text-sm text-muted-foreground mt-1">발표 자료에 포함될 기본 정보를 입력해주세요</p>
            </div>
            <MeetingInfoForm
              info={meetingInfo}
              onChange={setMeetingInfo}
              onGenerate={generatePresentation}
              onBack={() => setStep('upload')}
              isGenerating={isGenerating}
              fileNames={fileNames}
              dataSummary={excelData.summary}
            />
          </div>
        )}

        {step === 'generating' && <GeneratingState />}

        {step === 'preview' && presentation && (
          <PresentationPreview presentation={presentation} onReset={reset} />
        )}
      </main>
    </div>
  );
};

export default Index;
