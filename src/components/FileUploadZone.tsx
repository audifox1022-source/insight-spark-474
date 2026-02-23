import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, FileText, Image, FileType, X } from 'lucide-react';

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

function getFileCategory(name: string): string {
  if (/\.(xlsx|xls)$/i.test(name)) return 'excel';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.docx$/i.test(name)) return 'word';
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  return 'text';
}

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
      className="w-full max-w-xl mx-auto space-y-4"
    >
      <div
        onDragEnter={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-12
          transition-all duration-300 text-center
          ${isDragging
            ? 'border-accent bg-accent/5 scale-[1.02]'
            : 'border-border hover:border-accent/50 hover:bg-muted/50'
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

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Upload className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg text-foreground">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted-foreground mt-1">
              엑셀, PDF, Word, 텍스트, 이미지 등 다양한 형식 지원 · 여러 파일 동시 선택 가능
            </p>
          </div>
        </div>
      </div>

      {fileNames.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">업로드된 파일 ({fileNames.length}개)</p>
          {fileNames.map((name, i) => {
            const category = getFileCategory(name);
            const Icon = FILE_ICON_MAP[category] || FileType;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-card border border-border px-4 py-3 shadow-card">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-success" />
                </div>
                <span className="text-sm font-medium truncate flex-1">{name}</span>
                {onRemoveFile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
