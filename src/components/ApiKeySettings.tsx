import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, ExternalLink, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePresentation } from '@/hooks/usePresentation';
import { toast } from 'sonner';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const { geminiApiKey, setGeminiApiKey } = usePresentation();
  const [apiKey, setApiKey] = useState(geminiApiKey);
  
  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setApiKey(geminiApiKey);
    }
  }, [isOpen, geminiApiKey]);

  const handleSave = () => {
    setGeminiApiKey(apiKey.trim());
    toast.success('API 키가 저장되었습니다.');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleDelete = () => {
    setApiKey('');
    setGeminiApiKey('');
    toast.success('API 키가 삭제되었습니다. 기본 설정(앱 제공) 키를 사용합니다.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-muted/50 to-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shadow-sm">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg tracking-tight">🚀 나만의 AI 고속도로 연결</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">대기열 없는 초고속 전용 통행권(Key) 설정</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8 hover:bg-muted">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {/* 비유적 설명 영역 */}
                <div className="bg-primary/5 p-4.5 rounded-xl border border-primary/20 space-y-3">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-foreground leading-relaxed">
                      <p className="font-bold mb-1">왜 전용 통행권이 필요한가요?</p>
                      <p className="text-muted-foreground">
                        현재 수많은 분들이 공용 AI를 함께 쓰고 있어 가끔 속도가 느려지거나 멈출 수 있습니다. 
                        무료로 발급받을 수 있는 <strong className="text-foreground">개인 전용 다이렉트 키</strong>를 입력하시면, 
                        막힘없이 가장 빠르고 쾌적하게 WorkAI의 모든 기능을 즐기실 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label htmlFor="apiKey" className="text-sm font-bold">내 전용 통행권 (API Key) 입력</Label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-full transition-colors w-fit"
                    >
                      무료 통행권 발급받기
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="AIzaSyA... (여기에 붙여넣기)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono h-11 pr-10 bg-background/50 focus:bg-background transition-colors placeholder:text-muted-foreground/50"
                    />
                    {apiKey && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10">
                         <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border/50">
                    {geminiApiKey 
                      ? <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 현재 나만의 고속도로가 뻥 뚫려 있습니다!
                        </span>
                      : '💡 아직 입력하지 않으셨습니다. 기본 공용 도로를 사용 중입니다.'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border bg-muted/20 flex justify-between gap-3">
                <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" disabled={!geminiApiKey && !apiKey}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  연결 해제
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onClose} className="hover:bg-muted">
                    닫기
                  </Button>
                  <Button onClick={handleSave} disabled={!apiKey.trim()} className="relative overflow-hidden group border-0 bg-primary text-primary-foreground">
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-500 ease-in-out -translate-x-full" />
                    <Save className="w-4 h-4 mr-1.5" />
                    안전하게 연결하기
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
