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
              <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">API 키 연동 설정</h3>
                    <p className="text-xs text-muted-foreground">당신만의 고유한 Gemini 키를 사용하세요</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2">
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>API 키를 입력하면 <span className="font-bold">무제한 빠른 속도</span>로 앱을 이용할 수 있으며, 공용 한도 초과 오류 방지가 가능합니다.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="apiKey" className="text-sm font-semibold">Gemini API Key</Label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium transition-colors"
                    >
                      API Key를 발급받는 방법
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="AIzaSyA..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {geminiApiKey 
                      ? '✅ 현재 커스텀 API 키가 적용되어 있습니다.' 
                      : '입력하지 않으면 기본 워크AI의 공용 키를 사용합니다.'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border bg-muted/20 flex justify-between gap-3">
                <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10" disabled={!geminiApiKey && !apiKey}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button onClick={handleSave} className="gradient-primary text-primary-foreground border-0">
                    <Save className="w-4 h-4 mr-2" />
                    저장
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
