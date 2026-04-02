import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Info, Languages, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateLiveAudio } from '@/services/ai/geminiAudioService';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranslationComplete: (result: any) => void;
  targetLanguage: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranslationComplete, 
  targetLanguage 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 웨이브폼 시각화 로직
  const startVisualizer = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // 오디오 레벨 계산 (데시벨 유사치)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;
        sum += dataArray[i];
        
        // 그라데이션 막대 그리기
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.2)'); // primary light
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.8)'); // primary

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
      setAudioLevel(sum / bufferLength);
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    animationFrameRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stopVisualizer();
        await handleTranslation(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      startVisualizer(stream);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.info('실시간 녹음을 시작합니다. 말씀해 주세요.');
    } catch (err) {
      console.error('Mic access error:', err);
      toast.error('마이크 접근 권한이 필요합니다. 브라우저 설정을 확인해 주세요.');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const handleTranslation = async (blob: Blob) => {
    if (blob.size < 2000) { // 1초 미만 등 너무 짧은 데이터 방지
        toast.error('음성 데이터가 너무 짧거나 인식되지 않았습니다.');
        return;
    }
    
    setIsProcessing(true);
    try {
      const result = await translateLiveAudio(blob, targetLanguage);
      onTranslationComplete(result);
      toast.success('AI 실시간 통역이 완료되었습니다!');
    } catch (err) {
      console.error('Translation error:', err);
      toast.error('통역 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      stopVisualizer();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-10 rounded-[2.5rem] bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
        <Languages className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-black text-primary uppercase tracking-tighter">
          Target: {targetLanguage}
        </span>
      </div>

      <div className="relative flex items-center justify-center w-32 h-32">
        <AnimatePresence>
          {isRecording && (
            <div className="absolute inset-x-0 -inset-y-2 flex items-center justify-center pointer-events-none overflow-visible">
               <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 2, 1], opacity: [0.2, 0, 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute w-32 h-32 bg-primary/30 rounded-full blur-xl"
                />
            </div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl border-4
            ${isRecording 
              ? 'bg-destructive text-white border-white/20 hover:bg-destructive/90 scale-110' 
              : 'bg-white text-primary border-primary/10 hover:shadow-primary/30'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10 text-primary" />
          )}
        </motion.button>
      </div>

      {/* 실시간 웨이브폼 캔버스 */}
      <div className="w-full h-12 flex flex-col items-center justify-center gap-2">
        {isRecording ? (
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={40} 
            className="w-full h-full rounded-lg opacity-80"
          />
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground/40">
            <Volume2 className="w-4 h-4" />
            <div className="w-48 h-[2px] bg-muted/20 rounded-full overflow-hidden">
               <motion.div 
                 animate={isProcessing ? { x: ["-100%", "100%"] } : {}}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                 className={`h-full w-1/2 ${isProcessing ? 'bg-primary' : 'bg-transparent'}`}
               />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center gap-2 min-h-[50px]">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-1"
            >
               <span className="text-sm font-black text-foreground tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-destructive animate-ping" />
                 LIVE {formatTime(recordingTime)}
               </span>
               <span className="text-[10px] text-muted-foreground font-medium">말씀을 멈추고 버튼을 누르면 통역이 시작됩니다.</span>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center gap-1"
            >
               <span className="text-sm font-bold text-primary animate-pulse tracking-tight italic">
                 인공지능이 문맥을 분석하는 중입니다
               </span>
               <div className="flex gap-1">
                 {[1,2,3].map(i => (
                   <motion.div 
                     key={i}
                     animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                     transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                     className="w-1 h-1 rounded-full bg-primary"
                   />
                 ))}
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
               <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] text-center">
                 START VOICE INTERPRETATION
               </div>
               <div className="flex items-center gap-4 text-muted-foreground/40">
                 <div className="flex items-center gap-1 text-[10px] bg-black/5 px-2 py-1 rounded-md">
                   <Info className="w-3 h-3" />
                   CORS Safe Mode Active
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
