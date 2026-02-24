import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, Sparkles, Bot, User } from 'lucide-react';
import { Slide } from '@/types/presentation';

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
  onRequestEdit: (message: string, slideIndex: number, currentSlide: Slide) => Promise<{ slide: Slide; summary: string } | null>;
}

const QUICK_COMMANDS = [
  '더 간결하게 요약해줘',
  '내용을 더 상세하게 만들어줘',
  '핵심 지표를 강조해줘',
  '전문적인 용어로 바꿔줘',
  '발표자 노트를 보완해줘',
];

export function ChatEditPanel({
  open, onClose, currentSlide, slideIndex, onApply, onRequestEdit,
}: ChatEditPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSlide, setPendingSlide] = useState<Slide | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 슬라이드 변경 시 메시지 초기화
  useEffect(() => {
    setMessages([]);
    setPendingSlide(null);
  }, [slideIndex]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const result = await onRequestEdit(userMsg, slideIndex, currentSlide);
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-elevated z-40 flex flex-col"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI 슬라이드 수정</p>
                <p className="text-[11px] text-muted-foreground">{slideIndex + 1}번 슬라이드</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="w-7 h-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 현재 슬라이드 요약 */}
          <div className="px-4 py-3 bg-muted/40 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-1">현재 슬라이드</p>
            <p className="text-sm font-medium truncate">{currentSlide.title}</p>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl rounded-tl-none px-3 py-2 text-sm text-muted-foreground">
                    안녕하세요! 이 슬라이드를 어떻게 수정할까요?
                  </div>
                </div>
                {/* 빠른 명령어 */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground px-1">빠른 명령어</p>
                  {QUICK_COMMANDS.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => sendMessage(cmd)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted hover:text-primary transition-colors"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5" />
                    : <Bot className="w-3.5 h-3.5 text-primary" />
                  }
                </div>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-none px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* 적용 버튼 */}
            {pendingSlide && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-1"
              >
                <Button
                  onClick={applyChanges}
                  className="w-full gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4" />
                  변경사항 슬라이드에 적용
                </Button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="수정 요청을 입력하세요..."
                className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none"
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
                size="sm"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 p-0 gradient-primary text-primary-foreground border-0 flex-shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Enter로 전송 · Shift+Enter로 줄바꿈</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
