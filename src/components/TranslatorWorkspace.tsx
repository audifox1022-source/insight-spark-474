import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx';
import saveAs from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

import { analyzeAndTranslate, reverseTranslate, structureTextAsMarkdown, extractTextFromImage } from '@/lib/translation-service';
import type { AnalysisResults, TranslationAndAnalysisResponse, ContextualTerm, TerminologyTerm } from '@/types/translation';
import { saveTranslation } from '@/lib/translation-history';

import AnalysisPanel from './AnalysisPanel';
import Loader from './Loader';
import {
  Sparkles, ArrowRightLeft, Upload, Copy, Download,
  HelpCircle, Pencil, Check, Globe, RotateCcw,
  Zap, FileText, ChevronDown, X, Shield, Languages, Mic
} from 'lucide-react';
import ReverseTranslationModal from './ReverseTranslationModal';
import HelpModal from './HelpModal';
import AnalysisPopover from './AnalysisPopover';
import { VoiceRecorder } from './audio/VoiceRecorder';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

const getKoreanDomainDisplay = (domain: string | null | undefined): string => {
  if (!domain) return '';
  const k = domainMap[domain] || domain;
  return k === domain ? `${domain} 분야` : `${k} (${domain}) 분야`;
};

const getLanguageDisplay = (languageValue: string | null | undefined): string => {
  if (!languageValue) return '';
  const lang = (LANGUAGES || []).find(l => l.value === languageValue);
  const label = lang?.label || languageValue || '';
  if (!label) return '언어 감지';
  const parts = label.split(' ');
  return `${parts[0] || label} 감지`;
};

// 공통 커스텀 스크롤바 CSS 클래스 (Tailwind Arbitrary Variants 활용)
const customScrollbarClass = "overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent";

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
  const [partialTranslation, setPartialTranslation] = useState('');
  const [popoverContent, setPopoverContent] = useState<{
    term: ContextualTerm | TerminologyTerm;
    position: { top: number; left: number };
  } | null>(null);

  const [isVoiceMode, setIsVoiceMode] = useState(false);


  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const sourceRef       = useRef<HTMLTextAreaElement>(null);
  const translationRef  = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const isSyncingRef    = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleTranslationComplete = useCallback((result: TranslationAndAnalysisResponse) => {
    setTranslatedText(result.translation || '');
    setSourceLanguage(result.sourceLanguage || null);
    setDetectedDomain(result.detectedDomain || null);
    setAnalysisResults({
      contextAnalysis:     result.contextAnalysis || [],
      terminologyAnalysis: result.terminologyAnalysis || [],
      styleAnalysis:       result.styleAnalysis || null,
    });
    setTranslationEditing(false);
    setIsVoiceMode(false);

    // 번역 결과 저장
    if (result.translation && sourceText) {
      saveTranslation({
        sourceText: sourceText.substring(0, 500),
        translatedText: result.translation.substring(0, 500),
        sourceLanguage: result.sourceLanguage || 'auto',
        targetLanguage,
        domain: result.detectedDomain || undefined,
      });
    }
  }, [sourceText, targetLanguage]);

  const handleAnalysis = useCallback(async () => {
    const safeText = sourceText || '';
    if (!safeText.trim()) { setError('번역할 내용을 입력해주세요.'); return; }
    setIsLoading(true);
    setLoadingMessage('AI가 문맥과 전문 용어를 분석 중입니다...');
    setError(null);
    setAnalysisResults(null);
    setTranslatedText('');
    setPartialTranslation('');
    setSourceLanguage(null);
    setDetectedDomain(null);
    setTranslationEditing(true);
    try {
      const result: TranslationAndAnalysisResponse = await analyzeAndTranslate(
        safeText, 
        targetLanguage,
        (chunk) => {
          setPartialTranslation(prev => prev + chunk);
        }
      );
      setTranslatedText(result.translation || '');

      setSourceLanguage(result.sourceLanguage || null);
      setDetectedDomain(result.detectedDomain || null);
      setAnalysisResults({
        contextAnalysis:     result.contextAnalysis || [],
        terminologyAnalysis: result.terminologyAnalysis || [],
        styleAnalysis:       result.styleAnalysis || null,
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

  const handleReverseTranslate = useCallback(async () => {
    const safeTranslated = translatedText || '';
    if (!safeTranslated.trim() || !sourceLanguage) return;
    setReverseLoading(true);
    try {
      const result = await reverseTranslate(safeTranslated, sourceLanguage);
      setReverseTranslation(result || '');
    } catch {
      setReverseTranslation('역번역에 실패했습니다.');
    } finally {
      setReverseLoading(false);
      setReverseModalOpen(true);
    }
  }, [translatedText, sourceLanguage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | undefined;
    if ('dataTransfer' in e) {
      file = (e.dataTransfer as DataTransfer).files?.[0];
    } else {
      file = (e.target as HTMLInputElement).files?.[0];
    }
    
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage('파일을 분석하는 중...');
    setError(null);
    setSourceText('');
    setAnalysisResults(null);
    setTranslatedText('');
    setOriginalFileName(null);
    setDetectedDomain(null);
    setTranslationEditing(true);
    try {
      let content = '';
      
      if (file.type.startsWith('image/')) {
        setLoadingMessage('이미지에서 텍스트를 추출 중입니다... (OCR)');
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = reject;
          reader.readAsDataURL(file as File);
        });
        if (!base64Data) throw new Error('이미지 데이터를 읽을 수 없습니다.');
        content = await extractTextFromImage(base64Data, file.type);
        setSourceText(content || '');
      } else {
        let fileTypeForPrompt = '';
        if (file.name.endsWith('.docx')) {
          fileTypeForPrompt = 'docx';
          const buf = await file.arrayBuffer();
          const mammothResult = await mammoth.convertToHtml({ arrayBuffer: buf });
          content = mammothResult?.value || '';
        } else if (file.type === 'application/pdf') {
          fileTypeForPrompt = 'pdf';
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            text += tc.items.map((item: any) => item.str || '').join(' ') + '\n\n';
          }
          content = text;
        } else if (file.type === 'text/plain') {
          fileTypeForPrompt = 'txt';
          content = await file.text();
        } else {
          throw new Error('지원하지 않는 파일 형식입니다. (이미지, .txt, .pdf, .docx)');
        }
        if (content.trim()) {
          setLoadingMessage('문서 구조를 분석 중입니다...');
          const md = await structureTextAsMarkdown(content, fileTypeForPrompt);
          setSourceText(md || content);
        }
      }
      setOriginalFileName(file.name || 'document');
      
      if (file.type.startsWith('image/') && content.trim()) {
        setTimeout(() => {
          handleAnalysis();
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 읽기 실패');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const saveFile = (text: string, baseName: string, format: 'txt' | 'docx') => {
    if (!text) return;
    if (format === 'txt') {
      saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
    } else {
      const doc = new Document({
        sections: [{ children: text.split('\n').filter(Boolean).map(p => new Paragraph({ text: p })) }],
      });
      Packer.toBlob(doc).then(blob => saveAs(blob, `${baseName}.docx`));
    }
  };

  const handleSourceSaveFile = (format: 'txt' | 'docx') => {
    const base = originalFileName ? originalFileName.replace(/\.[^/.]+$/, '') : 'source';
    saveFile(sourceText || '', base, format);
    setSourceSaveMenuOpen(false);
  };

  const handleSaveFile = (format: 'txt' | 'docx') => {
    const base = originalFileName
      ? originalFileName.replace(/\.[^/.]+$/, '') + ' (Translated)'
      : 'translation';
    saveFile(translatedText || '', base, format);
    setSaveMenuOpen(false);
  };

  const renderHighlightedTranslation = useCallback(() => {
    const safeTranslated = translatedText || '';
    if (!safeTranslated || !analysisResults) {
      return (
        <div
          ref={translationRef as React.RefObject<HTMLDivElement>}
          className={`flex-1 w-full h-full p-6 whitespace-pre-wrap text-sm leading-relaxed ${customScrollbarClass}
            ${!safeTranslated ? 'text-muted-foreground/50' : 'text-foreground'}`}
          onScroll={handleSynchronizedScroll}
        >
          {safeTranslated || 'AI 번역 결과가 여기에 표시됩니다...'}
        </div>
      );
    }

    const contextTerms     = (analysisResults.contextAnalysis || []).map(t => ({ ...t, displayTerm: t.suggestedTranslation, type: 'context' }));
    const terminologyTerms = (analysisResults.terminologyAnalysis || []).map(t => ({ ...t, displayTerm: t.englishTerm, type: 'terminology' }));
    const allTerms         = [...contextTerms, ...terminologyTerms];
    const uniqueTerms      = [...new Set(allTerms.map(t => (t.displayTerm || '').trim()).filter(Boolean))];

    if (uniqueTerms.length === 0) {
      return (
        <div
          ref={translationRef as React.RefObject<HTMLDivElement>}
          className={`flex-1 w-full h-full p-6 text-foreground text-sm leading-relaxed whitespace-pre-wrap ${customScrollbarClass}`}
          onScroll={handleSynchronizedScroll}
        >
          {safeTranslated}
        </div>
      );
    }

    const escaped = uniqueTerms.map(t => (t || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');

    const handleMouseEnter = (termStr: string, e: React.MouseEvent) => {
      const td = allTerms.find(t => (t.displayTerm || '').toLowerCase() === (termStr || '').toLowerCase());
      if (td) setPopoverContent({ term: td as any, position: { top: e.clientY, left: e.clientX } });
    };

    const parts = safeTranslated.split(regex);
    return (
      <div
        ref={translationRef as React.RefObject<HTMLDivElement>}
        className={`flex-1 w-full h-full p-6 text-foreground text-sm leading-relaxed whitespace-pre-wrap ${customScrollbarClass} relative z-10 pointer-events-auto`}
        onScroll={handleSynchronizedScroll}
      >
        {parts.map((part, i) => {
          if (!part) return null;
          if (uniqueTerms.some(t => t.toLowerCase() === (part || '').toLowerCase())) {
            const td = allTerms.find(t => (t.displayTerm || '').toLowerCase() === (part || '').toLowerCase());
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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e);
    }
  };

  return (
    <div 
      className="flex w-full h-full gap-5 min-h-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-3xl pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-foreground">파일을 여기에 놓아주세요</h3>
              <p className="text-muted-foreground font-medium">이미지(PNG/JPG), 문서(PDF/DOCX), 텍스트(.txt) 지원</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 gap-8 min-h-0 w-full max-w-6xl mx-auto p-8">
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
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 uppercase tracking-widest shadow-sm shadow-primary/10">Premium</span>
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

              <button
                onClick={() => setIsVoiceMode(p => !p)}
                disabled={isLoading}
                className={`group flex items-center gap-2 px-5 py-3 text-[13px] font-bold rounded-2xl border transition-all
                  ${isVoiceMode 
                    ? 'bg-primary text-white border-primary shadow-xl scale-105' 
                    : 'bg-background/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-background/60'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Mic className={`w-4 h-4 ${isVoiceMode ? 'text-white' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} /> 
                {isVoiceMode ? '텍스트 모드로 전환' : '실시간 통역'}
              </button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

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
              disabled={isLoading || !(sourceText || '').trim()}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-[500px]">
          {/* 영역 1: 원문 데이터 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex flex-col bg-card/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden min-h-0 transition-all hover:border-primary/30 hover:shadow-primary/5 relative"
          >
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-muted/20 relative z-20">
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

            <div className={`flex-1 flex flex-col relative bg-background/20 group-hover:bg-background/40 transition-colors pointer-events-auto z-10 p-2`}>
              {isVoiceMode ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[400px]">
                   <VoiceRecorder 
                     targetLanguage={targetLanguage} 
                     onTranslationComplete={handleTranslationComplete} 
                   />
                </div>
              ) : (
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
                  className={`flex-1 w-full p-4 bg-transparent resize-none outline-none ${customScrollbarClass} text-sm text-foreground leading-relaxed placeholder:text-muted-foreground/30 font-medium`}
                  disabled={isLoading}
                />
              )}
            </div>
          </motion.div>

          {/* 영역 2: 번역 결과 */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex flex-col bg-card/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden min-h-0 transition-all hover:border-accent/30 hover:shadow-accent/5 relative"
          >
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-white/5 bg-muted/20 relative z-20">
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

            <div className={`flex-1 flex flex-col relative bg-background/20 group-hover:bg-background/40 transition-colors pointer-events-auto z-10 p-2`}>
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-md z-50"
                  >
                    <Loader message={loadingMessage} />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-50 p-8"
                >
                  <div className="max-w-xs w-full bg-destructive/10 border border-destructive/20 rounded-3xl p-6 text-center backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-6 h-6 text-destructive" />
                    </div>
                    <p className="text-sm font-black text-destructive mb-1">분석 중 오류 발생</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{error || '알 수 없는 오류'}</p>
                    <button onClick={handleAnalysis} className="mt-4 text-xs font-bold text-destructive hover:underline">다시 시도</button>
                  </div>
                </motion.div>
              )}

              {!isLoading && !error && !translatedText && (
                <div className={`absolute inset-0 flex flex-col p-8 ${customScrollbarClass} z-10`}>
                  <div className="flex flex-col items-center justify-center gap-6 py-12 text-center mt-10">
                    <motion.div
                      animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center blur-sm absolute"
                    />
                    <div className="relative">
                      <Globe className="w-16 h-16 text-primary/30" />
                      <Sparkles className="w-6 h-6 text-accent/40 absolute -top-2 -right-2 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-foreground tracking-tight mb-2">스마트 번역을 시작하세요</h3>
                      <p className="text-sm text-muted-foreground font-medium max-w-[320px] mx-auto opacity-70 leading-relaxed">
                        문맥 인지 AI가 문단의 흐름과 전문 용어를 <br/>실시간으로 분석하여 최적의 번역을 제안합니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-auto pb-4">
                    {[
                      { icon: <Zap className="w-4 h-4" />, title: "문맥 인지 번역", desc: "단어 나열이 아닌 전체 문맥 이해" },
                      { icon: <Check className="w-4 h-4" />, title: "항목별 분석", desc: "전문 용어와 문체를 정밀 분석" },
                      { icon: <RotateCcw className="w-4 h-4" />, title: "역번역 검증", desc: "번역의 정확도를 스스로 검증" },
                      { icon: <FileText className="w-4 h-4" />, title: "다양한 포맷", desc: "PDF, DOCX 등 지원" },
                      { icon: <Shield className="w-4 h-4" />, title: "안전한 보안", desc: "즉시 휘발성 처리 보장" },
                      { icon: <Languages className="w-4 h-4" />, title: "100+ 언어 지원", desc: "글로벌 비즈니스 언어 지원" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-2 group hover:bg-white/10 hover:border-primary/20 transition-all cursor-default relative z-20">
                        <div className="flex items-center gap-2 text-primary">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            {item.icon}
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-tight">{item.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold leading-relaxed opacity-80">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && !translatedText && partialTranslation && (
                <div className={`flex-1 w-full p-6 text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap ${customScrollbarClass} font-mono italic`}>
                  {partialTranslation}
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                </div>
              )}

              {(isTranslationEditing || !analysisResults) && !isLoading && translatedText ? (
                <textarea
                  ref={translationRef as React.RefObject<HTMLTextAreaElement>}
                  onScroll={handleSynchronizedScroll}
                  value={translatedText}
                  onChange={e => setTranslatedText(e.target.value)}
                  placeholder="AI 번역 결과가 여기에 표시됩니다..."
                  className={`flex-1 w-full p-4 bg-transparent resize-none outline-none ${customScrollbarClass} text-sm text-foreground leading-relaxed font-medium placeholder:text-muted-foreground/30 relative z-20`}
                />
              ) : (
                !isLoading && renderHighlightedTranslation()
              )}

            </div>
          </motion.div>
        </div>
      </div>

      <AnalysisPanel results={analysisResults} isLoading={isLoading} />
      {popoverContent && (
        <AnalysisPopover 
          content={popoverContent} 
        />
      )}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
});
