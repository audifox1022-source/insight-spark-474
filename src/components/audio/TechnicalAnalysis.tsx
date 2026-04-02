import React, { useEffect, useRef, useState } from 'react';
import Meyda from 'meyda';
import { Activity, Radio, Play, Pause, Zap, BarChart3, TrendingUp, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface TechnicalAnalysisProps {
  audioFile: File;
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ audioFile }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [rms, setRms] = useState<number>(0);
  const [zcr, setZcr] = useState<number>(0);
  const [centroid, setCentroid] = useState<number>(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<any>(null); // Meyda Analyzer

  useEffect(() => {
    if (audioFile && audioRef.current) {
      const url = URL.createObjectURL(audioFile);
      audioRef.current.src = url;
      return () => {
        URL.revokeObjectURL(url);
        if (analyzerRef.current) {
          analyzerRef.current.stop();
        }
      };
    }
  }, [audioFile]);

  const toggleAnalysis = () => {
    if (!audioRef.current) return;
    
    if (audioRef.current.paused) {
      handlePlay();
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      handlePause();
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current) return;
    
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(audioCtxRef.current.destination);

      analyzerRef.current = Meyda.createMeydaAnalyzer({
        audioContext: audioCtxRef.current,
        source: sourceRef.current,
        bufferSize: 512,
        featureExtractors: ['rms', 'zcr', 'spectralCentroid', 'mfcc'],
        callback: (features: any) => {
          setRms(features.rms || 0);
          setZcr(features.zcr || 0);
          setCentroid(features.spectralCentroid || 0);
          drawMfcc(features.mfcc);
        }
      });
    }
    
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    
    analyzerRef.current.start();
  };

  const handlePause = () => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
    }
  };

  const drawMfcc = (mfcc: number[]) => {
    if (!canvasRef.current || !mfcc) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / mfcc.length;
    
    mfcc.forEach((val, i) => {
      // Normalize MFCC value for visualization
      const normalizedHeight = Math.abs(val) * 2.5;
      const x = i * barWidth;
      const y = height / 2 - normalizedHeight / 2;
      
      const gradient = ctx.createLinearGradient(0, y, 0, y + normalizedHeight);
      gradient.addColorStop(0, '#2EC4B6'); // accent
      gradient.addColorStop(1, '#0D5C63'); // primary
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 2, normalizedHeight);
    });
  };

  return (
    <Card className="rounded-[2.5rem] border-border/60 bg-card/60 backdrop-blur-xl p-8 shadow-xl overflow-hidden relative group">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent/15 transition-all" />
      
      <div className="flex justify-between items-center mb-10 flex-wrap gap-6">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner">
               <Cpu className="text-accent w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">DSP Technical Analysis</CardTitle>
              <p className="text-xs text-muted-foreground font-bold mt-1">Real-time Spectral Feature Extraction</p>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <audio 
              ref={audioRef}
              className="hidden"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => { setIsPlaying(false); handlePause(); }}
            />
            <Button 
               onClick={toggleAnalysis}
               className={`rounded-2xl px-6 font-black gap-2 shadow-glow transition-all active:scale-95 ${
                 isPlaying ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary text-white shadow-primary/20'
               }`}
            >
               {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
               {isPlaying ? 'Stop DSP Engine' : 'Start DSP Engine'}
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-muted/30 p-6 rounded-3xl border-border/40 flex flex-col items-center justify-center shadow-inner group/stat hover:border-primary/20 transition-all">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-orange-400" /> RMS Power
          </p>
          <p className="text-3xl font-black text-foreground font-mono tracking-tighter">{rms.toFixed(4)}</p>
          <div className="w-12 h-1 bg-border/40 mt-3 rounded-full overflow-hidden">
             <div className="bg-orange-400 h-full transition-all" style={{ width: `${Math.min(rms * 200, 100)}%` }} />
          </div>
        </Card>

        <Card className="bg-muted/30 p-6 rounded-3xl border-border/40 flex flex-col items-center justify-center shadow-inner group/stat hover:border-accent/20 transition-all">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-accent" /> Zero Crossing
          </p>
          <p className="text-3xl font-black text-accent font-mono tracking-tighter">{zcr.toFixed(0)}</p>
          <div className="w-12 h-1 bg-border/40 mt-3 rounded-full overflow-hidden">
             <div className="bg-accent h-full transition-all" style={{ width: `${Math.min(zcr / 2, 100)}%` }} />
          </div>
        </Card>

        <Card className="bg-muted/30 p-6 rounded-3xl border-border/40 flex flex-col items-center justify-center shadow-inner group/stat hover:border-primary/20 transition-all">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-primary" /> Spectral Centroid
          </p>
          <p className="text-3xl font-black text-primary font-mono tracking-tighter">
            {centroid.toFixed(1)} <span className="text-sm">Hz</span>
          </p>
          <div className="w-12 h-1 bg-border/40 mt-3 rounded-full overflow-hidden">
             <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(centroid / 40, 100)}%` }} />
          </div>
        </Card>
      </div>

      <div className="relative">
        <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mb-4 flex items-center gap-2">
           <BarChart3 className="w-4 h-4 text-primary"/> Timbre Features (MFCC Coefficients)
        </p>
        <div className="w-full h-40 bg-muted/20 border border-border/40 rounded-[2rem] overflow-hidden relative shadow-inner">
          <canvas ref={canvasRef} width={800} height={160} className="w-full h-full" />
          {!isPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/5 animate-pulse">
               <Activity className="w-8 h-8 text-primary/20" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Engine Offline</span>
            </div>
          )}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground font-bold italic opacity-60">
          * Mel-Frequency Cepstral Coefficients는 오디오의 음색(Timbre) 정보를 수치적으로 나타내는 핵심 특징 벡터입니다.
        </p>
      </div>
    </Card>
  );
};
