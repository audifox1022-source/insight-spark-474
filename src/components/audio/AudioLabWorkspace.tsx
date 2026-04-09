import React, { useState, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { 
  Download, Loader2, RefreshCcw, Headphones, 
  AlertCircle, Sparkles, FileAudio, Layout,
  HelpCircle, X, CheckCircle2, Music, Mic, Globe, FileText, Clock,
  CloudUpload
} from 'lucide-react';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { upload } from '@vercel/blob/client'; 
import { geminiAudioService } from '@/services/ai/geminiAudioService';
import { useAudioStore } from '@/store/useAudioStore';
import { SpeechReport } from './SpeechReport';
import { MusicReport } from './MusicReport';
import { TechnicalAnalysis } from './TechnicalAnalysis';

/**
 * [CRITICAL UPDATE] AUDIO LAB WORKSPACE - ROBUST HANDSHAKE (v2.6.3)
 * [FIX] Local & Prod Handshake synchronization (/api/upload)
 * [DEBUG] Step-by-Step HANDSHAKE Trace
 * [STABILITY] Retry Limit (Max 3) & Full Code Output
 */
export const AudioLabWorkspace = () => {
  const { 
    isAnalyzing, 
    analysisResult, 
    audioFile, 
    setIsAnalyzing, 
    setAnalysisResult, 
    setAudioFile, 
    reset 
  } = useAudioStore();

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const reportRef = useRef<HTMLDivElement>(null);

  /**
   * [교정된 핵심 로직] handleAudioUpload (v2.6.3 Robust Handshake)
   * 1. 🔑 Handshake: /api/upload 엔드포인트를 통해 업로드 토큰을 획득합니다.
   * 2. 📤 Direct Portal: 획득한 토큰으로 Vercel Blob에 직접 데이터를 전송합니다.
   */
  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    
    console.log(`[Blob Handshake] 🚀 Workspace Handshake Initiated...`);
    console.log(`[Blob Handshake] 📁 Target: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    setAudioFile(file);
    setIsAnalyzing(true);
    setAnalysisResult(null); 
    setUploadProgress(0);
    
    const toastId = toast.loading('서버와 보안 핸드셰이크 시도 중...');
    
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let blobUrl = "";

    try {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`[Blob Handshake] ☁️ Attempting Auth (${retryCount + 1}/${MAX_RETRIES})...`);
          
          /**
           * @vercel/blob upload() 상세 동작:
           * handleUploadUrl 옵션이 지정되면 내부적으로 서버에 토큰 발급을 먼저 요청합니다.
           */
          const blobResult = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload', // [CRITICAL] 핸드셰이크 엔드포인트
            onUploadProgress: (progressEvent) => {
              setUploadProgress(progressEvent.percentage);
            },
          });

          if (!blobResult || !blobResult.url) {
            throw new Error("Handshake succeeded but URL is undefined.");
          }
          
          blobUrl = blobResult.url;
          console.log(`[Blob Handshake] 🤝 Success! Secured Portal: ${blobUrl}`);
          toast.loading('AI 오디오 인텔리전스 분석을 시작합니다...', { id: toastId });
          break; 
        } catch (uploadErr: any) {
          retryCount++;
          console.error(`[Blob Handshake] ❌ Failed:`, uploadErr.message);
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`핸드셰이크 최종 실패: ${uploadErr.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!blobUrl) throw new Error("업로드 파이프라인 무결성 오류");
      
      const result = await geminiAudioService.analyzeAudioDeep(blobUrl, file.type);
      
      setAnalysisResult(result);
      setIsAnalyzing(false);
      toast.success('인텔리전스 분석이 완료되었습니다.', { id: toastId });
    } catch (error: any) {
      console.error("Audio Lab Pipeline Failure:", error);
      let userFriendlyMsg = error.message || '분석 중 오류가 발생했습니다.';
      
      if (error.message?.toLowerCase().includes("cors")) {
        userFriendlyMsg = "CORS 정책 차단: 로컬 서버(/api/upload)의 헤더 설정을 확인하세요.";
      } else if (error.message?.includes("400")) {
        userFriendlyMsg = "핸드셰이크 에러(400): 서버가 요청한 토큰 발급을 거부했습니다.";
      }
      
      toast.error(userFriendlyMsg, { id: toastId });
      setIsAnalyzing(false); 
    }
  };

  /**
   * 리포트 다운로드 (PDF)
   */
  const downloadPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `WorkAI_Audio_Report_${audioFile?.name || 'result'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(reportRef.current).save();
  };

  /**
   * 분석 결과에 따른 리포트 컴포넌트 렌더링
   */
  const renderReport = () => {
    if (!analysisResult) return null;

    const data = analysisResult.data;
    const type = analysisResult.type;
    
    if (type === 'Speech') {
      return (
        <SpeechReport 
          analysisResult={data} 
          audioFile={audioFile || undefined}
          onBack={reset}
        />
      );
    }

    if (type === 'Music') {
      return (
        <MusicReport 
          data={data} 
          audioFile={audioFile!} 
        />
      );
    }

    return (
      <TechnicalAnalysis 
        audioFile={audioFile!}
      />
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar text-slate-900 dark:text-slate-100 relative">
      <div className="flex-shrink-0 flex items-center justify-between px-10 py-7 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              AI AUDIO LAB
              <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 uppercase tracking-widest leading-none">v2.6.3 Robust</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold">오디오 업로드 핸드셰이크 파이프라인 (Local/Cloud Sync)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-teal-500" /> 가이드
          </button>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <Button onClick={downloadPDF} className="h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black gap-2 shadow-lg shadow-teal-500/20">
                <Download className="w-4 h-4" /> PDF 리포트
              </Button>
              <Button onClick={reset} variant="outline" className="w-11 h-11 p-0 rounded-xl border-slate-200 dark:border-slate-800">
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col overflow-x-hidden">
        <AnimatePresence mode="wait">
          {!isAnalyzing && !analysisResult && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-12 py-20 px-10 max-w-6xl mx-auto w-full"
            >
              <FileUpload onFileSelect={handleAudioUpload} isAnalyzing={isAnalyzing} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {[
                  { icon: <Mic />, title: "음성/회의 분석", desc: "긴 회의록이나 대화 음성을 1:1로 인식하여 핵심 맥락을 요약하고 화자를 구분합니다." },
                  { icon: <Music />, title: "정밀 음악 판별", desc: "곡의 분위기와 장르, 주요 악기성을 분석하고 작곡용 AI 프롬프트를 생성합니다." },
                  { icon: <CloudUpload />, title: "Secured Handshake", desc: "서버와의 1:1 토큰 핸드셰이크를 통해 업로드 권한을 획득하고 데이터를 전송합니다." }
                ].map((item, i) => (
                  <div key={i} className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5 shrink-0">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40 text-center px-10"
            >
              <div className="relative mb-10">
                <div className="w-32 h-32 border-4 border-slate-100 dark:border-slate-800 border-t-teal-500 rounded-full animate-spin" />
                <CloudUpload className="absolute inset-0 m-auto w-12 h-12 text-teal-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 animate-pulse">
                {uploadProgress < 100 ? `핸드셰이크 및 업로드 중 (${uploadProgress.toFixed(0)}%)` : "AI 인텔리전스 분석 중..."}
              </h3>
              <p className="text-slate-500 font-bold max-w-sm">
                {uploadProgress < 100 
                  ? "서버로부터 업로드 권한(Token)을 획득하고 클라우드로 전송 중입니다." 
                  : "업로드 성공. Gemini 2.5 Flash가 오디오 맥락을 분석하고 있습니다."}
              </p>
            </motion.div>
          )}

          {analysisResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full h-full"
            >
              <div ref={reportRef} className="w-full">
                {renderReport()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <HelpPopup open={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};

const HelpPopup = ({ open, onClose }: { open: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg p-10 shadow-2xl space-y-8 relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">AUDIO LAB Guide</h2>
          </div>
          <div className="space-y-6">
            <div className="flex gap-5">
               <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0"><Globe className="w-6 h-6" /></div>
               <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">핸드셰이크 보안</h4>
                  <p className="text-sm text-slate-500 font-medium">서버 측에서 허가된 파일만 클라우드에 업로드할 수 있도록 강력한 보안 핸드셰이크를 지원합니다.</p>
               </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg">확인했습니다</Button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
