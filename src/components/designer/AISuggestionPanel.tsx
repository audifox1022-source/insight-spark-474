import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, X, Loader2, Sparkles, Check, 
  ChevronRight, RefreshCw, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Presentation, Slide } from '@/types/presentation';
import { geminiService } from '@/services/ai/geminiService';

interface AISuggestionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation | null;
  currentSlideIndex: number;
  onApplySuggestion: (slideIndex: number, updates: Partial<Slide>) => void;
}

interface ContentSuggestion {
  type: 'heading' | 'description' | 'layout' | 'content';
  confidence: number;
  content: string;
  reason: string;
  applyAction: () => void;
}

const SUGGESTION_PROMPT = `
당신은 McKinsey, BCG 수준의 프레젠테이션 전문가입니다. 
현재 슬라이드를 분석하여 실질적으로 개선할 수 있는 제안을 제공해주세요.

제안 유형:
1. heading: 슬라이드 제목을 더 설득력 있게 개선
2. description: 본문 설명을 더 구체적이고 근거 있게 개선
3. layout: 데이터에 맞는 최적의 레이아웃 제안
4. content: 누락된 핵심 콘텐츠 항목 추가

응답 형식 (JSON 배열):
[
  {
    "type": "heading|description|layout|content",
    "confidence": 0.0-1.0,
    "content": "구체적인 개선 제안 내용",
    "reason": "왜 이것이 중요한지에 대한 근거"
  }
]

최대 3개의 가장 중요한 제안만 제공하세요.
`;

export function AISuggestionPanel({ 
  isOpen, onClose, presentation, currentSlideIndex, onApplySuggestion 
}: AISuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());

  const currentSlide = presentation?.slides[currentSlideIndex];

  const fetchSuggestions = useCallback(async () => {
    if (!currentSlide) return;

    setIsLoading(true);
    setSuggestions([]);
    setAppliedIndices(new Set());

    try {
      const context = {
        currentSlide,
        previousSlide: currentSlideIndex > 0 ? presentation?.slides[currentSlideIndex - 1] : undefined,
        nextSlide: currentSlideIndex < (presentation?.slides.length || 0) - 1 ? presentation?.slides[currentSlideIndex + 1] : undefined,
      };

      const response = await geminiService.processStrategicChat(
        `${SUGGESTION_PROMPT}\n\n현재 슬라이드 데이터:\n${JSON.stringify(context)}`,
        currentSlide
      );

      if (Array.isArray(response)) {
        const parsed: ContentSuggestion[] = response.map((item: any, index: number) => ({
          type: item.type || 'content',
          confidence: item.confidence || 0.7,
          content: item.content || '',
          reason: item.reason || '',
          applyAction: () => handleApply(item, index),
        }));
        setSuggestions(parsed);
      } else if (response?.suggestions && Array.isArray(response.suggestions)) {
        const parsed: ContentSuggestion[] = response.suggestions.map((item: any, index: number) => ({
          type: item.type || 'content',
          confidence: item.confidence || 0.7,
          content: item.content || '',
          reason: item.reason || '',
          applyAction: () => handleApply(item, index),
        }));
        setSuggestions(parsed);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('AI 제안을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [currentSlide, currentSlideIndex, presentation]);

  useEffect(() => {
    if (isOpen && currentSlide) {
      fetchSuggestions();
    }
  }, [isOpen, currentSlideIndex]);

  const handleApplyAll = () => {
    if (!currentSlide || suggestions.length === 0) return;
    
    suggestions.forEach((suggestion, index) => {
      if (!appliedIndices.has(index)) {
        suggestion.applyAction();
      }
    });
    
    toast.success('모든 제안이 적용되었습니다.');
  };

  const handleApply = (suggestion: any, index: number) => {
    if (!currentSlide) return;

    switch (suggestion.type) {
      case 'heading':
        onApplySuggestion(currentSlideIndex, { title: suggestion.content });
        break;
      case 'description':
        if (currentSlide.content && currentSlide.content.length > 0) {
          const updatedContent = [...currentSlide.content];
          updatedContent[0] = { ...updatedContent[0], description: suggestion.content };
          onApplySuggestion(currentSlideIndex, { content: updatedContent });
        }
        break;
      case 'layout':
        onApplySuggestion(currentSlideIndex, { layout: suggestion.content });
        break;
      case 'content': {
        const newContent = {
          heading: suggestion.content.split(':')[0] || '새 항목',
          description: suggestion.content.split(':')[1] || suggestion.content,
        };
        onApplySuggestion(currentSlideIndex, { 
          content: [...(currentSlide.content || []), newContent] 
        });
        break;
      }
    }

    setAppliedIndices(prev => new Set([...prev, index]));
    toast.success('제안이 적용되었습니다.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 w-[420px] h-full bg-slate-950/95 backdrop-blur-3xl border-l border-white/10 z-[1000] shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">AI 콘텐츠 제안</h3>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Smart Suggestions</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-white text-sm font-medium">AI가 분석 중입니다...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm text-center">
                제안이 없습니다.<br />
                <button onClick={fetchSuggestions} className="text-amber-400 hover:underline">
                  다시 분석
                </button>
              </p>
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-5 rounded-2xl border transition-all ${
                  appliedIndices.has(index)
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    suggestion.type === 'heading' ? 'bg-blue-500/20 text-blue-400' :
                    suggestion.type === 'description' ? 'bg-purple-500/20 text-purple-400' :
                    suggestion.type === 'layout' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {suggestion.type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {Math.round(suggestion.confidence * 100)}% 확신
                  </span>
                </div>
                
                <p className="text-white text-sm font-medium leading-relaxed mb-2">
                  {suggestion.content}
                </p>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  {suggestion.reason}
                </p>
                
                <Button
                  size="sm"
                  onClick={() => suggestion.applyAction()}
                  disabled={appliedIndices.has(index)}
                  className={`w-full gap-2 ${
                    appliedIndices.has(index)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  }`}
                >
                  {appliedIndices.has(index) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {appliedIndices.has(index) ? '적용됨' : '제안 적용'}
                </Button>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-8 border-t border-white/10 bg-white/[0.02] space-y-3">
          {suggestions.length > 0 && appliedIndices.size < suggestions.length && (
            <Button 
              onClick={handleApplyAll}
              disabled={isLoading}
              className="w-full gap-2 bg-amber-500 text-white hover:bg-amber-600"
            >
              <CheckCheck className="w-4 h-4" />
              모든 제안 적용 ({suggestions.length - appliedIndices.size}개)
            </Button>
          )}
          <Button 
            onClick={fetchSuggestions} 
            disabled={isLoading}
            variant="outline" 
            className="w-full gap-2 border-white/10 text-white hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '분석 중...' : '새로운 제안 받기'}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
