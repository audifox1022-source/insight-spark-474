import React, { useState, useRef } from 'react';
import { UploadCloud, Music, Mic, FileAudio, Sparkles, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FileUploadProps {
  onFileSelect: (file: File, language: string) => void;
  isAnalyzing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isAnalyzing }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Korean');
  const inputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { label: '한국어', value: 'Korean' },
    { label: '영어', value: 'English' },
    { label: '일본어', value: 'Japanese' },
    { label: '중국어', value: 'Chinese' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // ── [Safe Guard for Drop Files] ──
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i)) {
          onFileSelect(file, targetLanguage);
        } else {
          alert('오디오 파일(MP3, WAV, M4A 등)만 업로드 가능합니다.');
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ── [Safe Guard for Input Files] ──
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file, targetLanguage);
      }
      if (e.target) e.target.value = ''; // Reset
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 space-y-6">
      {/* [Phase 18] 타겟 언어 선택 영역 */}
      <div className="flex items-center justify-center gap-4 bg-muted/30 p-4 rounded-3xl border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Globe className="w-4 h-4 text-primary" />
          결과 분석 언어 설정:
        </div>
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setTargetLanguage(lang.value)}
              className={cn(
                "px-4 py-2 text-xs font-black rounded-xl transition-all border",
                targetLanguage === lang.value
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div 
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-[380px] rounded-[2.5rem] border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden group",
          isDragOver 
            ? "border-primary bg-primary/5 scale-[1.01] shadow-glow" 
            : "border-border bg-card/40 hover:border-primary/50 hover:bg-card/60 hover:shadow-elevated",
          isAnalyzing ? "opacity-50 pointer-events-none" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={inputRef}
          onChange={handleChange}
          accept="audio/*"
          className="hidden"
        />

        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-48 h-48 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors duration-500" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-[80px] group-hover:bg-accent/10 transition-colors duration-500" />

        <div className="relative z-10 flex flex-col items-center text-center p-8 space-y-8">
          <div className="relative">
            <motion.div 
              className="w-24 h-24 rounded-[1.8rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow z-10 relative"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <UploadCloud className="w-12 h-12 text-white" />
            </motion.div>
            <div className="absolute -top-6 -right-8 text-primary/30 animate-pulse delay-75"><Music className="w-8 h-8" /></div>
            <div className="absolute -bottom-4 -left-10 text-accent/30 animate-bounce delay-150"><Mic className="w-10 h-10" /></div>
            <div className="absolute top-10 -right-16 text-muted-foreground/20 animate-pulse delay-300"><FileAudio className="w-6 h-6" /></div>
          </div>

          <div className="max-w-md">
            <h3 className="text-2xl font-black text-foreground tracking-tight mb-3 flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              오디오 분석 데이터 업로드
            </h3>
            <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
              회의 녹음(음성) 또는 음악 트랙을 업로드하세요. <br/>
              <span className="text-primary/80">40분 이상의 긴 오디오도 건너뛰지 않고 100% 정밀 분석합니다.</span>
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button className="px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98]">
              파일 선택하여 분석 시작
            </button>
            <p className="text-[11px] text-muted-foreground/60 font-medium">선택한 언어로 모든 결과물이 자동 번역됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
