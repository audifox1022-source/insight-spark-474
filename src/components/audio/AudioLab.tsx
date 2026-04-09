// ============================================================
// src/components/audio/AudioLab.tsx (Work AI - Professional Audio Intelligence)
// [ARCHITECT UPGRADE] Client-Only Upload Pipeline Standardization (v2.12.0)
// [CRITICAL] REMOVED: Server-side 'put' functions & Health Check interrogation
// [CRITICAL] FIXED: Direct upload to Vercel internal API CORS/400 bug
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\src\components\audio\AudioLab.tsx
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
import { upload } from '@vercel/blob/client'; // [CORE] 클라이언트 전용 업로드 패키지 확정 (v2.12.0)

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

    if (!file.type.startsWith('audio/')) {
      toast.error("오디오 파일만 분석 가능합니다 (.mp3, .wav 등)");
      return;
    }

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
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#0D9488');
        gradient.addColorStop(1, '#2DD4BF');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };
    draw();
  };

  /**
   * [CORE] handleAnalyze - Client-Only Upload Pipeline (v2.12.0)
   * 🔑 1. [DELETED] Health Check: 불필요한 서버 심문 로직 제거
   * 🔑 2. Deep Sanitization: 파일명 세탁 적용
   * 🔑 3. Standard Client Upload: @vercel/blob/client 기반의 정석적인 호출
   */
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    // --- [1] DEEP SANITIZATION (파일명 세탁) ---
    // 한글 및 특수문자로 인한 URL 인코딩 에러 방지를 위해 영어/숫자로 파일명 재조립
    const ext = selectedFile.name.split('.').pop() || 'm4a';
    const safeFileName = `audio_${Date.now()}.${ext}`;
    const safeFile = new File([selectedFile], safeFileName, { type: selectedFile.type });

    console.log(`[Blob Upload] 🚀 Phase 1: Initiating Client-Side Sanitized Pipeline...`);
    console.log(`[Blob Upload] 🧼 Original: ${selectedFile.name} -> Sanitized: ${safeFileName}`);

    setStep('analyzing');
    setError(null);
    setUploadProgress(0);
    
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let finalBlobUrl = "";

    try {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`[Blob Upload] ☁️ Attempting Handshake (${retryCount + 1}/${MAX_RETRIES})...`);
          
          // [CRITICAL] 반드시 @vercel/blob/client의 upload 함수를 사용
          // handleUploadUrl로 지정된 /api/upload 핸드셰이크 엔드포인트를 통해 토큰을 발급받음
          const newBlob = await upload(safeFileName, safeFile, {
            access: 'public',
            handleUploadUrl: `${window.location.origin}/api/upload`, 
            onUploadProgress: (progressEvent) => {
              setUploadProgress(progressEvent.percentage);
            },
          });

          if (!newBlob || !newBlob.url) {
            throw new Error("Blob conversion yielded null response or missing URL.");
          }
          
          finalBlobUrl = newBlob.url;
          console.log(`[Blob Upload] ✅ Success! Secure Portal URL: ${finalBlobUrl}`);
          break; 
        } catch (uploadErr: any) {
          retryCount++;
          console.error(`[Blob Upload] ❌ 업로드 라우트 통신 실패 (시도 ${retryCount}):`, uploadErr);
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`업로드 통신 최종 실패: ${uploadErr.message}. 서버리스 함수(/api/upload) 상태를 확인하십시오.`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!finalBlobUrl) throw new Error("최종 업로드 URL 인가 실패");
      
      console.log("[Blob Upload] 💎 Phase 2: Passing to Gemini Forensic Engine...");
      const result = await geminiAudioService.analyzeAudioDeep(finalBlobUrl, selectedFile.type);
      
      if (result && result.type) {
        setAnalysisType(result.type);
        setAnalysisResult(result.data);
        setStep('result');
        toast.success(`오디오 분석 보고서가 생성되었습니다.`);
      } else {
        throw new Error("Gemini 분석 결과 구조가 비정상적입니다.");
      }
    } catch (err: any) {
      console.error("❌ Audio Lab Final Failure:", err);
      setError(err.message || "오디오 처리 중 오류가 발생했습니다.");
      toast.error(err.message || "오디오 처리 중 오류가 발생했습니다.");
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

  const renderUpload = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-10">
      <header className="text-center space-y-6">
        <div className="flex justify-center mb-4"><span className="bg-teal-100 text-teal-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-200 shadow-sm">Client-Only Pipeline v2.12.0</span></div>
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Audio Forensic <br/><span className="text-[#0D9488]">& Strategic Lab</span></h2>
        <p className="text-slate-500 font-bold text-lg max-w-xl mx-auto italic break-keep leading-relaxed border-l-4 border-[#0D9488]/30 pl-6">"클라이언트 전용 업로드 파이프라인(v2.12.0)을 통해 <br/>안전하고 견고하게 오디오 자산을 배포합니다."</p>
      </header>

      {error && <div className="p-6 bg-red-50 border border-red-200 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4"><AlertCircle className="text-red-500 shrink-0" size={24} /><p className="text-sm font-bold text-red-700 break-keep">{error}</p></div>}

      <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3.5rem] overflow-hidden bg-white">
        <CardContent className="p-16">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-96 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 hover:border-[#0D9488]/40 transition-all cursor-pointer group">
              <div className="flex flex-col items-center justify-center">
                <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all mb-10 border border-slate-100"><FileAudio className="w-12 h-12 text-[#0D9488]" /></div>
                <p className="text-lg font-black text-slate-800 uppercase tracking-widest text-center">Audio Asset Deployment</p>
                <div className="flex items-center gap-2 mt-4"><span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" /><p className="text-[9px] text-[#0D9488] font-black tracking-widest uppercase">Vercel Blob Client Pipeline Active</p></div>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
               <div className="p-10 bg-slate-950 rounded-[3rem] shadow-4xl relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-8">
                       <div className="w-20 h-20 bg-[#0D9488] rounded-3xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(13,148,136,0.6)] group-hover:rotate-6 transition-transform"><Mic className="w-10 h-10" /></div>
                       <div><p className="text-lg font-black text-white truncate max-w-[300px] uppercase tracking-tight">{selectedFile.name}</p><p className="text-[11px] text-[#0D9488] font-black uppercase mt-2 tracking-widest italic">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY_FOR_UPLOAD</p></div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white/20 hover:text-red-500 hover:bg-white/5 rounded-full transition-all" onClick={resetSelection}><Trash2 size={28} /></Button>
                  </div>
                  <div className="space-y-8 relative z-10">
                     <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-3xl">
                        <canvas ref={canvasRef} width={800} height={100} className="w-full h-24 mb-6 opacity-60" />
                        <div className="flex items-center gap-8">
                           <Button onClick={togglePlayback} className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-all active:scale-95 shadow-2xl flex items-center justify-center group">{isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 translate-x-0.5" />}</Button>
                           <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-[#0D9488] to-[#00F2FF] shadow-[0_0_15px_#00F2FF] transition-all duration-300" style={{ width: isPlaying ? '100%' : '0%' }}/></div>
                        </div>
                     </div>
                  </div>
                  <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setIsPlaying(false)} className="hidden" />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <Button className="h-24 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black text-xl rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(13,148,136,0.5)] active:scale-95 transition-all flex items-center gap-4 group" onClick={handleAnalyze}><CloudUpload className="w-6 h-6 group-hover:animate-bounce" /> START DEPLOYMENT</Button>
                  <Button variant="outline" className="h-24 border-2 border-slate-200 text-slate-400 font-extrabold text-lg rounded-[2.5rem] transition-all">ANALYSIS PARAMS</Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12 text-center animate-in fade-in duration-700">
       <div className="relative"><Loader2 className="w-32 h-32 stroke-[1px] animate-spin text-[#0D9488]" /><CloudUpload className="absolute inset-0 m-auto w-12 h-12 text-[#0D9488] animate-bounce" /></div>
       <div className="space-y-8 w-full max-w-md">
          <div className="space-y-2"><h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{uploadProgress < 100 ? "Uploading Asset..." : "Forensic Decoding..."}</h3><p className="text-slate-400 font-bold leading-relaxed italic break-keep text-[11px] uppercase tracking-wider">{uploadProgress < 100 ? "Vercel Blob 클라이언트 핸드셰이크를 통해 오디오 파일을 안전하게 전송 중입니다." : "파일 업로드 완료. Gemini 2.5 Flash가 오디오 지문을 분석 중입니다."}</p></div>
          <div className="space-y-3"><div className="flex justify-between text-[10px] font-black text-[#0D9488] uppercase tracking-widest px-1"><span>{uploadProgress < 100 ? 'Uploading' : 'Decoding'}</span><span>{uploadProgress.toFixed(1)}%</span></div><div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200/50 shadow-inner"><motion.div className="h-full bg-gradient-to-r from-[#0D9488] to-[#2DD4BF] rounded-full shadow-[0_0_10px_rgba(13,148,136,0.5)]" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.5 }} /></div></div>
       </div>
    </div>
  );

  const renderResult = () => {
    if (analysisType === 'Speech') return <SpeechReport analysisResult={analysisResult} audioFile={selectedFile || undefined} onBack={() => setStep('upload')} />;
    if (analysisType === 'Music') return <MusicReport data={analysisResult} audioFile={selectedFile!} />;
    return null;
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {step !== 'result' && (
        <nav className="w-full h-24 border-b border-slate-100 bg-white flex items-center justify-between px-16 sticky top-0 z-[100] backdrop-blur-md">
            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-[#0D9488] rounded-xl flex items-center justify-center text-white"><Headphones size={24} /></div><h1 className="text-xl font-black tracking-tighter uppercase">Work AI: Audio Lab</h1></div>
        </nav>
      )}
      <main className={cn(step === 'result' ? "p-0" : "p-16")}>
         <AnimatePresence mode="wait">
            {step === 'upload' && renderUpload()}
            {step === 'analyzing' && renderAnalyzing()}
            {step === 'result' && renderResult()}
         </AnimatePresence>
      </main>
    </div>
  );
};

export default AudioLab;
