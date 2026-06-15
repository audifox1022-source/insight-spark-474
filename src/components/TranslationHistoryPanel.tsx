import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, X, Trash2, Clock, Search, 
  Copy, Check, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  loadTranslationHistory, 
  deleteTranslation, 
  clearTranslationHistory,
  type TranslationHistoryItem 
} from '@/lib/translation-history';

interface TranslationHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: TranslationHistoryItem) => void;
}

export function TranslationHistoryPanel({ 
  isOpen, onClose, onSelect 
}: TranslationHistoryPanelProps) {
  const [items, setItems] = useState<TranslationHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems(loadTranslationHistory());
    }
  }, [isOpen]);

  const filteredItems = searchQuery
    ? items.filter(item => 
        item.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleDelete = (id: string) => {
    deleteTranslation(id);
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('히스토리에서 삭제되었습니다.');
  };

  const handleClearAll = () => {
    if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
      clearTranslationHistory();
      setItems([]);
      toast.success('모든 히스토리가 삭제되었습니다.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('복사되었습니다.');
    setTimeout(() => setCopiedId(null), 2000);
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
          className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[40px] overflow-hidden max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-black">번역 히스토리</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {items.length}개
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 검색 및 액션 */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="pl-10 h-10 rounded-xl"
              />
            </div>
            {items.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-destructive hover:text-destructive"
              >
                전체 삭제
              </Button>
            )}
          </div>

          {/* 히스토리 목록 */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? '검색 결과가 없습니다' : '번역 히스토리가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    className="p-4 rounded-2xl border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.timestamp).toLocaleString('ko-KR')}</span>
                        <span>·</span>
                        <Globe className="w-3 h-3" />
                        <span>{item.sourceLanguage} → {item.targetLanguage}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => handleCopy(item.translatedText, item.id)}
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">원본</p>
                        <p className="text-sm line-clamp-2">{item.sourceText}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/5">
                        <p className="text-xs text-primary mb-1">번역</p>
                        <p className="text-sm line-clamp-2">{item.translatedText}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {item.domain && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {item.domain}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelect(item)}
                        className="text-xs"
                      >
                        이 번역 사용 <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
