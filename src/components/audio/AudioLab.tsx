// ============================================================
// src/components/audio/AudioLab.tsx (Work AI - Professional Audio Intelligence)
// [ARCHITECT UPGRADE] Vercel Blob + Gemini File API 통합 (Max 500MB)
// [CRITICAL FIX] [object File] 데이터 타입 버그 완벽 교정 (v2.1.1)
// [ENGINE] Gemini 2.5 Flash Engine via Secure Proxy (URL Based)
// [TRACE] 업로드 파이프라인 정밀 모니터링 및 UI 연동
// [STABILITY] 100% Full Code Output (김현 님 지침 준수)
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Music, FileAudio, Upload, Loader2, Sparkles, 
  CheckCircle2, AlertCircle, Play, Pause, Trash2, Headphones,
  BarChart3, FileText, Download, Share2, ArrowLeft, History, Settings,
  CloudUpload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { upload } from '@vercel/blob/client'; // [CORE] Vercel Blob 클라이언트 모듈

// components
import { SpeechReport } from './SpeechReport';
import { MusicReport } from './MusicReport';

// service
import { geminiAudioService } from '@/services/ai/geminiAudioService';

// types
import { AnalysisResult, AudioType } from '@/types/audio';

export const AudioLab: React.FC = () => {
  // --- Core States ---
  const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisType, setAnalysisType] = useState<AudioType>('Unknown');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Audio Playback Preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio Context for Realtime Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>();

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // [DEFENSE] 확장자 체크
    if (!file.type.startsWith('audio/')) {
      toast.error("오디오 파일만 분석 가능합니다 (.mp3, .wav 등)");
      return;
    }

    // [UPGRADE] 500MB 파일 용량 제한 (Vercel Blob 아키텍처)
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SIZE) {
      toast.error("500MB 이하의 오디오 파일만 분석할 수 있습니다.");
      return;
    }

    setSelectedFile(file);
    setAnalysisResult(null);
    setError(null);
    setStep('upload');
    setUploadProgress(0);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
  };

  /** [Utility] Web Audio API 시각화 엔진 */
  const initVisualizer = () => {
    if (!audioRef.current || !canvasRef.current) return;

    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current!.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        
        // Gradient Design (Work AI Theme Color)
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#0D9488'); // TEAL-600
        gradient.addColorStop(1, '#2DD4BF'); // TEAL-400
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };

    draw();
  };

  /**
   * [CORE] handleAnalyze - Corrected Robust Pipeline (v2.1.1)
   * 1. Check Auth (Blob Token)
   * 2. Direct Upload to Vercel Blob (Returns URL String)
   * 3. Pass Valid URL STRING to analyzeAudioDeep (Fixes [object File] error)
   */
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    console.log(`[AudioLab] 📤 Initiating Robust Pipeline (Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);

    setStep('analyzing');
    setError(null);
    setUploadProgress(0);
    
    try {
      // 1단계: Vercel Blob 클라이언트 직접 업로드 (Progress 반영)
      console.log("[AudioLab] ☁️ Step 1: Uploading to Vercel Storage...");
      
      let finalBlobUrl = "";
      try {
        const newBlob = await upload(selectedFile.name, selectedFile, {
          access: 'public',
          handleUploadUrl: '/api/upload', // 표준 API 경로로 통합
          onUploadProgress: (progressEvent) => {
            setUploadProgress(progressEvent.percentage);
          },
        });

        // [CRITICAL FIX] URL 확보 시점의 데이터 타입 보장
        if (!newBlob || !newBlob.url || typeof newBlob.url !== 'string') {
          throw new Error("파일 업로드 후 유효한 URL을 획득하지 못했습니다.");
        }
        
        finalBlobUrl = newBlob.url;
        console.log(`[AudioLab] ✅ Step 1 Success: Secured URL -> ${finalBlobUrl}`);
      } catch (uploadErr: any) {
        console.error("Vercel Blob Upload Failure:", uploadErr);
        throw new Error(`파일 업로드에 실패했습니다. (${uploadErr.message})`);
      }

      // 2단계: Gemini File API 프록시 호출 및 분석
      console.log("[AudioLab] 💎 Step 2: Running Gemini Strategic Analysis...");
      
      // [object File] 에러 방지를 위해 업로드한 URL 문자열을 명시적 전달
      const result = await geminiAudioService.analyzeAudioDeep(finalBlobUrl, selectedFile.type);
      
      if (result && result.type) {
        setAnalysisType(result.type);
        setAnalysisResult(result.data);
        setStep('result');
        toast.success(`분석이 성공적으로 완료되었습니다.`);
      } else {
        throw new Error("분석 결과 데이터 구조가 올바르지 않습니다.");
      }
    } catch (err: any) {
      console.error("❌ Audio Lab Failure Track:", err);
      let userFriendlyMsg = err.message || "분석 중 알 수 없는 오류가 발생했습니다.";
      
      // 에러 문구 최적화
      if (err.message?.includes("fetch")) userFriendlyMsg = "네트워크 연결 오류가 발생했습니다.";
      if (err.message?.includes("400")) userFriendlyMsg = "서버로 잘못된 파일 정보가 전달되었습니다.";

      setError(userFriendlyMsg);
      toast.error(userFriendlyMsg, { duration: 6000 });
      setStep('upload'); 
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) { 
        audioRef.current.pause(); 
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else { 
        audioRef.current.play(); 
        initVisualizer();
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }
    setIsPlaying(!isPlaying);
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setAnalysisType('Unknown');
    setError(null);
    setStep('upload');
    setUploadProgress(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  // --- Render Sections ---

  const renderUpload = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-10"
    >
      <header className="text-center space-y-6">
        <div className="flex justify-center mb-4">
           <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm">
             Native Blob Engine v2.1.1 Ready
           </span>
        </div>
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Audio Forensic <br/><span className="text-[#0D9488]">& Strategic Lab</span></h2>
        <p className="text-slate-500 font-bold text-lg max-w-xl mx-auto italic break-keep leading-relaxed border-l-4 border-[#0D9488]/30 pl-6">
          "데이터 파이프라인의 무결성을 확보했습니다. <br/>최대 500MB의 대용량 분석을 지원하는 업계 표준 아키텍처를 경험하세요."
        </p>
      </header>

      {error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
           <AlertCircle className="text-red-500 shrink-0" size={24} />
           <p className="text-sm font-bold text-red-700 break-keep">{error}</p>
        </div>
      )}

      <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3.5rem] overflow-hidden bg-white">
        <CardContent className="p-16">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-96 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 hover:border-[#0D9488]/40 transition-all cursor-pointer group">
              <div className="flex flex-col items-center justify-center">
                <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all mb-10 border border-slate-100">
                  <FileAudio className="w-12 h-12 text-[#0D9488]" />
                </div>
                <p className="text-lg font-black text-slate-800 uppercase tracking-widest text-center">Audio Asset Deployment</p>
                <p className="text-[11px] text-slate-400 font-black mt-4 uppercase tracking-[0.4em]">Drag & Drop or Click to Select</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] text-[#0D9488] font-black tracking-widest uppercase">Blob Engine: Max 500MB</p>
                </div>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
               <div className="p-10 bg-slate-950 rounded-[3rem] shadow-4xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0D9488]/20 via-transparent to-transparent opacity-30 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-8">
                       <div className="w-20 h-20 bg-[#0D9488] rounded-3xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(13,148,136,0.6)] group-hover:rotate-6 transition-transform">
                          <Mic className="w-10 h-10" />
                       </div>
                       <div>
                          <p className="text-lg font-black text-white truncate max-w-[300px] uppercase tracking-tight">{selectedFile.name}</p>
                          <p className="text-[11px] text-[#0D9488] font-black uppercase mt-2 tracking-widest italic">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY_FOR_PIPELINE</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white/20 hover:text-red-500 hover:bg-white/5 rounded-full transition-all" onClick={resetSelection}>
                       <Trash2 size={28} />
                    </Button>
                  </div>

                  <div className="space-y-8 relative z-10">
                     <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-3xl">
                        <canvas ref={canvasRef} width={800} height={100} className="w-full h-24 mb-6 opacity-60" />
                        <div className="flex items-center gap-8">
                           <Button 
                             onClick={togglePlayback}
                             className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-all active:scale-95 shadow-2xl flex items-center justify-center group"
                           >
                             {isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 translate-x-0.5" />}
                           </Button>
                           <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-[#0D9488] to-[#00F2FF] shadow-[0_0_15px_#00F2FF] transition-all duration-300"
                                style={{ width: isPlaying ? '100%' : '0%' }}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                  <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setIsPlaying(false)} className="hidden" />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <Button 
                    className="h-24 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black text-xl rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(13,148,136,0.5)] active:scale-95 transition-all flex items-center gap-4 group"
                    onClick={handleAnalyze}
                  >
                    <CloudUpload className="w-6 h-6 group-hover:animate-bounce" /> START SECURE ANALYTICS
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-24 border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-400 font-extrabold text-lg rounded-[2.5rem] transition-all"
                  >
                    ADVANCED CONFIG
                  </Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12 text-center animate-in fade-in duration-700">
       <div className="relative">
          <div className="absolute inset-0 m-auto w-64 h-64 bg-[#0D9488]/10 rounded-full animate-ping" />
          <Loader2 className="w-32 h-32 stroke-[1px] animate-spin text-[#0D9488]" />
          <CloudUpload className="absolute inset-0 m-auto w-12 h-12 text-[#0D9488] animate-bounce" />
       </div>
       <div className="space-y-8 w-full max-w-md">
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              {uploadProgress < 100 ? "Secure Uploading..." : "Pipeline Analysis..."}
            </h3>
            <p className="text-slate-400 font-bold leading-relaxed italic break-keep text-xs">
              {uploadProgress < 100 
                ? "브라우저에서 Vercel 로컬 스토리지로 데이터를 안전하게 전송 중입니다." 
                : "업로드 성공. Gemini File API 프록시가 데이터 타입을 검증하고 분석을 시작합니다."}
            </p>
          </div>
          
          <div className="space-y-3">
             <div className="flex justify-between text-[10px] font-black text-[#0D9488] uppercase tracking-widest px-1">
                <span>Network: {uploadProgress < 100 ? 'Uploading' : 'Analysing'}</span>
                <span>{uploadProgress.toFixed(1)}%</span>
             </div>
             <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200/50 shadow-inner">
                <motion.div 
                   className="h-full bg-gradient-to-r from-[#0D9488] to-[#2DD4BF] rounded-full shadow-[0_0_10px_rgba(13,148,136,0.5)]" 
                   initial={{ width: 0 }} 
                   animate={{ width: `${uploadProgress}%` }} 
                   transition={{ duration: 0.5 }} 
                 />
             </div>
          </div>
       </div>
    </div>
  );

  const renderResult = () => {
    if (analysisType === 'Speech') {
       return <SpeechReport analysisResult={analysisResult} audioFile={selectedFile || undefined} onBack={() => setStep('upload')} />;
    } else if (analysisType === 'Music') {
       return <MusicReport data={analysisResult} audioFile={selectedFile!} />;
    }
    return null;
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {step !== 'result' && (
        <nav className="w-full h-24 border-b border-slate-100 bg-white flex items-center justify-between px-16 sticky top-0 z-[100] backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#0D9488] rounded-xl flex items-center justify-center text-white">
                    <Headphones size={24} />
                </div>
                <h1 className="text-xl font-black tracking-tighter uppercase">Work AI: Audio Lab</h1>
            </div>
            <div className="flex items-center gap-10">
                <div className="flex gap-6">
                    {['Engine 2.1', '500MB Enabled', 'Pipeline Fixed'].map(item => (
                        <span key={item} className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item}</span>
                    ))}
                </div>
                <div className="w-[1px] h-6 bg-slate-200" />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                    <History size={20} />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                    <Settings size={20} />
                </Button>
            </div>
        </nav>
      )}

      <main className={cn(step === 'result' ? "p-0" : "p-16")}>
         <AnimatePresence mode="wait">
            {step === 'upload' && renderUpload()}
            {step === 'analyzing' && renderAnalyzing()}
            {step === 'result' && renderResult()}
         </AnimatePresence>
      </main>

      {step !== 'result' && (
        <footer className="p-20 text-center border-t border-slate-100 flex flex-col items-center gap-6 grayscale opacity-30 select-none">
            <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-[#0D9488]" />
                <p className="text-[10px] font-black uppercase tracking-[0.8em]">End-to-End Pipeline Integrity Active</p>
            </div>
            <p className="text-[9px] font-bold text-slate-400">© 2026 AI AUDIO LOGISTICS CENTER. ALL RIGHTS RESERVED.</p>
        </footer>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
};

export default AudioLab;
