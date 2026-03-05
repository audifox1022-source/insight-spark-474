import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, FileText, Image, FileType, X, Zap, Shield, BarChart3, Loader2, Sparkles, BookOpen } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  fileNames: string[];
  onRemoveFile?: (index: number) => void;
  
  // ✅ 참고 양식 속성 추가
  onReferenceSelect?: (files: File[]) => void;
  referenceFileName?: string | null;
  onRemoveReference?: () => void;
  isAnalyzingReference?: boolean;
  referenceStructure?: any | null;
}

const FILE_ICON_MAP: Record<string, React.ElementType> = {
  excel: FileSpreadsheet,
  pdf: FileText,
  word: FileText,
  image: Image,
  text: FileType,
};

const FILE_COLORS: Record<string, { bg: string; text: string }> = {
  excel: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  pdf: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  word: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  image: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  text: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

function getFileCategory(name: string): string {
  if (/\.(xlsx|xls)$/i.test(name)) return 'excel';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.docx$/i.test(name)) return 'word';
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  return 'text';
}

const FEATURES = [
  { icon: Zap, title: 'AI 자동 구성', desc: '데이터 구조를 분석해 최적의 슬라이드를 설계합니다' },
  { icon: BarChart3, title: '차트 자동 생성', desc: '숫자 데이터를 인식해 적절한 차트로 시각화합니다' },
  { icon: Shield, title: '기업 수준 품질', desc: '전문적인 디자인과 일관된 브랜딩이 적용됩니다' },
];

export const FileUploadZone = React.forwardRef<HTMLDivElement, FileUploadZoneProps>(function FileUploadZone({ 
  onFilesSelect, fileNames, onRemoveFile,
  onReferenceSelect, referenceFileName, onRemoveReference, isAnalyzingReference, referenceStructure
}, ref) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFilesSelect(files);
  }, [onFilesSelect]);

  const handleRefDrag = useCallback((e: React.DragEvent, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRef(entering);
  }, []);

  const handleRefDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingRef(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length && onReferenceSelect) onReferenceSelect(files);
  }, [onReferenceSelect]);

  const handleClick = () => inputRef.current?.click();
  const handleRefClick = () => refInputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length) onFilesSelect(files);
    e.target.value = '';
  };

  const handleRefInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !onReferenceSelect) return;
    const files = Array.from(e.target.files);
    if (files.length) onReferenceSelect(files);
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-8"
      ref={ref}
    >
      {/* 원본 파일 업로드 존 */}
      <div
        onDragEnter={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-14
          transition-all duration-300 text-center group
          ${isDragging
            ? 'border-accent bg-accent/5 scale-[1.01] shadow-glow'
            : 'border-border hover:border-accent/50 hover:bg-muted/30 hover:shadow-elevated'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.md,.json,.xml,.html,.png,.jpg,.jpeg,.gif,.webp,.svg,.yaml,.yml,.log"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent/5 group-hover:bg-accent/10 transition-colors duration-500" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
        </div>

        <div className="flex flex-col items-center gap-5 relative">
          <motion.div
            className="w-18 h-18 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Upload className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <div>
            <p className="font-bold text-lg text-foreground">원본 데이터를 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted-foreground mt-2">
              엑셀, PDF, Word, 텍스트, 이미지 등 다양한 형식 지원
            </p>
          </div>
        </div>
      </div>

      {/* 파일 목록 */}
      {fileNames.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
            업로드된 원본 데이터 ({fileNames.length}개)
          </p>
          {fileNames.map((name, i) => {
            const category = getFileCategory(name);
            const Icon = FILE_ICON_MAP[category] || FileType;
            const colors = FILE_COLORS[category] || FILE_COLORS.text;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
                </div>
                <span className="text-sm font-medium truncate flex-1">{name}</span>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {category.toUpperCase()}
                </span>
                {onRemoveFile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ✅ 추가된 참고 양식 업로드 존 (원본 데이터가 1개 이상 있을 때만 표시) */}
      {fileNames.length > 0 && onReferenceSelect && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 pt-6 border-t border-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">참고 양식 업로드 (선택사항)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            기존에 작성하셨던 유사한 형태의 PPT 문서나 텍스트를 올려주시면, AI가 해당 양식의 목차 흐름과 글쓰기 스타일을 분석하여 새 문서에 똑같이 적용합니다.
          </p>

          {!referenceFileName ? (
            <div
              onDragEnter={(e) => handleRefDrag(e, true)}
              onDragLeave={(e) => handleRefDrag(e, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleRefDrop}
              onClick={handleRefClick}
              className={`
                relative cursor-pointer rounded-xl border border-dashed p-6
                transition-all duration-300 flex items-center justify-center gap-3
                ${isDraggingRef
                  ? 'border-primary bg-primary/5 shadow-inner'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
              `}
            >
              <input
                ref={refInputRef}
                type="file"
                accept=".pptx,.pdf,.docx,.txt"
                onChange={handleRefInputChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">참고 양식 드래그 앤 드롭 또는 클릭</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PPT, PDF, Word 등을 지원합니다.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm relative overflow-hidden">
              {isAnalyzingReference && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-xs font-bold text-primary">양식 구조 및 스타일 심층 분석 중...</span>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{referenceFileName}</p>
                    <p className="text-[10px] text-muted-foreground">참고 양식</p>
                  </div>
                </div>
                {!isAnalyzingReference && onRemoveReference && (
                  <button onClick={onRemoveReference} className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {referenceStructure && !isAnalyzingReference && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-card rounded-lg p-3 text-xs border border-primary/20 space-y-2 mt-3"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> 분석 완료! 이 스타일로 생성합니다
                    </div>
                    <p><span className="font-semibold opacity-70">스토리라인:</span> {referenceStructure.storyline}</p>
                    <p><span className="font-semibold opacity-70">텍스트 밀도:</span> {referenceStructure.textDensity}</p>
                    <p><span className="font-semibold opacity-70">톤앤매너:</span> {referenceStructure.toneAndManner}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* 기능 소개 카드 */}
      {fileNames.length === 0 && (
        <div className="grid grid-cols-3 gap-4 mt-8">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="text-center p-5 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow group/card"
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-colors">
                <f.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
});
