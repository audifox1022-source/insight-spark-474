// src/components/ChatEditPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, Sparkles, Bot, User, Minimize2, Target, Zap } from 'lucide-react';
import { Slide } from '@/types/presentation';
import { classifyIntent, getIntentLabel, getIntentIcon, IntentType } from '@/lib/intent-router';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatEditPanelProps {
  open: boolean;
  onClose: () => void;
  currentSlide: Slide;
  slideIndex: number;
  onApply: (updatedSlide: Slide) => void;
  onRequestEdit: (message: string, slideIndex: number, currentSlide: Slide, selectedText?: string) => Promise<{ slide: Slide; summary: string } | null>;
  selectedText?: string;
  onClearSelectedText?: () => void;
  onFactCheck?: (text: string, currentSlide: Slide) => void;
}

const QUICK_COMMANDS = [
  '더 간결하게 요약해줘',
  '내용을 더 상세하게 만들어줘',
  '핵심 지표를 강조해줘',
  '전문적인 용어로 바꿔줘',
  '발표자 노트를 보완해줘',
];

export function ChatEditPanel({
  open, onClose, currentSlide, slideIndex, onApply, onRequestEdit, selectedText, onClearSelectedText, onFactCheck
}: ChatEditPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSlide, setPendingSlide] = useState<Slide | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<IntentType | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  useEffect(() => {
    setMessages([]);
    setPendingSlide(null);
    setIsMinimized(false);
  }, [slideIndex]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    setCurrentIntent(null);

    // ✅ Feature 4: Intent 작업 전 직독 분류
    setIsClassifying(true);
    let detectedIntent: IntentType = 'general_edit';
    try {
      const intentResult = await classifyIntent(userMsg);
      detectedIntent = intentResult.intent;
      setCurrentIntent(detectedIntent);
    } catch { /* 분류 실패 시 무시 */ }
    setIsClassifying(false);

    try {
      const result = await onRequestEdit(userMsg, slideIndex, currentSlide, selectedText);
      if (result) {
        setPendingSlide(result.slide);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `✅ ${result.summary}\n\n수정된 내용을 아래에서 확인하고 적용하세요.` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '죄송합니다. 수정 중 오류가 발생했습니다. 다시 시도해주세요.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyChanges = () => {
    if (!pendingSlide) return;
    onApply(pendingSlide);
    setPendingSlide(null);
    setMessages((prev) => [...prev, { role: 'assistant', content: '✨ 변경사항이 슬라이드에 적용되었습니다!' }]);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {isMinimized ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        >
          <Button
            onClick={() => setIsMinimized(false)}
            className="rounded-full shadow-xl gradient-primary h-12 px-5 text-primary-foreground gap-2 border-0"
          >
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-sm">AI 슬라이드 수정</span>
            {messages.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{messages.length}</span>
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full w-12 h-12 shadow-xl bg-card hover:bg-muted border border-border"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 w-[360px] h-[65vh] min-h-[500px] max-h-[800px] bg-card rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-border z-50 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI 슬라이드 수정</p>
                <p className="text-[11px] text-muted-foreground">{slideIndex + 1}번 슬라이드</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* ✅ Feature 4: Intent 배지 */}
              {isClassifying && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> 분류 중...
                </span>
              )}
              {currentIntent && !isClassifying && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold"
                >
                  {getIntentIcon(currentIntent)} {getIntentLabel(currentIntent)}
                </motion.span>
              )}
              <Button size="icon" variant="ghost" onClick={() => setIsMinimized(true)} className="w-7 h-7 hover:bg-black/5 dark:hover:bg-white/10">
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose} className="w-7 h-7 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-background border-b border-border flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs font-medium truncate text-foreground flex-1">
              {currentSlide.title || '제목 없음'}
            </p>
          </div>

          {selectedText && (
            <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Target className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-primary font-medium truncate">선택됨: "{selectedText}"</span>
              </div>
              <div className="flex items-center gap-1">
                {onFactCheck && (
                  <Button size="sm" variant="outline" onClick={() => onFactCheck(selectedText, currentSlide)}
                    className="h-6 px-2 text-[11px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm mr-1">
                    🔍 팩트/출처 체크
                  </Button>
                )}
                {onClearSelectedText && (
                  <Button size="icon" variant="ghost" onClick={onClearSelectedText} className="w-5 h-5 h-auto hover:bg-black/5">
                    <X className="w-3 h-3 text-primary" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground">
                    안녕하세요! 이 슬라이드를 어떻게 수정할까요?
                  </div>
                </div>
                <div className="space-y-1.5 pt-1 pl-9">
                  <p className="text-[11px] font-medium text-muted-foreground px-1 mb-2">추천 명령어</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COMMANDS.map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => sendMessage(cmd)}
                        className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-left"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 border border-primary/20'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4" />
                    : <Bot className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">AI가 슬라이드를 수정 중입니다...</span>
                </div>
              </div>
            )}

            {pendingSlide && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2 pl-9"
              >
                <Button
                  onClick={applyChanges}
                  className="w-full gap-2 gradient-primary text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  이 변경사항을 슬라이드에 적용하기
                </Button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-end gap-2 bg-muted/30 p-1.5 rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="AI에게 수정 요청하기..."
                className="flex-1 min-h-[40px] max-h-[120px] text-[13px] resize-none bg-transparent border-0 focus-visible:ring-0 px-2 py-2.5"
                rows={1}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-lg gradient-primary text-primary-foreground border-0 flex-shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">Enter로 전송 · Shift+Enter로 줄바꿈</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
