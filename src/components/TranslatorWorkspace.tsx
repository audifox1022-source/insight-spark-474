import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph } from 'docx';
import saveAs from 'file-saver';

import { analyzeAndTranslate, reverseTranslate, structureTextAsMarkdown } from '@/lib/translation-service';
import type { AnalysisResults, TranslationAndAnalysisResponse, ContextualTerm, TerminologyTerm } from '@/types/translation';

import AnalysisPanel from './AnalysisPanel';
import Loader from './Loader';
import { Sparkles, ArrowRightLeft, Upload, Copy, Download, HelpCircle, Pencil } from 'lucide-react';
import ReverseTranslationModal from './ReverseTranslationModal';
import HelpModal from './HelpModal';
import AnalysisPopover from './AnalysisPopover';

// Set PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

const LANGUAGES = [
    { value: 'Korean', label: '한국어 (Korean)'},
    { value: 'English', label: 'English' },
    { value: 'Japanese', label: '日本語 (Japanese)' },
    { value: 'Chinese (Simplified)', label: '中文 (简体)' },
    { value: 'Spanish', label: 'Español (Spanish)' },
    { value: 'French', label: 'Français (French)' },
    { value: 'German', label: 'Deutsch (German)' },
    { value: 'Russian', label: 'Русский (Russian)' },
    { value: 'Vietnamese', label: 'Tiếng Việt (Vietnamese)' },
    { value: 'Indonesian', label: 'Bahasa Indonesia (Indonesian)'},
];

const domainMap: { [key: string]: string } = {
    'IT': 'IT',
    'Law': '법률',
    'Medical': '의학',
    'General': '일반',
    'Business': '비즈니스',
    'Finance': '금융',
    'Marketing': '마케팅',
    'Art': '예술',
    'Science': '과학',
    'Education': '교육',
    'Technology': '기술'
};

const getKoreanDomainDisplay = (domain: string): string => {
    if (!domain) return '';
    const koreanName = domainMap[domain] || domain;
    if (koreanName === domain) {
        return `${domain} 분야`;
    }
    return `${koreanName} (${domain}) 분야`;
};

const getLanguageDisplay = (languageValue: string): string => {
    if (!languageValue) return '';
    const lang = LANGUAGES.find(l => l.value === languageValue);
    return `${lang ? lang.label.split(' ')[0] : languageValue} 감지`;
};

export const TranslatorWorkspace: React.FC = () => {
    const [sourceText, setSourceText] = useState<string>('');
    const [translatedText, setTranslatedText] = useState<string>('');
    const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
    const [targetLanguage, setTargetLanguage] = useState<string>('English');
    const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
    const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isReverseModalOpen, setReverseModalOpen] = useState<boolean>(false);
    const [reverseTranslation, setReverseTranslation] = useState<string>('');
    const [isReverseLoading, setReverseLoading] = useState<boolean>(false);
    
    const [showSourceCopySuccess, setShowSourceCopySuccess] = useState<boolean>(false);
    const [isSourceSaveMenuOpen, setSourceSaveMenuOpen] = useState<boolean>(false);
    const sourceSaveMenuRef = useRef<HTMLDivElement>(null);
    
    const [showCopySuccess, setShowCopySuccess] = useState<boolean>(false);
    const [isSaveMenuOpen, setSaveMenuOpen] = useState<boolean>(false);
    const saveMenuRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalFileName, setOriginalFileName] = useState<string | null>(null);

    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const [isHelpModalOpen, setHelpModalOpen] = useState<boolean>(false);

    const [isTranslationEditing, setTranslationEditing] = useState<boolean>(true);
    const [popoverContent, setPopoverContent] = useState<{
        term: ContextualTerm | TerminologyTerm;
        position: { top: number; left: number };
    } | null>(null);

    const sourceRef = useRef<HTMLTextAreaElement>(null);
    const translationRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
    const isSyncingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSynchronizedScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        if (isSyncingRef.current) return;

        const sourceEl = sourceRef.current;
        const translationEl = translationRef.current;
        if (!sourceEl || !translationEl) return;

        const scrollingElement = e.currentTarget;
        const targetElement = scrollingElement === sourceEl ? translationEl : sourceEl;

        const scrollableDist = scrollingElement.scrollHeight - scrollingElement.clientHeight;
        if (scrollableDist <= 0) return;

        const scrollRatio = scrollingElement.scrollTop / scrollableDist;

        isSyncingRef.current = true;
        const targetScrollableDist = targetElement.scrollHeight - targetElement.clientHeight;
        targetElement.scrollTop = Math.round(scrollRatio * targetScrollableDist);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            isSyncingRef.current = false;
        }, 100);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
                setSaveMenuOpen(false);
            }
             if (sourceSaveMenuRef.current && !sourceSaveMenuRef.current.contains(event.target as Node)) {
                setSourceSaveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAnalysis = useCallback(async () => {
        if (!sourceText.trim()) {
            setError("번역할 내용을 입력해주세요.");
            return;
        }
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
                contextAnalysis: result.contextAnalysis,
                terminologyAnalysis: result.terminologyAnalysis,
                styleAnalysis: result.styleAnalysis,
            });
            setTranslationEditing(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setTranslatedText('');
            setAnalysisResults(null);
        } finally {
            setIsLoading(false);
        }
    }, [sourceText, targetLanguage]);
    
    const handleReverseTranslate = useCallback(async () => {
        if (!translatedText.trim() || !sourceLanguage) {
            return;
        }
        setReverseLoading(true);
        try {
            const result = await reverseTranslate(translatedText, sourceLanguage);
            setReverseTranslation(result);
        } catch (e) {
             setReverseTranslation("역번역에 실패했습니다.");
        } finally {
            setReverseLoading(false);
            setReverseModalOpen(true);
        }
    }, [translatedText, sourceLanguage]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
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
            let content: string;
            let fileTypeForPrompt: string;

            if (file.name.endsWith('.docx')) {
                fileTypeForPrompt = 'docx';
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                content = result.value;
            } else if (file.type === 'application/pdf') {
                fileTypeForPrompt = 'pdf';
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
                }
                content = fullText;
            } else if (file.type === 'text/plain') {
                fileTypeForPrompt = 'txt';
                content = await file.text();
            } else {
                throw new Error('Unsupported file type. Please upload .txt, .pdf, or .docx');
            }

            if (content && content.trim()) {
                setLoadingMessage('문서 구조를 분석 중입니다...');
                const markdownText = await structureTextAsMarkdown(content, fileTypeForPrompt);
                setSourceText(markdownText);
            } else {
                setSourceText('');
            }
            setOriginalFileName(file.name);

        } catch (e) {
             setError(e instanceof Error ? e.message : 'Failed to read and structure file.');
        } finally {
            setIsLoading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const handleSourceCopy = () => {
        if (!sourceText) return;
        navigator.clipboard.writeText(sourceText).then(() => {
            setShowSourceCopySuccess(true);
            setTimeout(() => {
                setShowSourceCopySuccess(false);
            }, 2000);
        });
    };

    const handleCopy = () => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText).then(() => {
            setShowCopySuccess(true);
            setTimeout(() => {
                setShowCopySuccess(false);
            }, 2000);
        });
    };

    const handleSourceSaveFile = (format: 'txt' | 'docx') => {
        if (!sourceText) return;

        const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : 'source';
        const filename = `${baseName}.${format}`;

        if (format === 'txt') {
            const blob = new Blob([sourceText], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, filename);
        } else if (format === 'docx') {
            const doc = new Document({
                sections: [{
                    children: sourceText.split('\n').map(p => new Paragraph({ text: p })),
                }],
            });
            Packer.toBlob(doc).then(blob => {
                saveAs(blob, filename);
            });
        }
        setSourceSaveMenuOpen(false);
    };

    const handleSaveFile = (format: 'txt' | 'docx') => {
        if (!translatedText) return;

        const baseName = originalFileName 
            ? originalFileName.replace(/\.[^/.]+$/, "") 
            : 'translation';
        const filename = `${baseName} (Translated).${format}`;

        if (format === 'txt') {
            const blob = new Blob([translatedText], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, filename);
        } else if (format === 'docx') {
            const doc = new Document({
                sections: [{
                    children: translatedText.split('\n').map(p => new Paragraph({ text: p })),
                }],
            });
            Packer.toBlob(doc).then(blob => {
                saveAs(blob, filename);
            });
        }
        setSaveMenuOpen(false);
    };

    // ✨ 텍스트 색상 및 가독성 개선
    const renderHighlightedTranslation = useCallback(() => {
        if (!translatedText || !analysisResults) {
            return (
                 <div 
                    ref={translationRef as React.RefObject<HTMLDivElement>}
                    // 글자가 비어있을때만 회색, 결과가 있으면 밝은 회색(text-gray-100) + 줄간격(leading-relaxed)
                    className={`absolute inset-0 p-4 whitespace-pre-wrap overflow-y-auto ${!translatedText ? 'text-gray-500' : 'text-gray-100 leading-relaxed'}`}
                    onScroll={handleSynchronizedScroll}
                >
                    {translatedText || "AI 번역 결과가 여기에 표시됩니다..."}
                </div>
            );
        }
    
        const contextTerms = analysisResults.contextAnalysis?.map(t => ({ ...t, displayTerm: t.suggestedTranslation, type: 'context' })) || [];
        const terminologyTerms = analysisResults.terminologyAnalysis?.map(t => ({ ...t, displayTerm: t.englishTerm, type: 'terminology' })) || [];
    
        const allTerms = [...contextTerms, ...terminologyTerms];
        const uniqueDisplayTerms = [...new Set(allTerms.map(t => t.displayTerm.trim()).filter(Boolean))];
    
        if (uniqueDisplayTerms.length === 0) {
            return (
                <div 
                    ref={translationRef as React.RefObject<HTMLDivElement>}
                    // 가독성을 위한 text-gray-100 및 leading-relaxed 추가
                    className="absolute inset-0 p-4 text-gray-100 leading-relaxed whitespace-pre-wrap overflow-y-auto"
                    onScroll={handleSynchronizedScroll}
                >
                    {translatedText}
                </div>
            );
        }
    
        const escapedTerms = uniqueDisplayTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
        
        const handleMouseEnter = (termString: string, e: React.MouseEvent) => {
            const termData = allTerms.find(t => t.displayTerm.toLowerCase() === termString.toLowerCase());
            if (termData) {
                setPopoverContent({
                    term: termData,
                    position: { top: e.clientY, left: e.clientX }
                });
            }
        };
    
        const handleMouseLeave = () => {
            setPopoverContent(null);
        };
    
        const parts = translatedText.split(regex);
    
        return (
            <div 
                ref={translationRef as React.RefObject<HTMLDivElement>} 
                // 가독성을 위한 text-gray-100 및 leading-relaxed 추가
                className="absolute inset-0 p-4 text-gray-100 leading-relaxed whitespace-pre-wrap overflow-y-auto"
                onScroll={handleSynchronizedScroll}
            >
                {parts.map((part, index) => {
                    if (uniqueDisplayTerms.some(term => term.toLowerCase() === part.toLowerCase())) {
                        const termData = allTerms.find(t => t.displayTerm.toLowerCase() === part.toLowerCase());
                        
                        // ✨ 하이라이트된 텍스트가 더 잘 보이도록 글자색(text-teal-200, text-indigo-200) 및 굵기(font-semibold) 추가
                        const highlightClass = termData?.type === 'terminology' 
                            ? "bg-teal-900/70 text-teal-200 font-semibold hover:bg-teal-700 hover:text-white" 
                            : "bg-indigo-900/70 text-indigo-200 font-semibold hover:bg-indigo-700 hover:text-white";
                        return (
                            <span 
                                key={index} 
                                className={`${highlightClass} rounded px-1.5 py-0.5 cursor-pointer transition-colors shadow-sm`}
                                onMouseEnter={(e) => handleMouseEnter(part, e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {part}
                            </span>
                        );
                    }
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                })}
            </div>
        );
    }, [translatedText, analysisResults, handleSynchronizedScroll]);

    return (
        <div className="flex w-full h-full gap-4">
            <div className="flex flex-col flex-1 gap-4">
                 {/* Controls */}
                <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-800 p-3 rounded-lg shadow-md">
                     <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <label htmlFor="target-lang-select" className="text-sm font-medium text-gray-300">번역 언어:</label>
                            <select
                                id="target-lang-select"
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                            >
                                {LANGUAGES.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={() => setHelpModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md shadow-sm hover:bg-sky-500 transition-colors"
                            aria-label="사용법 보기"
                        >
                            <HelpCircle className="h-5 w-5" />
                            <span>사용법</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.pdf,.docx" className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        >
                            <Upload className="h-5 w-5" />
                            <span>파일 불러오기</span>
                        </button>
                         <button
                            onClick={handleReverseTranslate}
                            disabled={isLoading || isReverseLoading || !translatedText || !sourceLanguage}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                         >
                             {isReverseLoading ? (
                                <>
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 <span>확인 중...</span>
                                </>
                             ) : (
                                 <>
                                    <ArrowRightLeft className="h-5 w-5" />
                                    <span>역번역 확인</span>
                                 </>
                             )}
                        </button>
                        <button
                            onClick={handleAnalysis}
                            disabled={isLoading || !sourceText.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait transition-colors"
                        >
                           <Sparkles className="h-5 w-5" />
                           <span>번역 및 분석</span>
                        </button>
                    </div>
                </div>

                {/* Text Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
                    {/* Source Panel */}
                    <div className="flex flex-col bg-gray-800 rounded-lg shadow-inner">
                         <div className="flex justify-between items-center p-3 border-b border-gray-700">
                            <div className="flex items-center gap-3 flex-wrap">
                                 <h2 className="text-lg font-semibold">원문 (Source)</h2>
                                 {sourceLanguage && <span className="text-xs bg-gray-700 text-indigo-300 px-2 py-1 rounded-full">{getLanguageDisplay(sourceLanguage)}</span>}
                                 {detectedDomain && <span className="text-xs bg-gray-700 text-teal-300 px-2 py-1 rounded-full">{getKoreanDomainDisplay(detectedDomain)}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={handleSourceCopy}
                                        title="Copy to clipboard"
                                        className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                                        disabled={!sourceText}
                                    >
                                        <Copy className="h-5 w-5" />
                                    </button>
                                    {showSourceCopySuccess && (
                                         <span className="absolute -top-8 right-1/2 translate-x-1/2 px-2 py-1 text-xs text-white bg-green-600 rounded-md whitespace-nowrap">
                                            Copied!
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSourceSaveMenuOpen(prev => !prev)}
                                        title="Save source text"
                                        className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                                        disabled={!sourceText}
                                    >
                                        <Download className="h-5 w-5" />
                                    </button>
                                    {isSourceSaveMenuOpen && (
                                        <div
                                            ref={sourceSaveMenuRef}
                                            className="absolute top-full right-0 mt-2 w-32 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 py-1"
                                        >
                                            <button onClick={() => handleSourceSaveFile('txt')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .txt</button>
                                            <button onClick={() => handleSourceSaveFile('docx')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .docx</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                         <div className="flex-1 relative min-h-0">
                            <textarea
                                ref={sourceRef}
                                onScroll={handleSynchronizedScroll}
                                value={sourceText}
                                onChange={(e) => {
                                    setSourceText(e.target.value);
                                    setOriginalFileName(null);
                                    setDetectedDomain(null);
                                    setSourceLanguage(null);
                                    setAnalysisResults(null);
                                    setTranslatedText('');
                                    setTranslationEditing(true);
                                }}
                                placeholder="번역할 텍스트를 입력하거나 파일을 업로드하세요..."
                                // ✨ 가독성을 위해 text-gray-100 및 leading-relaxed 추가
                                className="absolute inset-0 p-4 bg-transparent text-gray-100 leading-relaxed resize-none focus:outline-none placeholder-gray-500"
                                disabled={isLoading}
                             />
                         </div>
                    </div>
                    {/* Translation Panel */}
                    <div className="flex flex-col bg-gray-800 rounded-lg shadow-inner">
                        <div className="flex justify-between items-center p-3 border-b border-gray-700">
                            <h2 className="text-lg font-semibold">번역문 (Translation)</h2>
                             <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setTranslationEditing(prev => !prev)}
                                    title={isTranslationEditing ? "보기 모드로 전환" : "수정 모드로 전환"}
                                    className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                                    disabled={!translatedText || !analysisResults}
                                >
                                    <Pencil className="h-5 w-5" />
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={handleCopy}
                                        title="Copy to clipboard"
                                        className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                                        disabled={!translatedText}
                                    >
                                        <Copy className="h-5 w-5" />
                                    </button>
                                    {showCopySuccess && (
                                         <span className="absolute -top-8 right-1/2 translate-x-1/2 px-2 py-1 text-xs text-white bg-green-600 rounded-md whitespace-nowrap">
                                            Copied!
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSaveMenuOpen(prev => !prev)}
                                        title="Save translation"
                                        className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                                        disabled={!translatedText}
                                    >
                                        <Download className="h-5 w-5" />
                                    </button>
                                    {isSaveMenuOpen && (
                                        <div
                                            ref={saveMenuRef}
                                            className="absolute top-full right-0 mt-2 w-32 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 py-1"
                                        >
                                            <button onClick={() => handleSaveFile('txt')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .txt</button>
                                            <button onClick={() => handleSaveFile('docx')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .docx</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative min-h-0">
                            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-80 z-10"><Loader message={loadingMessage} /></div>}
                            {error && <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10"><p className="text-red-400 text-center p-4">{error}</p></div>}
                            
                            {isTranslationEditing || !analysisResults ? (
                                <textarea
                                    ref={translationRef as React.RefObject<HTMLTextAreaElement>}
                                    onScroll={handleSynchronizedScroll}
                                    value={translatedText}
                                    onChange={(e) => setTranslatedText(e.target.value)}
                                    placeholder="AI 번역 결과가 여기에 표시됩니다..."
                                    // ✨ 가독성을 위해 text-gray-100 및 leading-relaxed 추가
                                    className="absolute inset-0 p-4 bg-transparent text-gray-100 leading-relaxed resize-none focus:outline-none placeholder-gray-500"
                                />
                            ) : (
                                renderHighlightedTranslation()
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnalysisPanel results={analysisResults} isLoading={isLoading} />

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
