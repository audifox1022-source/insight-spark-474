import { motion, AnimatePresence } from 'framer-motion';
import { SavedPresentation } from '@/lib/presentation-storage';
import { Button } from '@/components/ui/button';
import { X, Trash2, FolderOpen, Clock, Loader2 } from 'lucide-react';

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  items: SavedPresentation[];
  isLoading: boolean;
  onLoad: (item: SavedPresentation) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function HistoryPanel({ open, onClose, items, isLoading, onLoad, onDelete }: HistoryPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          {/* 사이드패널 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-elevated z-50 flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">저장된 발표자료</span>
                {items.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {items.length}
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={onClose} className="w-7 h-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">저장된 발표자료가 없습니다</p>
                  <p className="text-xs text-muted-foreground">발표자료 생성 후 저장 버튼을 눌러보세요</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/60 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">
                        {item.title}
                      </p>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(item.updatedAt)}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        · {item.slides?.length ?? 0}장
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onLoad(item)}
                      className="w-full h-7 text-xs"
                    >
                      불러오기
                    </Button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
