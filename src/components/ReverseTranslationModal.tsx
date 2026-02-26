import React from 'react';
import { X } from 'lucide-react'; // 자체 아이콘 대신 lucide-react 사용

interface ReverseTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  reverseTranslation: string;
  targetLanguage: string;
  isLoading: boolean;
}

const ReverseTranslationModal: React.FC<ReverseTranslationModalProps> = ({
  isOpen,
  onClose,
  originalText,
  reverseTranslation,
  targetLanguage,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">역번역 결과 확인</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto" style={{maxHeight: '70vh'}}>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">번역문 (Translation)</h3>
            <p className="bg-gray-900 p-3 rounded-md text-gray-300">{originalText}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">역번역 결과 ({targetLanguage})</h3>
            <div className="bg-gray-900 p-3 rounded-md min-h-[6rem]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent border-solid rounded-full animate-spin"></div>
                  <p className="ml-3 text-gray-400">{targetLanguage}(으)로 번역 중...</p>
                </div>
              ) : (
                <p className="text-gray-300">{reverseTranslation}</p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 pt-2">
            이 역번역 결과는 원문과의 의미 일치성을 검토하는 데 도움을 줍니다. 원문과 역번역 결과의 의미가 다르다면, 번역문을 수정하는 것을 고려해보세요.
          </p>
        </div>

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-right">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 transition-colors"
            >
                닫기
            </button>
        </div>
      </div>
    </div>
  );
};

export default ReverseTranslationModal;
