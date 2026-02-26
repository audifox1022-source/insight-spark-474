import React, { useState, useRef, useEffect } from 'react';
import saveAs from 'file-saver';

// ✨ [경로 수정됨]
import type { AnalysisResults } from '@/types/translation';
import { AnalysisType } from '@/types/translation';

import { IconContext, IconTerminology, IconStyle, IconCopy, IconDownload } from './Icon';
import Loader from './Loader';

interface AnalysisPanelProps {
  results: AnalysisResults | null;
  isLoading: boolean;
}

const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
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
        const combinedKorean = koreanParts.join(' 및 ');
        return `${combinedKorean} (${englishValue})`;
    }

    const foundKey = Object.keys(map).find(key => key.toLowerCase() === englishValue.toLowerCase());
    if (foundKey) {
        return `${map[foundKey]} (${foundKey})`;
    }
    
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      return <div className="mt-8"><Loader /></div>;
    }
    if (!results) {
      return (
        <div className="text-center text-gray-400 mt-8 px-4">
          <IconContext className="mx-auto h-12 w-12 text-gray-500" />
          <p className="mt-4 text-sm">"번역 및 분석" 버튼을 클릭하여 AI 어시스턴트의 제안을 확인하세요.</p>
        </div>
      );
    }

    switch (activeTab) {
      case AnalysisType.CONTEXT:
        return (
          <div className="space-y-3">
            {results.contextAnalysis.length > 0 ? results.contextAnalysis.map((term, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-md">
                <p className="font-bold text-indigo-400">{term.koreanTerm}</p>
                <p><span className="font-semibold text-gray-300">추천:</span> {term.suggestedTranslation}</p>
                <p className="text-sm text-gray-400"><span className="font-semibold">대안:</span> {term.alternatives}</p>
              </div>
            )) : <p className="text-gray-400 text-sm p-4">문맥상 애매한 표현이 발견되지 않았습니다.</p>}
          </div>
        );
      case AnalysisType.TERMINOLOGY:
        const hasTerms = results.terminologyAnalysis && results.terminologyAnalysis.length > 0;
        return (
          <>
            {hasTerms && (
                <div className="flex justify-end items-center mb-3 gap-2">
                   <div className="relative">
                        <button
                            onClick={handleCopyTerms}
                            title="용어 목록 복사"
                            className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            <IconCopy className="h-5 w-5" />
                        </button>
                        {showCopySuccess && (
                             <span className="absolute -top-8 right-1/2 translate-x-1/2 px-2 py-1 text-xs text-white bg-green-600 rounded-md whitespace-nowrap">
                                복사 완료!
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setTermMenuOpen(prev => !prev)}
                            title="용어 목록 저장"
                            className="p-1.5 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            <IconDownload className="h-5 w-5" />
                        </button>
                        {isTermMenuOpen && (
                            <div
                                ref={termMenuRef}
                                className="absolute top-full right-0 mt-2 w-32 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 py-1"
                            >
                                <button onClick={() => handleDownloadTerms('txt')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .txt</button>
                                <button onClick={() => handleDownloadTerms('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600">as .csv</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="space-y-3">
              {hasTerms ? results.terminologyAnalysis.map((term, index) => (
                <div key={index} className="bg-gray-700 p-3 rounded-md">
                  <p className="font-bold text-teal-400">{term.koreanTerm} &rarr; {term.englishTerm}</p>
                  <p className="text-sm text-gray-400">{term.description}</p>
                </div>
              )) : <p className="text-gray-400 text-sm p-4">전문 용어가 발견되지 않았습니다.</p>}
            </div>
          </>
        );
      case AnalysisType.STYLE:
        const { styleAnalysis } = results;
        if (!styleAnalysis) {
             return <p className="text-gray-400 text-sm p-4">스타일 분석 결과를 불러올 수 없습니다.</p>;
        }
        const score = styleAnalysis.consistencyScore;
        const formattedFormality = getMappedStyleValue(styleAnalysis.formality, formalityMap);
        const formattedTone = getMappedStyleValue(styleAnalysis.tone, toneMap);

        return (
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-gray-300">일치도 (Consistency Score)</h4>
                        <span className="text-sm font-bold text-white">{score} / 10</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                        <div className={`${getScoreColor(score)} h-2.5 rounded-full`} style={{ width: `${score * 10}%` }}></div>
                    </div>
                </div>

                <div className="bg-gray-700 p-3 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">격식 (Formality):</span>
                        <span className="font-semibold text-gray-200">{formattedFormality}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">어조 (Tone):</span>
                        <span className="font-semibold text-gray-200">{formattedTone}</span>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-300 mb-2">개선 제안 (Feedback)</h4>
                    <p className="text-sm text-gray-400 bg-gray-700 p-3 rounded-md">{styleAnalysis.feedback}</p>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  const getTabClass = (tab: AnalysisType) => {
    return `flex-1 py-2 px-1 text-center text-sm font-medium border-b-2 cursor-pointer transition-colors ${
      activeTab === tab 
      ? 'border-indigo-500 text-indigo-400' 
      : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'
    }`;
  };

  return (
    <div className="w-full max-w-sm flex flex-col bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex-shrink-0">
          <div className="flex items-center p-4 border-b border-gray-700">
             <h2 className="text-lg font-semibold">AI 분석 패널</h2>
          </div>
          <div className="flex border-b border-gray-700">
            <button onClick={() => setActiveTab(AnalysisType.CONTEXT)} className={getTabClass(AnalysisType.CONTEXT)}>문맥</button>
            <button onClick={() => setActiveTab(AnalysisType.TERMINOLOGY)} className={getTabClass(AnalysisType.TERMINOLOGY)}>용어</button>
            <button onClick={() => setActiveTab(AnalysisType.STYLE)} className={getTabClass(AnalysisType.STYLE)}>문체</button>
          </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default AnalysisPanel;
