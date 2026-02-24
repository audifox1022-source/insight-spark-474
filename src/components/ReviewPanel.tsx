import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  CheckCircle2, AlertTriangle, Info, Star, Eye, BookOpen,
  BarChart3, Layout, FileText, Lightbulb, Loader2, X,
} from 'lucide-react';

export interface ReviewImprovement {
  slideIndex: number;
  category: 'readability' | 'content' | 'structure' | 'visual' | 'data';
  severity: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
}

export interface ReviewResult {
  overallScore: number;
  summary: string;
  strengths: string[];
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
  high: '중요', medium: '보통', low: '참고',
};

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'text-emerald-500' : score >= 6 ? 'text-amber-500' : 'text-red-500';
  const bg = score >= 8 ? 'stroke-emerald-500' : score >= 6 ? 'stroke-amber-500' : 'stroke-red-500';
  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-muted" />
        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className={bg}
          strokeDasharray={`${pct * 2.136} 213.6`} strokeLinecap="round" />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-black text-2xl ${color}`}>
        {score}
      </div>
    </div>
  );
}

export function ReviewPanel({ open, onClose, review, isLoading, onRequestReview, onGoToSlide }: ReviewPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            발표자료 리뷰
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {!review && !isLoading && (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <p className="font-bold text-lg">AI 리뷰 시작</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI가 발표자료의 가독성, 구조, 내용을 분석하고<br />
                    구체적인 개선 방안을 제안합니다
                  </p>
                </div>
                <Button onClick={onRequestReview} className="gap-2 gradient-primary text-primary-foreground border-0">
                  <Star className="w-4 h-4" />
                  리뷰 시작하기
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
                <p className="text-sm text-muted-foreground">발표자료를 분석하고 있습니다...</p>
              </div>
            )}

            {review && !isLoading && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* 점수 */}
                  <div className="flex items-center gap-5 p-5 rounded-xl bg-muted/50 border border-border">
                    <ScoreRing score={review.overallScore} />
                    <div className="flex-1">
                      <p className="font-bold text-lg">종합 점수</p>
                      <p className="text-sm text-muted-foreground mt-1">{review.summary}</p>
                    </div>
                  </div>

                  {/* 잘된 점 */}
                  {review.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 잘된 점
                      </p>
                      <div className="space-y-2">
                        {review.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 개선 사항 */}
                  {review.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> 개선 사항 ({review.improvements.length}건)
                      </p>
                      <div className="space-y-2">
                        {review.improvements.map((imp, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-3 rounded-xl bg-card border border-border hover:shadow-card transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${severityColors[imp.severity]}`}>
                                {severityLabels[imp.severity]}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                                {categoryIcons[imp.category]}
                                {categoryLabels[imp.category]}
                              </span>
                              <button
                                onClick={() => onGoToSlide(imp.slideIndex)}
                                className="ml-auto text-[10px] font-mono text-accent hover:underline"
                              >
                                슬라이드 {imp.slideIndex + 1}번 →
                              </button>
                            </div>
                            <p className="text-sm font-medium mb-1">{imp.issue}</p>
                            <p className="text-xs text-muted-foreground">{imp.suggestion}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 일반 팁 */}
                  {review.generalTips.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-accent" /> 전반적인 제안
                      </p>
                      <div className="space-y-2">
                        {review.generalTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                            <Lightbulb className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 다시 리뷰 */}
                  <Button onClick={onRequestReview} variant="outline" className="w-full gap-2">
                    <Star className="w-4 h-4" />
                    다시 리뷰하기
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
