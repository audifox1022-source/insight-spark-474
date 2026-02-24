import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, FileText, Image, FileType, X, Zap, Shield, BarChart3 } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  fileNames: string[];
  onRemoveFile?: (index: number) => void;
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

export function FileUploadZone({ onFilesSelect, fileNames, onRemoveFile }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length) onFilesSelect(files);
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-8"
    >
      {/* 업로드 존 */}
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

        {/* 배경 장식 */}
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
            <p className="font-bold text-lg text-foreground">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted-foreground mt-2">
              엑셀, PDF, Word, 텍스트, 이미지 등 다양한 형식 지원
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {['XLSX', 'PDF', 'DOCX', 'TXT', 'CSV', 'PNG'].map((ext) => (
                <span key={ext} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  .{ext}
                </span>
              ))}
            </div>
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
            업로드된 파일 ({fileNames.length}개)
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

      {/* 기능 소개 카드 */}
      {fileNames.length === 0 && (
        <div className="grid grid-cols-3 gap-4">
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
}
