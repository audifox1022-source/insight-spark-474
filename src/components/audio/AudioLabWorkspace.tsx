// ============================================================
// src/components/audio/AudioLabWorkspace.tsx (Work AI - Professional Audio Intelligence)
// [ARCHITECT UPGRADE] Vercel Blob Sanitized Handshake (v2.10.0)
// [CRITICAL] Deep Sanitization: Washing Hangeul/Special Chars from Filenames
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\src\components\audio\AudioLabWorkspace.tsx
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Music, FileAudio, Upload, Loader2, Sparkles, 
  CheckCircle2, AlertCircle, Play, Pause, Trash2, Headphones,
  BarChart3, FileText, Download, Share2, ArrowLeft, History, Settings,
  CloudUpload, Maximize2, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { upload } from '@vercel/blob/client';

// components
import { SpeechReport } from './SpeechReport';
import { MusicReport } from './MusicReport';

// service
import { geminiAudioService } from '@/services/ai/geminiAudioService';

// types
import { AnalysisResult, AudioType } from '@/types/audio';

export const AudioLabWorkspace: React.FC = () => {
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

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error("오디오 파일만 분석 가능합니다.");
      return;
    }

    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SIZE) {
      toast.error("500MB 이하의 오디오 파일만 분석 가능합니다.");
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

  /**
   * [CORE] handleAnalyze - Sanitized Handshake Pipeline (v2.10.0)
   * 🔑 1. 원본 파일의 한글/특수문자 이름을 제거하기 위한 세탁(Laundering) 적용
   * 🔑 2. handleUploadUrl 절대 경로화로 안정성 확보
   */
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    // --- [DEEP SANITIZATION] 한글 파일명 인코딩 문제 원천 봉쇄 ---
    const ext = selectedFile.name.split('.').pop() || 'm4a';
    const safeFileName = `audio_${Date.now()}.${ext}`;
    // 원본 데이터(blob)는 유지하되, 이름만 영어/숫자로 세탁된 새로운 File 객체 생성
    const safeFile = new File([selectedFile], safeFileName, { type: selectedFile.type });

    console.log(`[Blob Workspace Handshake] 🚀 Phase 1: Initiating Sanitized Connection...`);
    console.log(`[Blob Workspace Handshake] 🧼 Original: ${selectedFile.name} -> Sanitized: ${safeFileName}`);

    setStep('analyzing');
    setError(null);
    setUploadProgress(0);
    
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let finalBlobUrl = "";

    try {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`[Blob Workspace Handshake] ☁️ Attempting Handshake (${retryCount + 1}/${MAX_RETRIES})...`);
          
          // [CRITICAL] handleUploadUrl을 브라우저 기준 절대 경로로 고정하여 라우팅 가로채기 방지
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
          console.log(`[Blob Workspace Handshake] ✅ Success! Secure Portal URL: ${finalBlobUrl}`);
          break; 
        } catch (uploadErr: any) {
          retryCount++;
          console.error(`[Blob Workspace Handshake] ❌ 업로드 라우트 통신 실패 (시도 ${retryCount}):`);
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`업로드 라우트 최종 실패: ${uploadErr.message}. 한글 파일명 세탁 후에도 문제가 발생한다면 서버의 절대 경로 설정을 확인하십시오.`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!finalBlobUrl) throw new Error("최종 업로드 URL 인가 실패");
      
      console.log("[Blob Workspace Handshake] 💎 Phase 2: Passing to Gemini Forensic Engine...");
      const result = await geminiAudioService.analyzeAudioDeep(finalBlobUrl, selectedFile.type);
      
      if (result && result.type) {
        setAnalysisType(result.type);
        setAnalysisResult(result.data);
        setStep('result');
        toast.success(`분석이 성공적으로 완료되었습니다.`);
      } else {
        throw new Error("Gemini 분석 결과 구조가 비정상적입니다.");
      }
    } catch (err: any) {
      console.error("❌ Audio Lab Workspace Final Failure:", err);
      setError(err.message || "오디오 처리 중 오류가 발생했습니다.");
      toast.error(err.message || "오디오 처리 중 오류가 발생했습니다.");
      setStep('upload'); 
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } 
    else { audioRef.current.play(); }
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
  };

  const renderUpload = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
               Audio Workspace <span className="bg-teal-500 text-white text-[10px] px-2 py-1 rounded italic not-italic font-black">v2.10.0</span>
            </h2>
            <p className="text-slate-400 font-bold text-sm tracking-tight italic border-l-2 border-teal-500 pl-3">"파일명 세탁(Sanitization) 및 절대 경로 핸드셰이크가 적용된 작업 공간"</p>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-400 font-black text-xs h-10 px-4 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest"><Maximize2 size={14} className="mr-2" /> Expand</Button>
            <Button variant="outline" className="border-teal-500/20 text-teal-600 font-black text-xs h-10 px-4 rounded-xl hover:bg-teal-50 transition-all uppercase tracking-widest"><ShieldCheck size={14} className="mr-2" /> Sanitized Handshake</Button>
         </div>
      </div>

      {error && <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4 animate-bounce"><AlertCircle className="text-red-500 shrink-0" size={20} /><p className="text-sm font-black text-red-700">{error}</p></div>}

      <Card className="border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden bg-white border-2">
        <CardContent className="p-12">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-slate-50 rounded-[2.5rem] bg-slate-50/30 hover:bg-slate-50 hover:border-teal-500/30 transition-all cursor-pointer group">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-105 transition-all border border-slate-50"><Upload className="w-10 h-10 text-teal-600" /></div>
                <div className="text-center space-y-1">
                   <p className="text-lg font-black text-slate-800 tracking-tighter uppercase">Drop Audio Resource</p>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Safe Upload with Sanitized Encoding Enabled</p>
                </div>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-5">
               <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-3xl text-white relative group overflow-hidden">
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(13,148,136,0.4)]"><Mic className="w-8 h-8" /></div>
                       <div><p className="font-black text-white truncate max-w-[250px] uppercase tracking-tight italic">{selectedFile.name}</p><p className="text-[10px] text-teal-400 font-bold uppercase mt-1 tracking-widest italic">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY_TO_SANITIZE</p></div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white/20 hover:text-red-500 hover:bg-white/5 rounded-full transition-all" onClick={resetSelection}><Trash2 size={24} /></Button>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                     <div className="flex items-center gap-6">
                        <Button onClick={togglePlayback} className="w-12 h-12 bg-teal-600 hover:bg-teal-500 text-white rounded-full transition-all active:scale-90 shadow-xl flex items-center justify-center">{isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}</Button>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: isPlaying ? '100%' : '0%' }}/></div>
                     </div>
                  </div>
                  <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setIsPlaying(false)} className="hidden" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <Button className="h-20 bg-teal-600 hover:bg-teal-700 text-white font-black text-lg rounded-[2rem] shadow-xl active:scale-95 transition-all flex items-center gap-3 uppercase italic tracking-tighter" onClick={handleAnalyze}><CloudUpload className="w-5 h-5" /> START SANITIZED_LLM_AUTH</Button>
                  <Button variant="outline" className="h-20 border-2 border-slate-100 text-slate-400 font-black text-md rounded-[2rem] transition-all hover:bg-slate-50 uppercase tracking-widest italic" onClick={resetSelection}>Change Asset</Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-3 gap-6">
          {[
            { icon: <ShieldCheck size={20} />, label: "Secured Auth", desc: "Absolute /api Path" },
            { icon: <Sparkles size={20} />, label: "Gemini 2.5", desc: "Expert Inference" },
            { icon: <FileText size={20} />, label: "Deep Forensic", desc: "Detailed Reports" }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
               <p className="font-black text-slate-800 text-xs uppercase tracking-widest mb-1 italic">{item.label}</p>
               <p className="text-[10px] text-slate-400 font-bold italic">{item.desc}</p>
            </div>
          ))}
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-10 text-center">
       <div className="relative"><Loader2 className="w-24 h-24 stroke-[1px] animate-spin text-teal-600 font-thin italic" /><CloudUpload className="absolute inset-0 m-auto w-10 h-10 text-teal-600 animate-pulse" /></div>
       <div className="space-y-6 w-full max-w-sm">
          <div className="space-y-2"><h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{uploadProgress < 100 ? "Cleaning & Syncing..." : "Decoding Forensics..."}</h3><p className="text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">{uploadProgress < 100 ? "파일명 특수문지 클리닝 및 절대 경로 연동 중..." : "Gemini Engine이 오디오 메타데이터를 정밀 분석 중입니다."}</p></div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100"><motion.div className="h-full bg-teal-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} /></div>
       </div>
    </div>
  );

  const renderResult = () => {
    if (analysisType === 'Speech') return <SpeechReport analysisResult={analysisResult} audioFile={selectedFile || undefined} onBack={() => setStep('upload')} />;
    if (analysisType === 'Music') return <MusicReport data={analysisResult} audioFile={selectedFile!} />;
    return null;
  };

  return (
    <div className="p-8">
       <AnimatePresence mode="wait">
          {step === 'upload' && renderUpload()}
          {step === 'analyzing' && renderAnalyzing()}
          {step === 'result' && renderResult()}
       </AnimatePresence>
    </div>
  );
};

export default AudioLabWorkspace;
