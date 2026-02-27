import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CheckCircle2, AlertTriangle, Info, Star, Eye,
  BookOpen, BarChart3, Layout, FileText, Lightbulb,
  Loader2, Sparkles, Check,
} from 'lucide-react';

export interface ReviewImprovement {
  slideIndex: number;
  slideNumber?: number;
  category: 'readability' | 'content' | 'structure' | 'visual' | 'data';
  severity: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
}

export interface ReviewResult {
  overallScore: number;
  summary: string;
  strengths: string[];        // ✅ 수정: 필수 필드로 명시
  improvements: ReviewImprovement[];
  generalTips: string[];
}

interface ReviewPanelProps {
  open: boolean;
  onClose: () => void;
  review: ReviewResult | null;
  isLoading: boolean;
  onRequestReview: () => void;
  onGoToSlide: (index: number) => void;
  onApplyFix?: (slideIndex: number, issue: string, suggestion: string) => Promise<boolean>;
}

const categoryIcons: Record<string, React.ReactNode> = {
  readability: <Eye className="w-3.5 h-3.5" />,
  content: <BookOpen className="w-3.5 h-3.5" />,
  structure: <Layout className="w-3.5 h-3.5" />,
  visual: <BarChart3 className="w-3.5 h-3.5" />,
  data: <FileText className="w-3.5 h-3.5" />,
};

const categoryLabels: Record<string, string> = {
  readability: '가독성',
  content: '내용',
  structure: '구조',
  visual: '시각',
  data: '데이터',
};

const severityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const severityLabels: Record<string, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? 'text-emerald-500' : score >= 6 ? 'text-amber-500' : 'text-red-500';
  const bg =
    score >= 8 ? 'stroke-emerald-500' : score >= 6 ? 'stroke-amber-500' : 'stroke-red-500';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="40" cy="40" r="34" fill="none" strokeWidth="6"
          className={bg}
          strokeDasharray={`${pct * 2.136} 213.6`}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-black text-2xl ${color}`}>
        {score}
      </div>
    </div>
  );
}

export function ReviewPanel({
  open, onClose, review, isLoading, onRequestReview, onGoToSlide, onApplyFix,
}: ReviewPanelProps) {
  const [applyingStatus, setApplyingStatus] = useState<Record<number, 'loading' | 'applied'>>({});

  const handleApply = async (idx: number, imp: ReviewImprovement) => {
    if (!onApplyFix || applyingStatus[idx] === 'applied') return;
    setApplyingStatus((prev) => ({ ...prev, [idx]: 'loading' }));
    const success = await onApplyFix(imp.slideIndex, imp.issue, imp.suggestion);
    if (success) {
      setApplyingStatus((prev) => ({ ...prev, [idx]: 'applied' }));
    } else {
      setApplyingStatus((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  };

  // ✅ 수정: strengths, generalTips null 안전 처리
  const strengths = review?.strengths ?? [];
  const improvements = review?.improvements ?? [];
  const generalTips = review?.generalTips ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            AI 발표자료 검토
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">

            {/* 초기 상태 */}
            {!review && !isLoading && (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-accent" />
                </div>
                <p className="font-bold text-lg">AI 발표자료 검토</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI가 가독성, 내용, 구조, 시각화를 분석하고<br />개선점을 제안해 드립니다.
                </p>
                <Button onClick={onRequestReview} className="gap-2 gradient-primary text-primary-foreground border-0">
                  <Star className="w-4 h-4" />
                  검토 시작하기
                </Button>
              </div>
            )}

            {/* 로딩 */}
            {isLoading && (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
                <p className="text-sm text-muted-foreground">AI가 발표자료를 분석 중입니다...</p>
              </div>
            )}

            {/* 결과 */}
            {review && !isLoading && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                  {/* 점수 요약 */}
                  <div className="flex items-center gap-5 p-5 rounded-xl bg-muted/50 border border-border">
                    <ScoreRing score={review.overallScore} />
                    <div className="flex-1">
                      <p className="font-bold text-lg">종합 점수</p>
                      <p className="text-sm text-muted-foreground mt-1">{review.summary}</p>
                    </div>
                  </div>

                  {/* 잘된 점 */}
                  {strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        잘된 점
                      </p>
                      <div className="space-y-2">
                        {strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 개선점 */}
                  {improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        개선점 ({improvements.length})
                      </p>
                      <div className="space-y-2">
                        {improvements.map((imp, i) => {
                          const status = applyingStatus[i];
                          const isApplied = status === 'applied';
                          const isApplying = status === 'loading';
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`p-3 rounded-xl border transition-all ${
                                isApplied
                                  ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800'
                                  : 'bg-card border-border hover:shadow-card'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${severityColors[imp.severity] ?? ''}`}>
                                  {severityLabels[imp.severity] ?? imp.severity}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                                  {categoryIcons[imp.category]}
                                  {categoryLabels[imp.category] ?? imp.category}
                                </span>
                                <button
                                  onClick={() => onGoToSlide(imp.slideIndex)}
                                  className="ml-auto text-[10px] font-mono text-accent hover:underline"
                                >
                                  슬라이드 {(imp.slideNumber ?? imp.slideIndex + 1)}
                                </button>
                              </div>
                              <p className={`text-sm font-medium mb-1 ${isApplied ? 'text-muted-foreground line-through' : ''}`}>
                                {imp.issue}
                              </p>
                              <p className={`text-xs ${isApplied ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {imp.suggestion}
                              </p>
                              {onApplyFix && (
                                <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant={isApplied ? 'outline' : 'default'}
                                    disabled={isApplying || isApplied}
                                    onClick={() => handleApply(i, imp)}
                                    className={`h-7 text-xs px-3 gap-1.5 ${
                                      !isApplied
                                        ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'
                                        : 'text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/20'
                                    }`}
                                  >
                                    {isApplying ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : isApplied ? (
                                      <><Check className="w-3.5 h-3.5" /> 적용됨</>
                                    ) : (
                                      <><Sparkles className="w-3.5 h-3.5" /> AI 적용</>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 일반 팁 */}
                  {generalTips.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-accent" />
                        일반 팁
                      </p>
                      <div className="space-y-2">
                        {generalTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                            <Lightbulb className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={onRequestReview} variant="outline" className="w-full gap-2">
                    <Star className="w-4 h-4" />
                    다시 검토하기
                  </Button>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
