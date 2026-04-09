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
 * [CRITICAL UPDATE] AUDIO LAB WORKSPACE - PURE SERVERLESS AUTH (v2.6.4)
 * [FIX] handleUploadUrl: '/api/upload' 강제 매핑 및 Vercel Node.js 규격 준수
 * [DEBUG] 상세 핸드셰이크 트레이싱
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
   * [교정된 핵심 로직] handleAudioUpload (v2.6.4 Pure Serverless Auth)
   * 1. 🔑 Vercel Handshake: /api/upload 서버리스 함수를 통해 업로드 권한 획득
   * 2. 📤 Direct Portal: 획득한 토큰으로 Vercel Blob 전송
   */
  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    
    console.log(`[Blob Handshake] 🚀 Workspace: Vercel Auth Sequence Initiated...`);
    console.log(`[Blob Handshake] 📁 Data: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    setAudioFile(file);
    setIsAnalyzing(true);
    setAnalysisResult(null); 
    setUploadProgress(0);
    
    const toastId = toast.loading('보안 토큰 인가 대기 중...');
    
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let blobUrl = "";

    try {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`[Blob Handshake] ☁️ Contacting /api/upload (${retryCount + 1}/${MAX_RETRIES})...`);
          
          /**
           * [@vercel/blob upload() 상세 동작]
           * handleUploadUrl: 루트 /api 폴더의 upload.js 핸들러와 통신합니다.
           */
          const blobResult = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload', // [CRITICAL] 서버리스 핸드셰이크 엔드포인트 고정
            onUploadProgress: (progressEvent) => {
              setUploadProgress(progressEvent.percentage);
            },
          });

          if (!blobResult || !blobResult.url) {
            throw new Error("Handshake succeeded but Blob URL is undefined.");
          }
          
          blobUrl = blobResult.url;
          console.log(`[Blob Handshake] 🤝 Workspace Auth Success! URL: ${blobUrl}`);
          toast.loading('Gemini 2.5 Flash 인텔리전스 분석 가동 중...', { id: toastId });
          break; 
        } catch (uploadErr: any) {
          retryCount++;
          console.error(`[Blob Handshake] ❌ Auth Attempt Failed:`, uploadErr.message);
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`핸드셰이크 최종 실패: ${uploadErr.message}. Vercel 대시보드 설정을 확인하세요.`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!blobUrl) throw new Error("업로드 파이프라인 무결성 장애");
      
      const result = await geminiAudioService.analyzeAudioDeep(blobUrl, file.type);
      
      setAnalysisResult(result);
      setIsAnalyzing(false);
      toast.success('오디오 분석 보고서가 생성되었습니다.', { id: toastId });
    } catch (error: any) {
      console.error("Audio Lab Pipeline Critical Failure:", error);
      let userFriendlyMsg = error.message || '오디오 처리 중 알 수 없는 오류가 발생했습니다.';
      
      if (error.message?.toLowerCase().includes("cors")) {
        userFriendlyMsg = "CORS 차단: Vercel 서버리스 함수(/api/upload)의 헤더 응답을 확인할 수 없습니다.";
      } else if (error.message?.includes("400")) {
        userFriendlyMsg = "인증 에러(400): 서버리스 함수가 요청을 거부했습니다. API 리미트 혹은 토큰 유효성을 확인하세요.";
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0D9488] to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              AI AUDIO LAB
              <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 uppercase tracking-widest leading-none">v2.6.4 Pure Serverless</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold italic">Managed Vercel Auth Pipeline (Authorized Only)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-[#0D9488]" /> 가이드
          </button>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <Button onClick={downloadPDF} className="h-11 px-5 rounded-xl bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black gap-2 shadow-lg shadow-teal-500/20">
                <Download className="w-4 h-4" /> 리포트 저장
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
                  { icon: <Mic />, title: "Forensic Speech", desc: "긴 대화나 회의록에서 화자를 완벽하게 분리하고 핵심 맥락을 추출합니다." },
                  { icon: <Music />, title: "Musical DNA", desc: "곡의 구조, 분위기, 장르를 분석하고 음악적 인사이트를 제공합니다." },
                  { icon: <CloudUpload />, title: "Serverless Auth", desc: "/api/upload 서버리스 함수를 통한 강력한 보안 업로드 시스템을 갖췄습니다." }
                ].map((item, i) => (
                  <div key={i} className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-[#0D9488] dark:text-teal-400 flex items-center justify-center mb-5 shrink-0">
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
                <div className="w-32 h-32 border-4 border-slate-100 dark:border-slate-800 border-t-[#0D9488] rounded-full animate-spin" />
                <CloudUpload className="absolute inset-0 m-auto w-12 h-12 text-[#0D9488] animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 animate-pulse">
                {uploadProgress < 100 ? `인증 및 데이터 전송 중 (${uploadProgress.toFixed(0)}%)` : "인공지능 디코딩 중..."}
              </h3>
              <p className="text-slate-500 font-bold max-w-sm italic text-xs uppercase tracking-widest">
                {uploadProgress < 100 
                  ? "Vercel 서버리스 함수를 통해 보안 토큰을 승인받고 있습니다." 
                  : "업로드 성공. Gemini 2.5 Flash가 오디오 지문을 분석하고 있습니다."}
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
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Pure Serverless Handshake</h4>
                  <p className="text-sm text-slate-500 font-medium">Vercel 루트 /api 폴더의 upload.js를 통해 업로드 권한을 관리합니다. 대량의 데이터를 안전하게 클라우드에 배치합니다.</p>
               </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg">알겠습니다</Button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
