import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, X, Trash2, RotateCcw, Clock, 
  ChevronRight, Plus, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Presentation } from '@/types/presentation';
import { 
  createVersion, saveVersion, loadVersions, deleteVersion,
  formatVersionTimestamp, type PresentationVersion 
} from '@/lib/version-management';

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation | null;
  onRestore: (presentation: Presentation) => void;
}

export function VersionHistoryPanel({ 
  isOpen, onClose, presentation, onRestore 
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<PresentationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PresentationVersion | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVersions(loadVersions());
    }
  }, [isOpen]);

  const handleSaveVersion = () => {
    if (!presentation) {
      toast.error('저장할 발표자료가 없습니다.');
      return;
    }
    
    const version = createVersion(presentation, '수동 저장', false);
    saveVersion(version);
    setVersions(loadVersions());
    toast.success('버전이 저장되었습니다.');
  };

  const handleRestore = (version: PresentationVersion) => {
    onRestore(version.data);
    toast.success(`${formatVersionTimestamp(version.timestamp)} 버전으로 복원되었습니다.`);
    onClose();
  };

  const handleDelete = (versionId: string) => {
    deleteVersion(versionId);
    setVersions(loadVersions());
    setSelectedVersion(null);
    toast.success('버전이 삭제되었습니다.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-[40px] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <History className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black">버전 히스토리</h2>
                <p className="text-xs text-muted-foreground mt-1">{versions.length}개 버전 저장됨</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-8 space-y-4">
            <Button 
              onClick={handleSaveVersion} 
              disabled={!presentation}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              현재 상태 저장
            </Button>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {versions.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">저장된 버전이 없습니다</p>
                </div>
              ) : (
                versions.map((version) => (
                  <motion.div
                    key={version.id}
                    layout
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedVersion?.id === version.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                    onClick={() => setSelectedVersion(
                      selectedVersion?.id === version.id ? null : version
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-bold">
                            {formatVersionTimestamp(version.timestamp)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {version.metadata.changeDescription} · {version.metadata.slideCount}장
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        selectedVersion?.id === version.id ? 'rotate-90' : ''
                      }`} />
                    </div>

                    <AnimatePresence>
                      {selectedVersion?.id === version.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-border flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleRestore(version); }}
                              className="gap-2"
                            >
                              <RotateCcw className="w-3 h-3" />
                              복원
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleDelete(version.id); }}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                              삭제
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
