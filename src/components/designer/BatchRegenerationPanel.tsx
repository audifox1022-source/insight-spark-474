import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, X, Check, Loader2, AlertCircle, 
  ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Presentation } from '@/types/presentation';
import { batchRegenerateSlides, selectAllSlides, selectContentSlides, type BatchRegenProgress } from '@/lib/batch-regeneration';

interface BatchRegenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  onComplete: (updatedPresentation: Presentation) => void;
}

type SelectionMode = 'all' | 'content' | 'custom';

export function BatchRegenerationPanel({ 
  isOpen, onClose, presentation, onComplete 
}: BatchRegenerationPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('content');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [progress, setProgress] = useState<BatchRegenProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const getSelectedIndices = useCallback(() => {
    switch (selectionMode) {
      case 'all': return selectAllSlides(presentation);
      case 'content': return selectContentSlides(presentation);
      case 'custom': return selectedIndices;
      default: return [];
    }
  }, [selectionMode, selectedIndices, presentation]);

  const toggleSlideSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleStart = async () => {
    if (!instruction.trim()) {
      toast.error('재생성 지침을 입력해 주세요.');
      return;
    }

    const indices = getSelectedIndices();
    if (indices.length === 0) {
      toast.error('재생성할 슬라이드를 선택해 주세요.');
      return;
    }

    setIsRunning(true);
    setProgress({
      total: indices.length,
      completed: 0,
      failed: 0,
      current: 0,
      status: 'running',
      errors: [],
    });

    try {
      const abortController = new AbortController();
      const updatedPresentation = await batchRegenerateSlides(
        presentation,
        {
          slideIndices: indices,
          instruction: instruction.trim(),
          parallel: true,
          maxConcurrent: 2,
        },
        (p) => setProgress(p),
        abortController.signal
      );

      onComplete(updatedPresentation);
      toast.success(`${indices.length}개 슬라이드 재생성이 완료되었습니다.`);
      onClose();
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('배치 재생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    if (isRunning) {
      toast.warning('진행 중인 작업이 있습니다. 완료 후 닫아 주세요.');
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[40px] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black">배치 슬라이드 재생성</h2>
                <p className="text-xs text-muted-foreground mt-1">여러 슬라이드를 동시에 재생성합니다</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <label className="text-sm font-bold">재생성 지침</label>
              <Textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="예: 모든 슬라이드의 헤드라인을 더 간결하게 수정하고, 데이터 시각화를 강화해줘."
                className="min-h-[100px] rounded-2xl"
                disabled={isRunning}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold">슬라이드 선택</label>
              <div className="flex gap-2">
                {[
                  { value: 'all' as SelectionMode, label: '전체' },
                  { value: 'content' as SelectionMode, label: '본문만' },
                  { value: 'custom' as SelectionMode, label: '직접 선택' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectionMode(option.value)}
                    disabled={isRunning}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectionMode === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {selectionMode === 'custom' && (
              <div className="space-y-3">
                <label className="text-sm font-bold">슬라이드 선택 ({selectedIndices.length}개 선택됨)</label>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 rounded-xl bg-muted/30">
                  {presentation.slides.map((slide, index) => (
                    <button
                      key={index}
                      onClick={() => toggleSlideSelection(index)}
                      disabled={isRunning}
                      className={`p-3 rounded-xl text-xs font-bold transition-all ${
                        selectedIndices.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {progress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">진행 상황</span>
                  <span className="text-muted-foreground">
                    {progress.completed}/{progress.total} 완료
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${((progress.completed + progress.failed) / progress.total) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" /> {progress.completed} 성공
                  </span>
                  {progress.failed > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-500" /> {progress.failed} 실패
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-border bg-muted/10 flex items-center justify-between">
            <Button variant="ghost" onClick={handleClose} disabled={isRunning}>
              취소
            </Button>
            <Button 
              onClick={handleStart} 
              disabled={isRunning || !instruction.trim()}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isRunning ? '재생성 중...' : '배치 재생성 시작'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
