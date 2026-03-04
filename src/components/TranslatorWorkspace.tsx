import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx';
import saveAs from 'file-saver';

import { analyzeAndTranslate, reverseTranslate, structureTextAsMarkdown } from '@/lib/translation-service';
import type { AnalysisResults, TranslationAndAnalysisResponse, ContextualTerm, TerminologyTerm } from '@/types/translation';

import AnalysisPanel from './AnalysisPanel';
import Loader from './Loader';
import {
  Sparkles, ArrowRightLeft, Upload, Copy, Download,
  HelpCircle, Pencil, Check, Globe, RotateCcw,
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

export const TranslatorWorkspace: React.FC = () => {
  const [sourceText,      setSourceText]      = useState('');
  const [translatedText,  setTranslatedText]  = useState('');
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
    setLoadingMessage('AI가 분석 중입니다...');
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
          className={`absolute inset-0 p-4 whitespace-pre-wrap overflow-y-auto text-sm leading-relaxed
            ${!translatedText ? 'text-muted-foreground' : 'text-foreground'}`}
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
          className="absolute inset-0 p-4 text-foreground text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto"
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
        className="absolute inset-0 p-4 text-foreground text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto"
        onScroll={handleSynchronizedScroll}
      >
        {parts.map((part, i) => {
          if (uniqueTerms.some(t => t.toLowerCase() === part.toLowerCase())) {
            const td = allTerms.find(t => t.displayTerm.toLowerCase() === part.toLowerCase());
            const cls = td?.type === 'terminology'
              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300 font-semibold hover:bg-teal-500/30'
              : 'bg-primary/15 text-primary font-semibold hover:bg-primary/25';
            return (
              <span
                key={i}
                className={`${cls} rounded px-1.5 py-0.5 cursor-pointer transition-colors`}
                onMouseEnter={e => handleMouseEnter(part, e)}
                onMouseLeave={() => setPopoverContent(null)}
              >
                {part}
              </span>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </div>
    );
  }, [translatedText, analysisResults, handleSynchronizedScroll]);

  // ── 공통 아이콘 버튼 ──────────────────────────────────────
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
        'text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );

  return (
    <div className="flex w-full h-full gap-4 min-h-0">
      <div className="flex flex-col flex-1 gap-4 min-h-0">

        {/* ── 컨트롤 바 ── */}
        <div className="flex-shrink-0 flex items-center justify-between flex-wrap gap-3
          bg-card border border-border rounded-xl px-4 py-3 shadow-sm">

          {/* 언어 선택 */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <label htmlFor="target-lang-select" className="text-sm font-bold text-foreground whitespace-nowrap">
              번역 언어
            </label>
            <select
              id="target-lang-select"
              value={targetLanguage}
              onChange={e => setTargetLanguage(e.target.value)}
              className={[
                'bg-background border border-border text-foreground text-sm rounded-lg px-3 py-1.5',
                'focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none',
                'transition-colors cursor-pointer',
              ].join(' ')}
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center gap-2 flex-wrap justify-end">

            {/* 사용법 */}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border
                bg-card text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40 transition-all"
            >
              <HelpCircle className="w-4 h-4" /> 사용법
            </button>

            {/* 파일 불러오기 */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange}
              accept=".txt,.pdf,.docx" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border
                bg-card text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40
                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Upload className="w-4 h-4" /> 파일 불러오기
            </button>

            {/* 역번역 */}
            <button
              onClick={handleReverseTranslate}
              disabled={isLoading || isReverseLoading || !translatedText || !sourceLanguage}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border
                bg-card text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isReverseLoading
                ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> 확인 중...</>
                : <><ArrowRightLeft className="w-4 h-4" /> 역번역 확인</>
              }
            </button>

            {/* 번역 & 분석 (메인 액션) */}
            <button
              onClick={handleAnalysis}
              disabled={isLoading || !sourceText.trim()}
              className={[
                'flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all',
                'text-white bg-gradient-to-r from-primary to-accent',
                'hover:opacity-90 hover:shadow-md hover:-translate-y-0.5',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0',
              ].join(' ')}
            >
              <Sparkles className="w-4 h-4" />
              번역 및 분석
            </button>
          </div>
        </div>

        {/* ── 텍스트 패널 (2-column) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">

          {/* ══ 원문 패널 ══ */}
          <div className="flex flex-col bg-card rounded-2xl border border-border shadow-md overflow-hidden min-h-0">

            {/* 패널 헤더 */}
            <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-foreground">원문 (Source)</h2>
                {sourceLanguage && (
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                    {getLanguageDisplay(sourceLanguage)}
                  </span>
                )}
                {detectedDomain && (
                  <span className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                    {getKoreanDomainDisplay(detectedDomain)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* 소스 복사 */}
                <div className="relative">
                  <IconBtn onClick={handleSourceCopy} disabled={!sourceText} title="복사">
                    {showSourceCopySuccess
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />
                    }
                  </IconBtn>
                  {showSourceCopySuccess && (
                    <span className="absolute -top-8 right-1/2 translate-x-1/2 px-2 py-1 text-xs
                      text-white bg-emerald-600 rounded-lg whitespace-nowrap z-10 shadow-md">
                      복사됨!
                    </span>
                  )}
                </div>

                {/* 소스 저장 */}
                <div className="relative">
                  <IconBtn
                    onClick={() => setSourceSaveMenuOpen(p => !p)}
                    disabled={!sourceText}
                    title="파일 저장"
                  >
                    <Download className="w-4 h-4" />
                  </IconBtn>
                  {isSourceSaveMenuOpen && (
                    <div ref={sourceSaveMenuRef}
                      className="absolute top-full right-0 mt-1.5 w-32 bg-card border border-border
                        rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      <button onClick={() => handleSourceSaveFile('txt')}
                        className="block w-full text-left px-4 py-2.5 text-xs font-medium text-foreground
                          hover:bg-primary/10 hover:text-primary transition-colors">
                        .txt 파일
                      </button>
                      <button onClick={() => handleSourceSaveFile('docx')}
                        className="block w-full text-left px-4 py-2.5 text-xs font-medium text-foreground
                          hover:bg-primary/10 hover:text-primary transition-colors">
                        .docx 파일
                      </button>
                    </div>
                  )}
                </div>

                {/* 지우기 */}
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
            <div className="flex-1 relative min-h-0">
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
                placeholder="번역할 텍스트를 입력하거나 파일을 업로드하세요..."
                className={[
                  'absolute inset-0 p-4 bg-transparent resize-none outline-none',
                  'text-sm text-foreground leading-relaxed',
                  'placeholder:text-muted-foreground/50',
                ].join(' ')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* ══ 번역문 패널 ══ */}
          <div className="flex flex-col bg-card rounded-2xl border border-border shadow-md overflow-hidden min-h-0">

            {/* 패널 헤더 */}
            <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">번역문 (Translation)</h2>

              <div className="flex items-center gap-1">
                {/* 편집/보기 토글 */}
                <IconBtn
                  onClick={() => setTranslationEditing(p => !p)}
                  disabled={!translatedText || !analysisResults}
                  title={isTranslationEditing ? '하이라이트 보기' : '편집 모드'}
                  className={isTranslationEditing ? '' : 'text-primary border-primary/30 bg-primary/10'}
                >
                  <Pencil className="w-4 h-4" />
                </IconBtn>

                {/* 번역문 복사 */}
                <div className="relative">
                  <IconBtn onClick={handleCopy} disabled={!translatedText} title="복사">
                    {showCopySuccess
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <Copy className="w-4 h-4" />
                    }
                  </IconBtn>
                  {showCopySuccess && (
                    <span className="absolute -top-8 right-1/2 translate-x-1/2 px-2 py-1 text-xs
                      text-white bg-emerald-600 rounded-lg whitespace-nowrap z-10 shadow-md">
                      복사됨!
                    </span>
                  )}
                </div>

                {/* 번역문 저장 */}
                <div className="relative">
                  <IconBtn
                    onClick={() => setSaveMenuOpen(p => !p)}
                    disabled={!translatedText}
                    title="파일 저장"
                  >
                    <Download className="w-4 h-4" />
                  </IconBtn>
                  {isSaveMenuOpen && (
                    <div ref={saveMenuRef}
                      className="absolute top-full right-0 mt-1.5 w-32 bg-card border border-border
                        rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      <button onClick={() => handleSaveFile('txt')}
                        className="block w-full text-left px-4 py-2.5 text-xs font-medium text-foreground
                          hover:bg-primary/10 hover:text-primary transition-colors">
                        .txt 파일
                      </button>
                      <button onClick={() => handleSaveFile('docx')}
                        className="block w-full text-left px-4 py-2.5 text-xs font-medium text-foreground
                          hover:bg-primary/10 hover:text-primary transition-colors">
                        .docx 파일
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 번역 결과 영역 */}
            <div className="flex-1 relative min-h-0">

              {/* 로딩 오버레이 */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center
                  bg-card/80 backdrop-blur-sm z-10 rounded-b-2xl">
                  <Loader message={loadingMessage} />
                </div>
              )}

              {/* 에러 오버레이 */}
              {error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center
                  bg-card/80 backdrop-blur-sm z-10 rounded-b-2xl p-6">
                  <div className="text-center space-y-2">
                    <p className="text-destructive font-bold text-sm">오류 발생</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* 빈 상태 */}
              {!isLoading && !error && !translatedText && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3
                  text-muted-foreground pointer-events-none">
                  <Globe className="w-10 h-10 opacity-20" />
                  <p className="text-sm">번역 결과가 여기에 표시됩니다</p>
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
                    'absolute inset-0 p-4 bg-transparent resize-none outline-none',
                    'text-sm text-foreground leading-relaxed',
                    'placeholder:text-muted-foreground/50',
                  ].join(' ')}
                />
              ) : (
                !isLoading && renderHighlightedTranslation()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 분석 패널 ── */}
      <AnalysisPanel results={analysisResults} isLoading={isLoading} />

      {/* ── 모달 & 팝오버 ── */}
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
      <AnalysisPopover content={popoverContent} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
};
