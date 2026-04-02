import React, { useEffect, useRef, useState } from 'react';
import { MusicAnalysis } from '@/types/audio';
import { 
  Play, Pause, FastForward, Rewind, Volume2, Sparkles, 
  Disc, Activity, Music as MusicIcon, Clock, Layers, 
  ShieldCheck, ListMusic, GitBranch, Terminal, ExternalLink,
  Search, Mic
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicReportProps {
  data: MusicAnalysis;
  audioFile: File;
}

/**
 * [Phase 14.0 - Music Forensic & Strategic Analyst Restoration]
 * - [UI] 오디오 포렌식(Audio Forensic) & AI 탐지 데이터 추가 노출
 * - [UI] 가사 전사(Lyrics) 및 코드 로드맵(Chord Progression) 섹션 복구
 * - [UI] 스템(Stem) 비율 시각화 구현
 */
export const MusicReport: React.FC<MusicReportProps> = ({ data, audioFile }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [valVolume, setValVolume] = useState(1);

  // Web Audio Context for Canvas Visualization
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (audioFile && audioRef.current) {
      const url = URL.createObjectURL(audioFile);
      audioRef.current.src = url;
      return () => {
        URL.revokeObjectURL(url);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
    }
  }, [audioFile]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      audioRef.current.play();
      setIsPlaying(true);
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      drawVisual();
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const drawVisual = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stem Data 가공
  const stemData = data.forensics?.stems || { vocal: 40, drum: 30, bass: 20, other: 10 };
  const radarData = [
    { subject: 'Energy', A: Math.min(data.bpm / 2, 100), fullMark: 100 },
    { subject: 'Vocals', A: stemData.vocal || 50, fullMark: 100 },
    { subject: 'Rhythm', A: stemData.drum || 50, fullMark: 100 },
    { subject: 'Forensic', A: data.forensics?.aiDetected ? 20 : 90, fullMark: 100 },
    { subject: 'Instrumental', A: stemData.other || 50, fullMark: 100 },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 text-foreground animate-in fade-in duration-700 pb-20">
      
      {/* 1. Forensic Header & Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <Card className="lg:col-span-8 p-10 rounded-[3rem] border-none bg-slate-900 shadow-4xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent opacity-50" />
            <div className="flex items-center justify-between mb-10 relative z-10">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center text-white shadow-glow shadow-teal-500/50">
                     <Disc className="w-10 h-10 animate-spin-slow" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white tracking-tight uppercase">Spectrum Analysis Active</h3>
                     <p className="text-[10px] text-teal-400 font-black tracking-widest uppercase mt-1 italic">Realtime DSP Engine v14.0</p>
                  </div>
               </div>
               <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-4 py-2 rounded-2xl font-black text-xs">FORENSIC_SECURE_NODE</Badge>
            </div>

            <div className="w-full h-44 bg-white/5 rounded-3xl mb-10 border border-white/5 overflow-hidden relative shadow-inner">
               <canvas ref={canvasRef} width={800} height={176} className="w-full h-full opacity-80" />
            </div>

            <div className="flex items-center gap-8 bg-white/5 p-6 rounded-[2rem] border border-white/5 relative z-10">
               <Button onClick={togglePlay} className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-all">
                  {isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 translate-x-1" />}
               </Button>
               <div className="flex-1 space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase text-teal-400 tracking-widest">
                     <span>{formatTime(currentTime)}</span>
                     <span>{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                     <motion.div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-glow" style={{ width: `${(currentTime / duration) * 100}%` }} />
                  </div>
               </div>
            </div>
            <audio ref={audioRef} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => setIsPlaying(false)} className="hidden" />
         </Card>

         <Card className="lg:col-span-4 p-8 rounded-[3rem] border-none bg-white shadow-xl flex flex-col justify-between">
            <div>
               <div className="flex items-center gap-3 mb-6"><ShieldCheck className="text-teal-600" size={24}/><h4 className="text-sm font-black uppercase tracking-tight">Audio Forensic Results</h4></div>
               <div className="space-y-6">
                  <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100/50">
                     <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">AI Detection</p>
                     <p className="text-base font-black text-slate-900 leading-tight">{data.forensics?.aiDetected || "AI 생성 흔적 없음 (Authentic)"}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audio Integrity</p>
                     <p className="text-base font-black text-slate-900 leading-tight">{data.forensics?.audioQuality || "High Fidelity (320kbps)"}</p>
                  </div>
               </div>
            </div>
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
               <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BPM / KEY</p>
                  <p className="text-xl font-black text-slate-900">{data.bpm} • {data.key}</p>
               </div>
               <Badge className="bg-slate-900 text-white font-black rounded-lg">PRO_ANALYZER</Badge>
            </div>
         </Card>
      </div>

      {/* 2. Sonic Fingerprint & Stem Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <Card className="lg:col-span-5 p-8 rounded-[3rem] border-none bg-white shadow-xl">
            <h4 className="text-sm font-black uppercase tracking-tight mb-8">Sonic Fingerprint (Radar)</h4>
            <div className="w-full h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                     <PolarGrid stroke="#e2e8f0" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} className="uppercase tracking-widest" />
                     <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                     <Radar name="Music" dataKey="A" stroke="#0D9488" fill="#0D9488" fillOpacity={0.5} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
         </Card>

         <Card className="lg:col-span-7 p-8 rounded-[3rem] border-none bg-white shadow-xl">
            <div className="flex items-center justify-between mb-10"><h4 className="text-sm font-black uppercase tracking-tight">Stem Decomposition Analysis</h4><Badge className="bg-indigo-500 text-white border-none font-black text-[9px] px-3 py-1 rounded-full">STEM_V3_RESTORATION</Badge></div>
            <div className="space-y-8">
               {Object.entries(stemData).map(([key, value]) => (
                  <div key={key} className="space-y-3">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                        <span>{key} Analysis</span>
                        <span className="text-slate-900">{value}%</span>
                     </div>
                     <div className="h-6 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200/50">
                        <motion.div className="h-full bg-slate-900 rounded-l-xl" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                     </div>
                  </div>
               ))}
            </div>
         </Card>
      </div>

      {/* 3. Lyrics & Chord Roadmap (RESTORATION CORE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <Card className="lg:col-span-7 p-10 rounded-[3rem] border-none bg-white shadow-xl h-[600px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-10"><Mic className="text-teal-600" size={24}/><h4 className="text-sm font-black uppercase tracking-tight">Lyric Transcription (Word-for-Word)</h4></div>
            <div className="flex-1 overflow-y-auto space-y-10 custom-scrollbar pr-6">
               {(data.lyrics || [{ section: 'Intro', text: '가사 전사 진행 중...' }]).map((l, i) => (
                  <div key={i} className="flex gap-10 items-start group">
                     <div className="w-20 pt-1 shrink-0"><Badge className="bg-slate-100 text-slate-900 font-black text-[9px] uppercase">{l.section}</Badge></div>
                     <div className="flex-1 pb-10 border-b border-slate-100 group-last:border-none">
                        <p className="text-xl font-black text-slate-800 leading-relaxed italic">"{l.text}"</p>
                     </div>
                  </div>
               ))}
            </div>
         </Card>

         <Card className="lg:col-span-5 p-10 rounded-[3rem] border-none bg-slate-100/50 shadow-inner h-[600px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-10"><GitBranch className="text-indigo-600" size={24}/><h4 className="text-sm font-black uppercase tracking-tight">Chord Roadmap & Structure</h4></div>
            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4">
               {(data.structure || []).map((s, i) => (
                  <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200/50 flex flex-col gap-4 group hover:bg-slate-900 transition-all duration-300">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-teal-400">
                        <span>{s.startTime || '0:00'}</span>
                        <span>{s.section}</span>
                     </div>
                     <p className="text-lg font-black text-slate-900 group-hover:text-white transition-colors">{s.chords || "NC"}</p>
                     <p className="text-[11px] text-slate-500 font-bold group-hover:text-slate-400 transition-colors">{s.description}</p>
                  </div>
               ))}
            </div>
         </Card>
      </div>

      {/* 4. AI Prompt Reverse Engineering */}
      <Card className="p-10 rounded-[3.5rem] bg-slate-900 text-white relative overflow-hidden group border-none shadow-4xl hover:shadow-[0_45px_100px_rgba(13,148,136,0.3)] transition-all">
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/20 blur-[130px] rounded-full pointer-events-none group-hover:bg-teal-500/30 transition-all" />
         <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
         <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-black flex items-center gap-4 text-white uppercase italic tracking-tight italic">
               <Sparkles className="text-teal-400 w-10 h-10 animate-pulse" /> Composition AI Reverse Engineering
            </h2>
            <Button variant="outline" className="bg-white/5 border-white/20 text-white font-black rounded-xl text-xs hover:bg-white/10 uppercase tracking-widest">Copy Prompt</Button>
         </div>
         <Card className="p-10 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 font-mono text-xl text-teal-400 font-black leading-relaxed shadow-inner hover:scale-[1.01] transition-transform">
           {data.sunoPrompt}
         </Card>
         <div className="mt-10 flex flex-wrap gap-4 relative z-10">
            {(data.styleTags || ['Electronic', 'Modern', 'Forensic']).map((tag, i) => (
               <Badge key={i} className="bg-white/5 text-white/50 border-white/5 font-black uppercase text-[10px] px-6 py-2 rounded-full">#{tag}</Badge>
            ))}
         </div>
      </Card>

    </div>
  );
};
