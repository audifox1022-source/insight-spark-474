import React, { useState, useEffect, useCallback, useRef } from 'react';
import { aiService } from '../lib/ai-service';
import { parseFile } from '../utils/fileParser';
import { toast } from 'sonner';
import { HelpCircle, X } from 'lucide-react';

export type PromptFormat = 'standard' | 'kimura' | 'gpt_park';

export interface ValidationStatus {
  isValid: boolean;
  message: string;
  isWarning?: boolean;
  details?: string;
}

interface EditorSectionProps {
  slideData: string;
  setSlideData: (data: string) => void;
  onGenerateSuccess?: (slideArray: any[]) => void;
  partialResponse?: string;
  generationProgress?: number;
}

interface GptParkInputs {
  topic: string;
  customTopic: string;
  purpose: string;
  customPurpose: string;
  toc: string;
  customToc: string;
}

const EditorSection: React.FC<EditorSectionProps> = ({ 
  slideData, 
  setSlideData, 
  onGenerateSuccess,
  partialResponse = '',
  generationProgress = 0
}) => {
  const [validation, setValidation] = useState<ValidationStatus>({ isValid: true, message: '' });
  const [sourceText, setSourceText] = useState('');
  const [activity, setActivity] = useState<'idle' | 'parsing' | 'analyzing' | 'generating'>('idle');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [promptFormat, setPromptFormat] = useState<PromptFormat>('standard');
  const [isDragging, setIsDragging] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [gptParkInputs, setGptParkInputs] = useState<GptParkInputs>({
    topic: '', customTopic: '',
    purpose: '', customPurpose: '',
    toc: '', customToc: ''
  });

  const handleGptParkInputChange = (field: keyof GptParkInputs, value: string) => {
    setGptParkInputs(prev => ({...prev, [field]: value}));
  };

  const validateJSON = useCallback((jsonText: string) => {
    if (!jsonText || !jsonText.trim()) {
      setValidation({ isValid: true, message: 'JSON 입력 대기 중...' });
      return;
    }

    try {
      // ── [Safe Guard for JSON Parse] ──
      const parsed = JSON.parse(jsonText || "[]");
      if (!Array.isArray(parsed)) {
        throw new Error('slideData는 배열이어야 합니다.');
      }
      
      let warnings: string[] = [];
      (parsed || []).forEach((slide, index) => {
        if (!slide || !slide.type) {
           warnings.push(`슬라이드 ${index + 1}: 'type' 속성이 필요합니다.`);
        }
      });

      if (warnings.length > 0) {
        setValidation({ 
          isValid: true, 
          isWarning: true, 
          message: `JSON 형식: 정상 (${(parsed || []).length}장의 슬라이드)`,
          details: warnings.join('\n') 
        });
      } else {
        setValidation({ 
          isValid: true, 
          message: `JSON 형식: 정상 (${(parsed || []).length}장의 슬라이드)` 
        });
      }
    } catch (error) {
      setValidation({ 
        isValid: false, 
        message: 'JSON 형식: 오류',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  useEffect(() => {
    validateJSON(slideData);
  }, [slideData, validateJSON]);

  const handleFileSelect = async (file: File | null) => {
    if (!file || activity !== 'idle') return;
    setError('');
    setSourceText('');

    try {
      setActivity('parsing');
      const parsedContent = await parseFile(file);
      
      setActivity('analyzing');
      // aiService.analyzeDocument를 사용하여 요약
      const contentStr = typeof parsedContent?.content === 'string' ? parsedContent.content : JSON.stringify(parsedContent?.content || {});
      const summaryResult = await aiService.routeAndCall('analyze', `다음 문서 내용을 핵심 요약해줘. 발표 자료 작성에 활용할 수 있도록 구조화된 형태로 정리해줘:\n\n${contentStr}`, '당신은 문서 분석 및 요약 전문가입니다.');
      setSourceText(typeof summaryResult === 'string' ? summaryResult : JSON.stringify(summaryResult || {}, null, 2));

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '파일 처리 중 오류 발생';
        setError(`파일 분석 오류: ${errorMessage}`);
        toast.error(errorMessage);
    } finally {
        setActivity('idle');
    }
  };
  
  const handleGenerateClick = async () => {
    if (activity !== 'idle') return;
    
    let userPrompt: string;

    if (promptFormat === 'gpt_park') {
      const { topic, customTopic, purpose, customPurpose, toc, customToc } = gptParkInputs;
      const finalTopic = topic === '기타' ? customTopic : topic;
      const finalPurpose = purpose === '기타' ? customPurpose : purpose;
      const finalToc = toc === '기타' ? customToc : toc;

      if (!finalTopic.trim() || !finalPurpose.trim() || !finalToc.trim()) {
        setError('임원 보고용 (전략 요약형)의 모든 필드를 채워주세요.');
        return;
      }
      
      let searchInstruction = '';
      if (useWebSearch) {
        searchInstruction = `
# CRITICAL INSTRUCTION (Search Grounding 필수 제한)
귀하는 반드시 Google Search Tool을 사용하여 이 발표 주제에 관련된 최신 정보를 검색해야만 합니다. 검색 결과(Grounded Data)를 기반으로만 슬라이드 내용과 수치를 구성하고, 절대 허위 정보를 지어내지 마십시오. 검색 시 개인 블로그는 배제하고 공신력 있는 뉴스, 리포트, 논문, 공식 사이트를 우선적으로 참고하십시오.
`;
      }

      userPrompt = `
# 입력 데이터
* 발표 주제: ${finalTopic}
* 발표 목적: ${finalPurpose}
* 핵심 목차 (슬라이드 구조):
${finalToc}

# 발표 원고
${sourceText}
${searchInstruction}
      `;
    } else {
      if (!sourceText.trim() && !useWebSearch) {
        setError('발표 제목이나 내용을 입력해주세요.');
        return;
      }
      if (useWebSearch) {
        userPrompt = `다음 주제에 대해 반드시 Google Search Tool을 사용하여 신뢰할 수 있는 최신 웹 검색 결과를 찾고, 그 데이터를 바탕으로 프레젠테이션을 생성해. 허구의 데이터를 지어내지 말고 검색 결과에 기반해야 해. 개인 블로그는 제외하고, 공신력 있는 뉴스, 보고서, 공식 사이트의 정보를 우선적으로 사용해.\n\n주제: "${sourceText}"`;
      } else {
        userPrompt = sourceText;
      }
    }

    setActivity('generating');
    setError('');

    // Timeout & AbortController (Kill-switch) Setup
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 60000); // 60s timeout

    try {
      // EditorSection 전용 response 처리를 위해 필요한 파라미터 구성
      const res = await aiService.generatePresentation({
        fileData: userPrompt,
        meetingInfo: { week: (promptFormat === 'gpt_park' ? (gptParkInputs?.topic || '새 발표') : (sourceText.slice(0, 20) || '새 발표')), department: '', reporter: '', notes: '' },
        settings: { difficulty: 'medium', volume: 'standard', generationStyle: promptFormat as any, useWebSearch },
        template: 'auto',
        signal: abortController.signal,
        onChunk: (chunk) => {
          // Note: In local state we don't need onChunk if partialResponse is passed from parent
          // But kept for service compatibility.
        }
      });

      const slideArray = res?.presentation?.slides || res?.slides || [];
      const formattedJson = JSON.stringify(slideArray || [], null, 2);
      setSlideData(formattedJson);
      if (onGenerateSuccess) onGenerateSuccess(slideArray || []);
      toast.success('발표자료 생성 완료!');

    } catch (err: any) {
      console.error(err);
      toast.error("발표자료 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setError("발표자료 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      clearTimeout(timeoutId);
      setActivity('idle');
    }
  };


  const handleCopy = () => {
    if (!slideData) return;
    navigator.clipboard.writeText(slideData).then(() => {
      setCopyStatus('복사 완료!');
      setTimeout(() => setCopyStatus(''), 2000);
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
      setCopyStatus('복사 실패.');
      setTimeout(() => setCopyStatus(''), 2000);
    });
  };

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        if (activity === 'idle') {
            setIsDragging(dragging);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvent(e, false);
        // ── [Safe Guard for Drop Files] ──
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ── [Safe Guard for Input Files] ──
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
            if (e.target) e.target.value = ''; // Reset file input
        }
    };


  const validationIcon = validation.isValid ? (validation.isWarning ? '⚠️' : '✅') : '❌';
  
  const spinner = (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const isGenerateDisabled = () => {
    if (activity !== 'idle') return true;
    if (promptFormat === 'gpt_park') {
        const { topic, customTopic, purpose, customPurpose, toc, customToc } = gptParkInputs;
        const finalTopic = topic === '기타' ? customTopic : topic;
        const finalPurpose = purpose === '기타' ? customPurpose : purpose;
        const finalToc = toc === '기타' ? customToc : toc;
        return !finalTopic.trim() || !finalPurpose.trim() || !finalToc.trim();
    }
    return !sourceText.trim() && !useWebSearch;
  };

  const gptParkTocExamples = {
      strategy: `1. Executive Summary
2. 제안 배경 (Why)
3. 핵심 전략 (How)
4. 세부 실행 계획 (What)
5. 필요 자원 및 예산
6. 결론 및 요청`,
      performance: `1. Executive Summary
2. 핵심 성과 (KPI) 요약
3. 세부 실적 분석
4. 성공 요인(Good) 및 개선점(Bad)
5. 향후 계획 및 목표`,
      problemSolving: `1. Executive Summary
2. 문제 정의 (As-Is)
3. 원인 분석
4. 해결 방안 (To-Be)
5. 기대 효과 및 ROI
6. 결론 및 요청사항`,
    newBiz: `1. Executive Summary
2. 제안 배경 및 기회
3. 사업/기술 개요
4. 시장 분석 및 경쟁 환경
5. 사업 추진 전략
6. 재무 계획 및 손익 분석 (BEP, ROI)
7. 결론 및 Next Step`,
    marketAnalysis: `1. Executive Summary
2. 분석의 목적 및 범위
3. 시장 개요 (규모, 성장률, 트렌드)
4. 경쟁 환경 분석 (경쟁사, 제품, 전략)
5. 고객 분석 (세그먼트, 니즈, 페인 포인트)
6. 시사점 및 전략적 제언 (Implications & Recommendations)
7. 결론`,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col relative">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <span className="p-1.5 bg-white/20 rounded-lg">🤖</span>
           AI 슬라이드 생성기
        </h2>
      </div>
      
      <div className="p-6 flex-grow flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
        {/* 스타일 선택 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full" />
              보고 스타일 선택
            </label>
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              title="도움말 보기"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'standard', label: '표준 비즈니스 (기본형)', icon: '📄', color: 'from-blue-600 to-indigo-600' },
              { id: 'kimura', label: '실무 데이터 중심 (상세형)', icon: '✨', color: 'from-indigo-600 to-purple-600' },
              { id: 'gpt_park', label: '임원 보고용 (전략 요약형)', icon: '👑', color: 'from-amber-500 to-orange-600' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setPromptFormat(style.id as PromptFormat)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  promptFormat === style.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-md ring-2 ring-blue-500/10' 
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-white text-2xl shadow-sm`}>
                  {style.icon}
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-bold block ${promptFormat === style.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {style.label}
                  </span>
                  {style.id === promptFormat && (
                    <span className="text-[10px] text-blue-500 font-bold mt-1 block animate-in fade-in slide-in-from-left-2 uppercase tracking-wider">
                      Selected Style Activated
                    </span>
                  )}
                </div>
                {promptFormat === style.id && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 웹 검색 옵션 */}
        <div className={`p-4 rounded-2xl border transition-all ${useWebSearch ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-1">
                  <input
                      type="checkbox"
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                </div>
                <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">🌐 실시간 웹 검색 활용</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        최신 뉴스, 업계 리포트 등 외부 데이터를 AI가 직접 조사하여 내용을 구성합니다.
                    </p>
                </div>
            </label>
        </div>

        {promptFormat === 'gpt_park' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
               <h3 className="text-sm font-black text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-1">
                 <span className="text-lg">👑</span> 임원 보고용 (전략 요약형) 장표 정보 입력
               </h3>
               <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">의사결정에 필요한 핵심 정보를 입력하면 AI가 전략적인 구조로 기획합니다.</p>
            </div>

            {/* Topic */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">1. 발표 주제</label>
                <input 
                  type="text" 
                  value={gptParkInputs.topic === '기타' ? gptParkInputs.customTopic : gptParkInputs.topic} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (gptParkInputs.topic === '기타') handleGptParkInputChange('customTopic', val);
                    else handleGptParkInputChange('topic', val);
                  }} 
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 신규 AI 서비스 런칭 전략"
                />
                <div className="flex flex-wrap gap-2">
                    {[
                        '신규 사업 기획', '실적 보고', '프로젝트 보고', 
                        '경쟁사 분석', '이슈 분석', '시장 동향', '조직 HR', '기타'
                    ].map(val => (
                        <button 
                          key={val} 
                          onClick={() => { handleGptParkInputChange('topic', val); if (val !== '기타') handleGptParkInputChange('customTopic', ''); }} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${gptParkInputs.topic === val ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                          {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Purpose */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">2. 발표 목적</label>
                <input 
                  type="text" 
                  value={gptParkInputs.purpose === '기타' ? gptParkInputs.customPurpose : gptParkInputs.purpose} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (gptParkInputs.purpose === '기타') handleGptParkInputChange('customPurpose', val);
                    else handleGptParkInputChange('purpose', val);
                  }} 
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500"
                  placeholder="최종 의사결정 승인 등"
                />
                <div className="flex flex-wrap gap-2">
                    {[
                        '승인(결재)', '보고(현황)', '설득(기획)', '토론', '자원확보', '기타'
                    ].map(val => (
                        <button 
                          key={val} 
                          onClick={() => { handleGptParkInputChange('purpose', val); if (val !== '기타') handleGptParkInputChange('customPurpose', ''); }} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${gptParkInputs.purpose === val ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                          {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* TOC */}
            <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">3. 핵심 목차 구성</label>
                 <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '전략 제안형', value: gptParkTocExamples.strategy },
                      { label: '실적 보고형', value: gptParkTocExamples.performance },
                      { label: '문제 해결형', value: gptParkTocExamples.problemSolving },
                      { label: '시장 분석형', value: gptParkTocExamples.marketAnalysis }
                    ].map(item => (
                      <button 
                        key={item.label}
                        onClick={() => handleGptParkInputChange('toc', item.value)} 
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${gptParkInputs.toc === item.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                 </div>
                 <textarea 
                   value={gptParkInputs.toc === '기타' ? gptParkInputs.customToc : gptParkInputs.toc} 
                   onChange={e => {
                    const val = e.target.value;
                    if(gptParkInputs.toc === '기타') handleGptParkInputChange('customToc', val);
                    else handleGptParkInputChange('toc', val);
                   }} 
                   className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 min-h-[150px] custom-scrollbar"
                   placeholder="목차를 입력하세요 (라인 단위)"
                 />
            </div>

            {/* File/Text input */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">4. 발표 원고/참고 자료 (선택)</label>
                <div
                    onDragOver={(e) => handleDragEvent(e, true)}
                    onDragLeave={(e) => handleDragEvent(e, false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all
                        ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100'}
                    `}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept=".pdf,.txt,.md,.csv,.xls,.xlsx,.docx" />
                    <div className="flex flex-col items-center">
                        {activity === 'idle' ? (
                          <>
                            <span className="text-3xl mb-2">📁</span>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">파일 업로드</p>
                            <p className="text-[10px] text-slate-400 mt-1">AI가 원고를 분석하여 목차를 채웁니다.</p>
                          </>
                        ) : (
                          <div className="flex items-center gap-3 text-blue-600 font-bold text-sm">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            {activity === 'parsing' ? '문서 읽는 중...' : '데이터 분석 중...'}
                          </div>
                        )}
                    </div>
                </div>
                <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="파일이 없으면 상세 내용을 여기에 직접 붙여넣으세요."
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full" />
              발표 내용 입력
            </label>
            <div
              onDragOver={(e) => handleDragEvent(e, true)}
              onDragLeave={(e) => handleDragEvent(e, false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all
                ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100'}
              `}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept=".pdf,.txt,.md,.csv,.xls,.xlsx,.docx" />
              <div className="flex flex-col items-center">
                {activity === 'idle' ? (
                  <>
                    <span className="text-4xl mb-3">📂</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300">자료 파일을 드래그하세요</p>
                    <p className="text-xs text-slate-400 mt-2 italic">PDF, Word, Excel, Text 등 지원</p>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-indigo-600 font-bold text-sm">
                    <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    처리 중...
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="또는 이곳에 직접 내용을 입력하거나 주제를 적어주세요."
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 focus:ring-2 focus:ring-indigo-500 min-h-[250px] custom-scrollbar"
            />
          </div>
        )}

        {/* 생성 버튼 */}
        <div className="pt-4">
          <button
            onClick={handleGenerateClick}
            disabled={isGenerateDisabled()}
            className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${
              isGenerateDisabled() 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] hover:shadow-blue-500/30 active:scale-[0.98]'
            }`}
          >
            {activity === 'generating' ? spinner : '🚀 매직 프레젠테이션 생성'}
          </button>
          
          {activity === 'generating' && (
            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center text-xs font-bold text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  AI가 전략적 콘텐츠를 스트리밍 중입니다...
                </span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              {partialResponse && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 max-h-[120px] overflow-y-auto custom-scrollbar-premium">
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed italic">
                    {partialResponse.slice(-300)}...
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl animate-bounce">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

        {/* JSON 에디터 섹션 */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                슬라이드 데이터 (JSON)
              </label>
              <button
                onClick={handleCopy}
                disabled={!slideData}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200"
              >
                {copyStatus || '복사하기'}
              </button>
            </div>
            
            <div className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-3 ${validation.isValid ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
               <span className="text-lg">{validationIcon}</span>
               <span>{validation.message}</span>
            </div>
            
            <textarea
              value={slideData}
              onChange={(e) => setSlideData(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-sm font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 min-h-[300px] custom-scrollbar-premium transition-all"
            />
        </div>
      </div>

      {/* 도움말 모달 */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsHelpOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                보고 스타일 가이드
              </h3>
              <button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6 text-left">
              <div className="space-y-2">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">📄 표준 비즈니스 (기본형)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  일반적인 회사 보고, 주간/월간 회의, 사내 공유용 자료 등에 적합합니다. 논리적이고 균형 잡힌 기본 비즈니스 레이아웃을 제공합니다.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">✨ 실무 데이터 중심 (상세형)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  상세한 데이터 분석, 기술 보고서, 연구 결과 발표 등 정보 밀도가 높은 상황에 추천합니다. 표와 수치 데이터를 꼼꼼하게 기술합니다.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">👑 임원 보고용 (전략 요약형)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  결론 위주의 전략적 보고, 의사결정 승인, 기안문 요약 등에 최적화되어 있습니다. 핵심 인사이트와 실행 방안(Next Step)을 강조합니다.
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button onClick={() => setIsHelpOpen(false)} className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorSection;
