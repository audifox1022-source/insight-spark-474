import React from 'react';

// ✨ [경로 수정됨]
import type { ContextualTerm, TerminologyTerm } from '@/types/translation';

interface PopoverProps {
  content: {
    term: ContextualTerm | TerminologyTerm;
    position: { top: number; left: number };
  } | null;
}

const isTerminologyTerm = (term: any): term is TerminologyTerm => {
    return 'englishTerm' in term && 'description' in term;
};

const AnalysisPopover: React.FC<PopoverProps> = ({ content }) => {
  if (!content) return null;

  const { term, position } = content;
  const popoverStyle = {
    top: `${position.top + 15}px`,
    left: `${position.left + 15}px`,
  };

  return (
    <div
      className="fixed bg-gray-900 border border-indigo-500 rounded-lg shadow-xl p-3 max-w-xs z-50 text-sm text-white pointer-events-none animate-fade-in"
      style={popoverStyle}
    >
      {isTerminologyTerm(term) ? (
        <>
          <p className="font-bold text-teal-400">{term.koreanTerm} &rarr; {term.englishTerm}</p>
          <p className="text-gray-300 mt-1">{term.description}</p>
        </>
      ) : (
        <>
          <p className="font-bold text-indigo-400">{term.koreanTerm}</p>
          <p><span className="font-semibold text-gray-300">추천:</span> {(term as ContextualTerm).suggestedTranslation}</p>
          <p className="text-sm text-gray-400"><span className="font-semibold">대안:</span> {(term as ContextualTerm).alternatives}</p>
        </>
      )}
    </div>
  );
};

export default AnalysisPopover;
