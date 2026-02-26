import React from 'react';
import { X, Pencil } from 'lucide-react'; // 자체 아이콘 대신 lucide-react 사용

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-lg font-semibold text-indigo-400 mt-4 mb-2">{children}</h3>
  );

  const ListItem: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <li className="mt-2">
      <p><strong className="text-gray-300">{title}:</strong> {children}</p>
    </li>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">"번역의 정석" 사용 가이드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <SectionTitle>개요</SectionTitle>
          <p className="text-gray-300">
            "번역의 정석"은 Gemini AI를 활용한 전문 번역 워크스페이스입니다. 단순 번역을 넘어, AI가 텍스트의 전문 분야를 자동으로 파악하고 문맥, 용어, 문체를 심층 분석하여 고품질 번역을 돕습니다. 파일 업로드, 역번역, 대화형 분석 등 다양한 편의 기능을 제공하여 번역 작업의 효율을 극대화합니다.
          </p>

          <SectionTitle>사용 매뉴얼</SectionTitle>
          <ol className="list-decimal list-inside space-y-4 text-gray-300">
            <li>
              <strong className="text-gray-200">텍스트 입력</strong>
              <ul className="list-disc list-inside pl-6 mt-2 text-sm space-y-1">
                <ListItem title="직접 입력">
                  좌측 '원문' 패널에 텍스트를 붙여넣거나 직접 작성합니다.
                </ListItem>
                <ListItem title="파일 불러오기">
                  '파일 불러오기' 버튼으로 <strong>.txt, .pdf, .docx</strong> 파일을 업로드하면, AI가 문서의 구조(제목, 목록 등)를 자동으로 분석하여 '원문' 창에 마크다운 형식으로 변환해 표시합니다.
                </ListItem>
              </ul>
            </li>
            <li>
              <strong className="text-gray-200">번역 및 분석 실행</strong>
              <ul className="list-disc list-inside pl-6 mt-2 text-sm space-y-1">
                 <ListItem title="번역 언어 선택">
                  번역하고 싶은 언어를 드롭다운 메뉴에서 선택합니다. (기본값: English)
                </ListItem>
                 <ListItem title="분석 시작">
                  '번역 및 분석' 버튼을 클릭합니다.
                </ListItem>
                 <ListItem title="결과 확인">
                  AI가 자동으로 원문의 언어와 전문 분야를 감지하고, 우측 '번역문' 패널에 번역 결과를 표시합니다. 동시에 가장 오른쪽의 'AI 분석 패널'에서 상세 분석 결과를 확인할 수 있습니다.
                </ListItem>
              </ul>
            </li>
             <li>
              <strong className="text-gray-200">결과 확인 및 활용</strong>
              <ul className="list-disc list-inside pl-6 mt-2 text-sm space-y-1">
                  <ListItem title="대화형 분석">
                    번역문 내에서 AI가 분석한 주요 용어는 <span className="bg-indigo-900/60 rounded px-1">하이라이트</span> 처리됩니다. 하이라이트된 용어에 마우스를 올리면 AI의 상세 분석 내용을 팝업으로 바로 확인할 수 있습니다.
                  </ListItem>
                  <ListItem title="번역문 수정">
                    번역문 패널 상단의 수정(<Pencil className="inline h-4 w-4 mx-1" />) 아이콘을 클릭하면 번역문을 직접 편집할 수 있는 모드로 전환됩니다.
                  </ListItem>
                 <ListItem title="역번역 확인">
                  번역문의 의미가 원문과 일치하는지 검토하고 싶을 때 '역번역 확인' 버튼을 누르면, 번역문을 다시 원문 언어로 번역한 결과를 팝업으로 보여줍니다.
                </ListItem>
                 <ListItem title="복사 및 저장">
                  각 패널 상단의 복사 및 다운로드 아이콘을 사용하여 원문과 번역문을 클립보드에 복사하거나, <strong>.txt</strong> 또는 <strong>.docx</strong> 파일로 저장할 수 있습니다.
                </ListItem>
              </ul>
            </li>
          </ol>
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

export default HelpModal;
