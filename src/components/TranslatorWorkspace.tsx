import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx';
import saveAs from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

import { analyzeAndTranslate, reverseTranslate, structureTextAsMarkdown } from '@/lib/translation-service';
import type { AnalysisResults, TranslationAndAnalysisResponse, ContextualTerm, TerminologyTerm } from '@/types/translation';

import AnalysisPanel from './AnalysisPanel';
import Loader from './Loader';
import {
  Sparkles, ArrowRightLeft, Upload, Copy, Download,
  HelpCircle, Pencil, Check, Globe, RotateCcw,
  Zap, FileText, ChevronDown, X
} from 'lucide-react';
import ReverseTranslationModal from './ReverseTranslationModal';
import HelpModal from './HelpModal';
import AnalysisPopover from './AnalysisPopover';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

const LANGUAGES = [
  { value: 'Korean',              label: '한국어 (Korean)'           },
  { value: 'English',             label: 'English'                   },
  { value: 'Japanese',            label: '日本語 (Japanese)'          },
  { value: 'Chinese (Simplified)',label: '中文 (简体)'                },
  { value: 'Spanish',             label: 'Español (Spanish)'         },
  { value: 'French',              label: 'Français (French)'         },
  { value: 'German',              label: 'Deutsch (German)'          },
  { value: 'Russian',             label: 'Русский (Russian)'         },
  { value: 'Vietnamese',          label: 'Tiếng Việt (Vietnamese)'   },
  { value: 'Indonesian',          label: 'Bahasa Indonesia'          },
];

const domainMap: { [key: string]: string } = {
  IT: 'IT', Law: '법률', Medical: '의학', General: '일반',
  Business: '비즈니스', Finance: '금융', Marketing: '마케팅',
  Art: '예술', Science: '과학', Education: '교육', Technology: '기술',
};

const getKoreanDomainDisplay = (domain: string): string => {
  if (!domain) return '';
  const k = domainMap[domain] || domain;
  return k === domain ? `${domain} 분야` : `${k} (${domain}) 분야`;
};

const getLanguageDisplay = (languageValue: string): string => {
  if (!languageValue) return '';
  const lang = LANGUAGES.find(l => l.value === languageValue);
  return `${lang ? lang.label.split(' ')[0] : languageValue} 감지`;
};

export const TranslatorWorkspace = React.forwardRef((props, ref) => {
  const [sourceText,      setSourceText]      = useState('');
  const [translatedText,  setTranslatedText]  = useState('');
  
  React.useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (translatedText) {
        setTranslatedText('');
        setAnalysisResults(null);
        setTranslationEditing(true);
        return true;
      }
      return false;
    }
  }));
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [targetLanguage,  setTargetLanguage]  = useState('English');
  const [sourceLanguage,  setSourceLanguage]  = useState<string | null>(null);
  const [detectedDomain,  setDetectedDomain]  = useState<string | null>(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const [isReverseModalOpen,  setReverseModalOpen]  = useState(false);
  const [reverseTranslation,  setReverseTranslation] = useState('');
  const [isReverseLoading,    setReverseLoading]     = useState(false);

  const [showSourceCopySuccess, setShowSourceCopySuccess] = useState(false);
  const [isSourceSaveMenuOpen,  setSourceSaveMenuOpen]    = useState(false);
  const sourceSaveMenuRef = useRef<HTMLDivElement>(null);

  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isSaveMenuOpen,  setSaveMenuOpen]    = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef       = useRef<HTMLInputElement>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [loadingMessage,   setLoadingMessage]   = useState('');
  const [isHelpModalOpen,  setHelpModalOpen]    = useState(false);

  const [isTranslationEditing, setTranslationEditing] = useState(true);
  const [popoverContent, setPopoverContent] = useState<{
    term: ContextualTerm | TerminologyTerm;
    position: { top: number; left: number };
  } | null>(null);

  const sourceRef       = useRef<HTMLTextAreaElement>(null);
  const translationRef  = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const isSyncingRef    = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── 동기 스크롤 ──────────────────────────────────────────
  const handleSynchronizedScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    if (isSyncingRef.current) return;
    const sourceEl     = sourceRef.current;
    const translationEl = translationRef.current;
    if (!sourceEl || !translationEl) return;
    const scrollingEl = e.currentTarget;
    const targetEl    = scrollingEl === sourceEl ? translationEl : sourceEl;
    const dist = scrollingEl.scrollHeight - scrollingEl.clientHeight;
    if (dist <= 0) return;
    isSyncingRef.current = true;
    const ratio = scrollingEl.scrollTop / dist;
    targetEl.scrollTop = Math.round(ratio * (targetEl.scrollHeight - targetEl.clientHeight));
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { isSyncingRef.current = false; }, 100);
  }, []);

  // ── 외부 클릭 닫기 ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node))
        setSaveMenuOpen(false);
      if (sourceSaveMenuRef.current && !sourceSaveMenuRef.current.contains(e.target as Node))
        setSourceSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── 번역 & 분석 ──────────────────────────────────────────
  const handleAnalysis = useCallback(async () => {
    if (!sourceText.trim()) { setError('번역할 내용을 입력해주세요.'); return; }
    setIsLoading(true);
    setLoadingMessage('AI가 문맥과 전문 용어를 분석 중입니다...');
    setError(null);
    setAnalysisResults(null);
    setTranslatedText('');
    setSourceLanguage(null);
    setDetectedDomain(null);
    setTranslationEditing(true);
    try {
      const result: TranslationAndAnalysisResponse = await analyzeAndTranslate(sourceText, targetLanguage);
      setTranslatedText(result.translation);
      setSourceLanguage(result.sourceLanguage);
      setDetectedDomain(result.detectedDomain);
      setAnalysisResults({
        contextAnalysis:     result.contextAnalysis,
        terminologyAnalysis: result.terminologyAnalysis,
        styleAnalysis:       result.styleAnalysis,
      });
      setTranslationEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setTranslatedText('');
      setAnalysisResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, targetLanguage]);

  // ── 역번역 ───────────────────────────────────────────────
  const handleReverseTranslate = useCallback(async () => {
    if (!translatedText.trim() || !sourceLanguage) return;
    setReverseLoading(true);
    try {
      const result = await reverseTranslate(translatedText, sourceLanguage);
      setReverseTranslation(result);
    } catch {
      setReverseTranslation('역번역에 실패했습니다.');
    } finally {
      setReverseLoading(false);
      setReverseModalOpen(true);
    }
  }, [translatedText, sourceLanguage]);

  // ── 파일 불러오기 ────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage('파일을 읽는 중...');
    setError(null);
    setSourceText('');
    setAnalysisResults(null);
    setTranslatedText('');
    setOriginalFileName(null);
    setDetectedDomain(null);
    setTranslationEditing(true);
    try {
      let content = '';
      let fileTypeForPrompt = '';
      if (file.name.endsWith('.docx')) {
        fileTypeForPrompt = 'docx';
        const buf = await file.arrayBuffer();
        content = (await mammoth.convertToHtml({ arrayBuffer: buf })).value;
      } else if (file.type === 'application/pdf') {
        fileTypeForPrompt = 'pdf';
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(buf).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          text += tc.items.map((item: any) => item.str).join(' ') + '\n\n';
        }
        content = text;
      } else if (file.type === 'text/plain') {
        fileTypeForPrompt = 'txt';
        content = await file.text();
      } else {
        throw new Error('지원하지 않는 파일 형식입니다. (.txt, .pdf, .docx)');
      }
      if (content.trim()) {
        setLoadingMessage('문서 구조를 분석 중입니다...');
        const md = await structureTextAsMarkdown(content, fileTypeForPrompt);
        setSourceText(md);
      }
      setOriginalFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 읽기 실패');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── 복사 ─────────────────────────────────────────────────
  const handleSourceCopy = () => {
    if (!sourceText) return;
    navigator.clipboard.writeText(sourceText).then(() => {
      setShowSourceCopySuccess(true);
      setTimeout(() => setShowSourceCopySuccess(false), 2000);
    });
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    });
  };

  // ── 파일 저장 ────────────────────────────────────────────
  const saveFile = (text: string, baseName: string, format: 'txt' | 'docx') => {
    if (format === 'txt') {
      saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
    } else {
      const doc = new Document({
        sections: [{ children: text.split('\n').map(p => new Paragraph({ text: p })) }],
      });
      Packer.toBlob(doc).then(blob => saveAs(blob, `${baseName}.docx`));
    }
  };

  const handleSourceSaveFile = (format: 'txt' | 'docx') => {
    const base = originalFileName ? originalFileName.replace(/\.[^/.]+$/, '') : 'source';
    saveFile(sourceText, base, format);
    setSourceSaveMenuOpen(false);
  };

  const handleSaveFile = (format: 'txt' | 'docx') => {
    const base = originalFileName
      ? originalFileName.replace(/\.[^/.]+$/, '') + ' (Translated)'
      : 'translation';
    saveFile(translatedText, base, format);
    setSaveMenuOpen(false);
  };

  // ── 하이라이트 번역 렌더 ─────────────────────────────────
  const renderHighlightedTranslation = useCallback(() => {
    if (!translatedText || !analysisResults) {
      return (
        <div
          ref={translationRef as React.RefObject<HTMLDivElement>}
          className={`absolute inset-0 p-6 whitespace-pre-wrap overflow-y-auto text-sm leading-relaxed custom-scrollbar
            ${!translatedText ? 'text-muted-foreground/50' : 'text-foreground'}`}
          onScroll={handleSynchronizedScroll}
        >
          {translatedText || 'AI 번역 결과가 여기에 표시됩니다...'}
        </div>
      );
    }

    const contextTerms     = analysisResults.contextAnalysis?.map(t => ({ ...t, displayTerm: t.suggestedTranslation, type: 'context' })) || [];
    const terminologyTerms = analysisResults.terminologyAnalysis?.map(t => ({ ...t, displayTerm: t.englishTerm, type: 'terminology' })) || [];
    const allTerms         = [...contextTerms, ...terminologyTerms];
    const uniqueTerms      = [...new Set(allTerms.map(t => t.displayTerm.trim()).filter(Boolean))];

    if (uniqueTerms.length === 0) {
      return (
        <div
          ref={translationRef as React.RefObject<HTMLDivElement>}
          className="absolute inset-0 p-6 text-foreground text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar"
          onScroll={handleSynchronizedScroll}
        >
          {translatedText}
        </div>
      );
    }

    const escaped = uniqueTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');

    const handleMouseEnter = (termStr: string, e: React.MouseEvent) => {
      const td = allTerms.find(t => t.displayTerm.toLowerCase() === termStr.toLowerCase());
      if (td) setPopoverContent({ term: td, position: { top: e.clientY, left: e.clientX } });
    };

    const parts = translatedText.split(regex);
    return (
      <div
        ref={translationRef as React.RefObject<HTMLDivElement>}
        className="absolute inset-0 p-6 text-foreground text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar"
        onScroll={handleSynchronizedScroll}
      >
        {parts.map((part, i) => {
          if (uniqueTerms.some(t => t.toLowerCase() === part.toLowerCase())) {
            const td = allTerms.find(t => t.displayTerm.toLowerCase() === part.toLowerCase());
            const cls = td?.type === 'terminology'
              ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-b border-teal-500/30 hover:bg-teal-500/20'
              : 'bg-primary/10 text-primary border-b border-primary/30 hover:bg-primary/20';
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${cls} rounded-sm px-0.5 cursor-pointer transition-all inline-block`}
                onMouseEnter={e => handleMouseEnter(part, e)}
                onMouseLeave={() => setPopoverContent(null)}
              >
                {part}
              </motion.span>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </div>
    );
  }, [translatedText, analysisResults, handleSynchronizedScroll]);

  const IconBtn = ({
    onClick, disabled, title, children, className = '',
  }: {
    onClick: () => void; disabled?: boolean; title?: string;
    children: React.ReactNode; className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'p-1.5 rounded-lg border border-transparent transition-all',
        'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );

  return (
    <div className="flex w-full h-full gap-5 min-h-0">
      <div className="flex flex-col flex-1 gap-5 min-h-0">

        {/* ── 헤더 & 컨트롤 유닛 ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 flex flex-col gap-4 p-5 rounded-3xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-xl"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                  고성능 AI 전문 번역기
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest shadow-sm shadow-primary/10">Premium</span>
                </h1>
                <p className="text-sm text-muted-foreground/80 font-medium">문맥 인지 모델이 실시간으로 전문 용어를 분석하고 최적의 번역을 제공합니다.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <button
                onClick={() => setHelpModalOpen(true)}
                className="group flex items-center gap-2 px-5 py-3 text-[13px] font-bold rounded-2xl border border-border/40
                  bg-background/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-background/60 transition-all shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" /> 사용 가이드
              </button>

              <input type="file" ref={fileInputRef} onChange={handleFileChange}
                accept=".txt,.pdf,.docx" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="group flex items-center gap-2 px-5 py-3 text-[13px] font-bold rounded-2xl border border-border/40
                  bg-background/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-background/60
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" /> 파일 분석
              </button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

          {/* 실질적 컨트롤 영역 */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/30 border border-border/40">
                <Globe className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-[13px] font-bold text-muted-foreground">도착 언어</span>
                <div className="w-px h-3 bg-border" />
                <select
                  id="target-lang-select"
                  value={targetLanguage}
                  onChange={e => setTargetLanguage(e.target.value)}
                  className="bg-transparent text-foreground text-[13px] font-bold outline-none cursor-pointer pr-2 appearance-none"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>

              <button
                onClick={handleReverseTranslate}
                disabled={isLoading || isReverseLoading || !translatedText || !sourceLanguage}
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-2xl border border-emerald-500/20
                  bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10
                  hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isReverseLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ArrowRightLeft className="w-3.5 h-3.5" />
                }
                역번역 검증
              </button>
            </div>

            <button
              onClick={handleAnalysis}
              disabled={isLoading || !sourceText.trim()}
              className={[
                'flex items-center gap-2 px-6 py-3 text-sm font-black rounded-2xl transition-all shadow-lg',
                'text-white bg-gradient-to-r from-primary to-accent shadow-primary/20',
                'hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none',
              ].join(' ')}
            >
              <Zap className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
              스마트 번역 및 분석 시작
            </button>
          </div>
        </motion.div>

        {/* ── 텍스트 패널 (2-column) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 min-h-0">

          {/* ══ 원문 패널 ══ */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex flex-col bg-card/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden min-h-0 transition-all hover:border-primary/30 hover:shadow-primary/5"
          >
            {/* 패널 헤더 */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-muted/20">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-black text-foreground tracking-tight">원문 데이터</h2>
                <AnimatePresence>
                  {sourceLanguage && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-black uppercase tracking-widest"
                    >
                      {getLanguageDisplay(sourceLanguage)}
                    </motion.span>
                  )}
                  {detectedDomain && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-widest"
                    >
                      {getKoreanDomainDisplay(detectedDomain)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <IconBtn onClick={handleSourceCopy} disabled={!sourceText} title="복사">
                    {showSourceCopySuccess
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />
                    }
                  </IconBtn>
                  {showSourceCopySuccess && (
                     <motion.span
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 right-0 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 rounded-xl whitespace-nowrap z-10 shadow-xl"
                    >
                      복사 완료!
                    </motion.span>
                  )}
                </div>

                <div className="relative">
                  <IconBtn onClick={() => setSourceSaveMenuOpen(p => !p)} disabled={!sourceText} title="내보내기">
                    <Download className="w-4 h-4" />
                  </IconBtn>
                  <AnimatePresence>
                    {isSourceSaveMenuOpen && (
                      <motion.div
                        ref={sourceSaveMenuRef}
                        initial={{ opacity: 0, scale: 0.95, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-36 bg-card border border-white/10 rounded-2xl shadow-elevated z-50 overflow-hidden py-1.5 backdrop-blur-2xl"
                      >
                        <button onClick={() => handleSourceSaveFile('txt')} className="block w-full text-left px-4 py-2.5 text-[12px] font-bold text-foreground hover:bg-primary/10 hover:text-primary transition-colors">.TXT 텍스트</button>
                        <button onClick={() => handleSourceSaveFile('docx')} className="block w-full text-left px-4 py-2.5 text-[12px] font-bold text-foreground hover:bg-primary/10 hover:text-primary transition-colors">.DOCX 워드</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {sourceText && (
                  <IconBtn
                    onClick={() => {
                      setSourceText(''); setOriginalFileName(null); setDetectedDomain(null);
                      setSourceLanguage(null); setAnalysisResults(null); setTranslatedText('');
                      setTranslationEditing(true);
                    }}
                    title="초기화"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </IconBtn>
                )}
              </div>
            </div>

            {/* 텍스트 영역 */}
            <div className="flex-1 relative min-h-0 bg-background/20 group-hover:bg-background/40 transition-colors">
              <textarea
                ref={sourceRef}
                onScroll={handleSynchronizedScroll}
                value={sourceText}
                onChange={e => {
                  setSourceText(e.target.value);
                  setOriginalFileName(null); setDetectedDomain(null);
                  setSourceLanguage(null); setAnalysisResults(null);
                  setTranslatedText(''); setTranslationEditing(true);
                }}
                placeholder="이곳에 번역할 비즈니스 텍스트를 입력하거나 문서를 업로드하세요..."
                className={[
                  'absolute inset-0 p-6 bg-transparent resize-none outline-none custom-scrollbar',
                  'text-sm text-foreground leading-relaxed',
                  'placeholder:text-muted-foreground/30 font-medium',
                ].join(' ')}
                disabled={isLoading}
              />
            </div>
          </motion.div>

          {/* ══ 번역문 패널 ══ */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex flex-col bg-card/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden min-h-0 transition-all hover:border-accent/30 hover:shadow-accent/5"
          >
            {/* 패널 헤더 */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <h2 className="text-sm font-black text-foreground tracking-tight">인공지능 번역 결과</h2>
              </div>

              <div className="flex items-center gap-1.5">
                <IconBtn
                  onClick={() => setTranslationEditing(p => !p)}
                  disabled={!translatedText || !analysisResults}
                  title={isTranslationEditing ? '분석 하이라이트 보기' : '편집 모드 전환'}
                  className={!isTranslationEditing && translatedText ? 'text-primary border-primary/20 bg-primary/10' : ''}
                >
                  <Pencil className="w-4 h-4" />
                </IconBtn>

                <div className="relative">
                  <IconBtn onClick={handleCopy} disabled={!translatedText} title="복사">
                    {showCopySuccess
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />
                    }
                  </IconBtn>
                  {showCopySuccess && (
                     <motion.span
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 right-0 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 rounded-xl whitespace-nowrap z-10 shadow-xl"
                    >
                      복사 완료!
                    </motion.span>
                  )}
                </div>

                <div className="relative">
                  <IconBtn onClick={() => setSaveMenuOpen(p => !p)} disabled={!translatedText} title="내보내기">
                    <Download className="w-4 h-4" />
                  </IconBtn>
                  <AnimatePresence>
                    {isSaveMenuOpen && (
                      <motion.div
                        ref={saveMenuRef}
                        initial={{ opacity: 0, scale: 0.95, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-36 bg-card border border-white/10 rounded-2xl shadow-elevated z-50 overflow-hidden py-1.5 backdrop-blur-2xl"
                      >
                        <button onClick={() => handleSaveFile('txt')} className="block w-full text-left px-4 py-2.5 text-[12px] font-bold text-foreground hover:bg-accent/10 hover:text-accent transition-colors">.TXT 텍스트</button>
                        <button onClick={() => handleSaveFile('docx')} className="block w-full text-left px-4 py-2.5 text-[12px] font-bold text-foreground hover:bg-accent/10 hover:text-accent transition-colors">.DOCX 워드</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* 번역 결과 영역 */}
            <div className="flex-1 relative min-h-0 bg-background/20 group-hover:bg-background/40 transition-colors">

              {/* 로딩 오버레이 */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-md z-10"
                  >
                    <Loader message={loadingMessage} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 에러 오버레이 */}
              {error && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-10 p-8"
                >
                  <div className="max-w-xs w-full bg-destructive/10 border border-destructive/20 rounded-3xl p-6 text-center backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-6 h-6 text-destructive" />
                    </div>
                    <p className="text-sm font-black text-destructive mb-1">분석 중 오류 발생</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
                    <button onClick={handleAnalysis} className="mt-4 text-xs font-bold text-destructive hover:underline">다시 시도</button>
                  </div>
                </motion.div>
              )}

              {/* 빈 상태 */}
              {!isLoading && !error && !translatedText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground/30 pointer-events-none">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    <Globe className="w-16 h-16 opacity-10" />
                  </motion.div>
                  <p className="text-sm font-bold tracking-tight">분석을 시작하면 결과가 이곳에 표시됩니다</p>
                </div>
              )}

              {/* 편집 모드 (textarea) */}
              {(isTranslationEditing || !analysisResults) && !isLoading && translatedText ? (
                <textarea
                  ref={translationRef as React.RefObject<HTMLTextAreaElement>}
                  onScroll={handleSynchronizedScroll}
                  value={translatedText}
                  onChange={e => setTranslatedText(e.target.value)}
                  placeholder="AI 번역 결과가 여기에 표시됩니다..."
                  className={[
                    'absolute inset-0 p-6 bg-transparent resize-none outline-none custom-scrollbar',
                    'text-sm text-foreground leading-relaxed font-medium',
                    'placeholder:text-muted-foreground/30',
                  ].join(' ')}
                />
              ) : (
                !isLoading && renderHighlightedTranslation()
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── 분석 패널 ── */}
      <AnalysisPanel results={analysisResults} isLoading={isLoading} />

      {/* ── 모달 & 팝오버 ── */}
      <AnimatePresence>
        {isReverseModalOpen && (
          <ReverseTranslationModal
            isOpen={isReverseModalOpen}
            onClose={() => setReverseModalOpen(false)}
            originalText={translatedText}
            reverseTranslation={reverseTranslation}
            targetLanguage={sourceLanguage || ''}
            isLoading={isReverseLoading}
          />
        )}
      </AnimatePresence>
      <AnalysisPopover content={popoverContent} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
});

export default TranslatorWorkspace;
