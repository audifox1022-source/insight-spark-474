import React, { useState, useRef, useEffect } from 'react';
import saveAs from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

import type { AnalysisResults } from '@/types/translation';
import { AnalysisType } from '@/types/translation';

// ✨ 자체 Icon 파일 대신 lucide-react에서 아이콘을 가져옵니다.
import { 
  BookOpen, Languages, Palette, Copy, Download, 
  MessageSquare, Hash, Zap, ChevronRight, Check
} from 'lucide-react';
import Loader from './Loader';

interface AnalysisPanelProps {
  results: AnalysisResults | null;
  isLoading: boolean;
}

const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500';
    if (score >= 5) return 'bg-amber-500';
    return 'bg-rose-500';
}

const formalityMap: { [key: string]: string } = {
    'Formal': '격식체',
    'Informal': '비격식체',
    'Neutral': '중립체'
};

const toneMap: { [key: string]: string } = {
    'Academic': '학술적',
    'Educational': '교육적',
    'Business': '업무용',
    'Corporate': '기업용',
    'Professional': '전문적',
    'Casual': '일상적',
    'Conversational': '대화체',
    'Technical': '기술적',
    'Friendly': '친근한',
    'Humorous': '유머러스한',
    'Persuasive': '설득적인',
    'Assertive': '단호한',
    'Journalistic': '저널리즘',
    'Serious': '진지한',
    'Neutral': '중립적',
    'Informative': '정보 제공',
    'Practical': '실용적인'
};

const getMappedStyleValue = (englishValue: string, map: { [key: string]: string }): string => {
    if (!englishValue) return 'N/A';

    const parts = englishValue.split(/\s+and\s+|\s*,\s*/i).map(part => part.trim()).filter(Boolean);

    if (parts.length > 1) {
        const koreanParts = parts.map(part => {
            const foundKey = Object.keys(map).find(key => key.toLowerCase() === part.toLowerCase());
            return foundKey ? map[foundKey] : (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
        });
        return `${koreanParts.join(', ')} (${englishValue})`;
    }

    const foundKey = Object.keys(map).find(key => key.toLowerCase() === englishValue.toLowerCase());
    if (foundKey) return `${map[foundKey]} (${foundKey})`;
    
    return englishValue.charAt(0).toUpperCase() + englishValue.slice(1);
};


const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ results, isLoading }) => {
  const [activeTab, setActiveTab] = useState<AnalysisType>(AnalysisType.CONTEXT);
  const [isTermMenuOpen, setTermMenuOpen] = useState<boolean>(false);
  const [showCopySuccess, setShowCopySuccess] = useState<boolean>(false);
  const termMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termMenuRef.current && !termMenuRef.current.contains(event.target as Node)) {
        setTermMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyTerms = () => {
      if (!results || !results.terminologyAnalysis || results.terminologyAnalysis.length === 0) return;

      const textToCopy = results.terminologyAnalysis.map(term =>
          `${term.koreanTerm} -> ${term.englishTerm}\n${term.description}`
      ).join('\n\n');

      navigator.clipboard.writeText(textToCopy).then(() => {
          setShowCopySuccess(true);
          setTimeout(() => setShowCopySuccess(false), 2000);
      });
  };

  const handleDownloadTerms = (format: 'txt' | 'csv') => {
      if (!results || !results.terminologyAnalysis || results.terminologyAnalysis.length === 0) return;
      
      let content = '';
      let mimeType = '';
      let filename = 'terminology_analysis';

      if (format === 'txt') {
          content = results.terminologyAnalysis.map(term =>
              `${term.koreanTerm} -> ${term.englishTerm}\n${term.description}`
          ).join('\n\n');
          mimeType = 'text/plain;charset=utf-8';
          filename += '.txt';
      } else if (format === 'csv') {
          const escapeCsvCell = (cell: string) => {
              if (!cell) return '""';
              const strCell = String(cell);
              if (/[",\n]/.test(strCell)) {
                  return `"${strCell.replace(/"/g, '""')}"`;
              }
              return strCell;
          };
          const header = ['"Korean Term"', '"English Term"', '"Description"'].join(',');
          const rows = results.terminologyAnalysis.map(term =>
              [
                  escapeCsvCell(term.koreanTerm),
                  escapeCsvCell(term.englishTerm),
                  escapeCsvCell(term.description)
              ].join(',')
          );
          content = [header, ...rows].join('\n');
          mimeType = 'text/csv;charset=utf-8';
          filename += '.csv';
      }

      const blob = new Blob([content], { type: mimeType });
      saveAs(blob, filename);
      setTermMenuOpen(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <Loader />
          <p className="mt-4 text-xs font-bold text-muted-foreground animate-pulse">AI가 데이터를 심층 분석 중입니다...</p>
        </motion.div>
      );
    }
    
    if (!results) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 px-8"
        >
          <div className="w-16 h-16 rounded-[2rem] bg-muted/30 flex items-center justify-center mx-auto mb-6 transform rotate-12">
            <Zap className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-black text-foreground mb-2">분석 대기 중</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            비즈니스 문맥, 용어, 문체 일치도를 AI가 한눈에 정리해 드립니다.
          </p>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {activeTab === AnalysisType.CONTEXT && (
            <div className="space-y-3">
              {results.contextAnalysis.length > 0 ? (
                results.contextAnalysis.map((term, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-background/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl hover:bg-background/60 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <p className="font-black text-indigo-400 text-sm">{term.koreanTerm}</p>
                    </div>
                    <div className="pl-9 space-y-1.5">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        추천: {term.suggestedTranslation}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium flex items-start gap-2">
                        <span className="flex-shrink-0 opacity-40">•</span>
                        대안: {term.alternatives}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground/40">
                  <p className="text-xs font-bold">문맥상 특이사항이 발견되지 않았습니다.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === AnalysisType.TERMINOLOGY && (
            <div className="space-y-3">
               {results.terminologyAnalysis && results.terminologyAnalysis.length > 0 ? (
                 <>
                   <div className="flex justify-end gap-2 mb-2">
                     <button
                        onClick={handleCopyTerms}
                        className="p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all"
                        title="전체 복사"
                      >
                        {showCopySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setTermMenuOpen(!isTermMenuOpen)}
                          className="p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all"
                          title="다운로드"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <AnimatePresence>
                          {isTermMenuOpen && (
                            <motion.div
                              ref={termMenuRef}
                              initial={{ opacity: 0, scale: 0.95, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute top-full right-0 mt-2 w-28 bg-card border border-white/10 rounded-xl shadow-elevated z-50 overflow-hidden py-1 backdrop-blur-xl"
                            >
                              <button onClick={() => handleDownloadTerms('txt')} className="block w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-teal-500/10 hover:text-teal-400 transition-colors">.TXT 텍스트</button>
                              <button onClick={() => handleDownloadTerms('csv')} className="block w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-teal-500/10 hover:text-teal-400 transition-colors">.CSV 엑셀</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                   </div>
                   {results.terminologyAnalysis.map((term, index) => (
                     <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-background/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl hover:bg-background/60 transition-all hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Hash className="w-3.5 h-3.5 text-teal-400" />
                          </div>
                          <p className="font-black text-teal-400 text-sm">
                            {term.koreanTerm} <span className="text-muted-foreground mx-1">→</span> {term.englishTerm}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed pl-9">
                          {term.description}
                        </p>
                      </motion.div>
                   ))}
                 </>
               ) : (
                <div className="text-center py-12 text-muted-foreground/40">
                  <p className="text-xs font-bold">발굴된 핵심 전문 용어가 없습니다.</p>
                </div>
               )}
            </div>
          )}

          {activeTab === AnalysisType.STYLE && results.styleAnalysis && (
            <div className="space-y-6">
              <div className="bg-background/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">일치도 지표</h4>
                  <span className="text-lg font-black text-primary">{results.styleAnalysis.consistencyScore}<span className="text-xs opacity-40 ml-0.5">/10</span></span>
                </div>
                <div className="w-full bg-muted/40 rounded-full h-2.5 relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${results.styleAnalysis.consistencyScore * 10}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`${getScoreColor(results.styleAnalysis.consistencyScore)} h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-5 bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl hover:bg-background/60 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground">격식 (Formality)</span>
                  <span className="text-sm font-black text-foreground">{getMappedStyleValue(results.styleAnalysis.formality, formalityMap)}</span>
                </div>
                <div className="flex items-center justify-between p-5 bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl hover:bg-background/60 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground">어조 (Tone)</span>
                  <span className="text-sm font-black text-foreground">{getMappedStyleValue(results.styleAnalysis.tone, toneMap)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  스마트 피드백
                </h4>
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl relative backdrop-blur-sm">
                  <div className="absolute -top-3 left-6 px-2.5 py-0.5 bg-card text-[10px] font-black text-primary border border-primary/20 rounded-lg shadow-sm">GPT Insights</div>
                  <p className="text-sm text-foreground/80 font-medium leading-[1.7]">
                    {results.styleAnalysis.feedback}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const tabs = [
    { id: AnalysisType.CONTEXT,     label: '문맥 분석', icon: MessageSquare },
    { id: AnalysisType.TERMINOLOGY, label: '핵심 용어', icon: Hash },
    { id: AnalysisType.STYLE,       label: '문체 가이드', icon: Palette },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm flex flex-col bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
    >
      <div className="flex-shrink-0 p-6 pb-0">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-indigo-400" />
             </div>
             <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">AI 분석 엔진</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contextual Engine v2.0</p>
             </div>
          </div>
          
          <div className="flex p-1.5 bg-muted/40 rounded-2xl border border-white/5 mb-6 relative">
             {tabs.map((tab) => {
               const isActive = activeTab === tab.id;
               return (
                 <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 py-2.5 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 z-10 ${
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                 >
                   <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'opacity-40'}`} />
                   {tab.label}
                   {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute inset-0 bg-background shadow-md border border-white/10 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                   )}
                 </button>
               );
             })}
          </div>
      </div>

      <div className="flex-grow overflow-y-auto px-6 pb-8 custom-scrollbar">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default AnalysisPanel;
