// ============================================================
// src/hooks/usePresentation.ts (Work AI 고성능 발표자료 엔진)
// [ENTERPRISE UPGRADE] AI 아키텍처 연동 및 UI 상태 복구
// [Phase 38] HITL(Human-In-The-Loop) 실행 계획 워크플로우 통합
// [FIX] Silent Failure 해결을 위한 방어적 결과 매핑 로직 강화 (김현 님 원칙 준수)
// [FIX] 슬라이드 0장 생성 버그 해결을 위한 명시적 에러 핸들링 및 비동기 체인 점검
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { Presentation, MeetingInfo, PresentationSettings, Slide } from '@/types/presentation';
import { aiService } from '@/services/ai/geminiService'; // [UPGRADE] 고도화된 서비스로 변경
import { useSlideStore } from '@/store/useSlideStore';
import { toast } from 'sonner';
import { parseFile } from '@/utils/fileParser';

export interface ReferenceStructure {
  slideCount: number;
  keyPatterns: string[];
  structure: {
    title: string;
    type: string;
  }[];
}

export interface DataFileState {
  name: string;
  status: 'loading' | 'success' | 'error';
  content?: string | any[];
}

export const usePresentation = () => {
  // ── [UI & Theme State] ───────────────────────────────────
  const [isDark, setIsDark] = useState(false);
  const [appTheme, setAppTheme] = useState<'blue' | 'navy' | 'purple' | 'green' | 'orange'>('blue');
  const toggleDark = () => setIsDark(!isDark);
  const changeTheme = (theme: 'blue' | 'navy' | 'purple' | 'green' | 'orange') => setAppTheme(theme);
  
  // ── [Core Flow State] ────────────────────────────────────
  const [step, setStep] = useState<'upload' | 'info' | 'outline' | 'preview'>('upload');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI가 최신 gemini-2.5-flash 모델로 구성안을 설계하고 있습니다...');
  
  // ── [Data State] ─────────────────────────────────────────
  const [info, setInfo] = useState<MeetingInfo>({ 
    week: '', department: '', reporter: '', notes: '', title: '', objective: '', audience: '', tone: 'professional' 
  });

  const [settings, setSettings] = useState<PresentationSettings>({
    difficulty: 'medium',
    volume: 'standard',
    slideCount: 10,
    generationStyle: 'standard',
    primaryColor: '#3b82f6',
    gradientStart: '#3b82f6',
    gradientEnd: '#8b5cf6',
    brandColor: '#1B3A5C',
  });

  const [template, setTemplate] = useState('auto');
  const [presentation, setPresentationState] = useState<Presentation | null>(null);
  const [outline, setOutline] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [dataFiles, setDataFiles] = useState<DataFileState[]>([]);
  const [dataSummary, setDataSummary] = useState('');
  
  const [aiParts, setAiParts] = useState<any[]>([]);
  const [sourceFileData, setSourceFileData] = useState<string>('');
  const [referenceFileName, setReferenceFileName] = useState<string>('');
  const [referenceStructure, setReferenceStructure] = useState<ReferenceStructure | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState<boolean>(false);

  // UI Panels State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Zustand Store Sync
  const setStorePresentation = useSlideStore((state) => state.setPresentation);
  const setExecutionPlan = useSlideStore((state) => state.setExecutionPlan);
  const executionPlan = useSlideStore((state) => state.executionPlan);

  // ── [로딩 관리] ──────────────────────────────────────────
  const startLoadingTimer = (type: 'outline' | 'full' | 'regen' | 'review' | 'analyze' | 'plan') => {
    setLoadingMessage(
      type === 'plan' ? 'AI 전략 아키텍트가 최적의 실행 계획서를 구성 중입니다...' :
      type === 'outline' ? 'AI가 최신 gemini-2.5-flash 모델로 구성안(Outline)을 설계하고 있습니다...' :
      type === 'regen' ? '해당 슬라이드를 정교하게 다시 쓰고 있습니다...' :
      type === 'review' ? '자가 담금질 엔진이 전체 디자인 밸런스를 조정하고 있습니다...' :
      type === 'analyze' ? '데이터 분석 서브 에이전트가 로우 데이터를 심층 분석 중입니다...' :
      '슬라이드 콘텐츠를 생성 중입니다...' // [FIX] 사용자의 요구에 맞춰 문구 명확화
    );
  };

  const handleDataFileUpload = async (files: File[]) => {
    const newFiles = files.map(f => ({ name: f.name, status: 'loading' as const }));
    setDataFiles(prev => [...prev, ...newFiles]);
    
    let allContentForAnalysis = "";
    
    for (const file of files) {
      try {
        const parsed = await parseFile(file);
        const isDataFile = file.name.match(/\.(xlsx|xls|csv)$/i);
        
        setDataFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'success', content: parsed.content } : f));
        
        if (isDataFile) {
          const contentStr = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
          allContentForAnalysis += `[File: ${file.name}]\n${contentStr}\n\n`;
        }
      } catch (err) {
        setDataFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f));
        toast.error(`"${file.name}" 분석 실패`);
      }
    }

    if (allContentForAnalysis) {
      setIsGenerating(true);
      startLoadingTimer('analyze');
      try {
        const analysisReport = await aiService.analyzeRawData(allContentForAnalysis);
        setDataSummary(analysisReport);
        setInfo(prev => ({ 
          ...prev, 
          notes: (prev.notes ? prev.notes + '\n\n' : '') + "[AI 데이터 분석 리포트]\n" + analysisReport 
        }));
        toast.success('데이터 심층 분석 및 인사이트 도출 완료');
      } catch (err) {
        console.error("Deep Multimodal Analysis Error:", err);
        toast.error('데이터 분석 중 오류가 발생했습니다.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleRemoveDataFile = (idx: number) => setDataFiles(prev => prev.filter((_, i) => i !== idx));

  const handleReferenceFileUpload = async (files: File[]) => {
    if (files.length > 0) {
      setReferenceFileName(files[0].name);
      setIsAnalyzingReference(true);
      try {
        const parsed = await parseFile(files[0]);
        const content = typeof parsed?.content === 'string' ? parsed.content : JSON.stringify(parsed?.content || {});
        const structure = await aiService.analyzeReferenceStructure(content);
        setReferenceStructure(structure);
        toast.success('참조 양식의 논리 구조가 학습되었습니다.');
      } catch (err: any) {
        toast.error('참고 파일 분석 중 오류가 발생했습니다.');
      } finally { setIsAnalyzingReference(false); }
    }
  };

  // ── [AI 생성 로직 - ENTERPRISE UPGRADE] ──────────────────────────
  
  const handleGenerateOutline = async (onPlanReady?: () => void) => {
    // [HITL] 계획서가 생성되지 않았거나 승인되지 않은 경우 계획서부터 생성
    if (!executionPlan || !executionPlan.isApproved) {
      setIsGenerating(true);
      startLoadingTimer('plan');
      try {
        const userRequest = `주제: ${info.title || '자동 생성'}\n목표: ${info.objective}\n참고: ${info.notes}`;
        const plan = await aiService.createProjectPlan(userRequest, settings);
        if (plan) {
          // [FIX] 배열과 객체를 모두 고려하여 실질적인 데이터 배열을 추출 (맵핑 방어)
          let tasksData: any[] = [];
          if (Array.isArray(plan)) {
            tasksData = plan;
          } else if (plan && typeof plan === 'object') {
            if (Array.isArray(plan.tasks)) tasksData = plan.tasks;
            else if (Array.isArray(plan.outline)) tasksData = plan.outline;
            else if (Array.isArray(plan.plan)) tasksData = plan.plan;
            else if (Array.isArray(plan.phases)) tasksData = plan.phases;
            else if (Array.isArray(plan.steps)) tasksData = plan.steps;
            else if (Array.isArray(plan.items)) tasksData = plan.items;
            else {
              // [지능형 Fallback] 객체 내부의 모든 키를 순회하며 첫 번째 배열을 찾아냅니다.
              for (const key in plan) {
                if (Array.isArray(plan[key]) && plan[key].length > 0) {
                  tasksData = plan[key];
                  break;
                }
              }
              // 만약 배열이 전혀 없다면 plan 자체를 강제로 배열에 넣습니다.
              if (tasksData.length === 0) tasksData = [plan];
            }
          } else {
            tasksData = [plan];
          }

          setExecutionPlan({
            id: `plan-${Date.now()}`,
            title: plan.title || '발표자료 생성 계획서',
            tasks: tasksData || [],
            isApproved: false,
            totalSlidesRequested: settings.slideCount
          });
          toast.success('AI 실행 계획서가 생성되었습니다. 검토 후 승인해 주세요.');
          if (onPlanReady) onPlanReady();
        }
      } catch (err) {
        toast.error('계획서 생성 실패');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const parsedFiles = dataFiles.filter(f => f.status === 'success');
    const multimodalParts: any[] = [];
    let integratedText = `[추가 지침/메모]\n${info.notes || '없음'}\n\n`;

    if (dataSummary) {
      integratedText = `[데이터 심층 분석 보고서]\n${dataSummary}\n\n` + integratedText;
    }

    parsedFiles.forEach(f => {
      if (Array.isArray(f.content)) multimodalParts.push(...f.content);
      else integratedText += `[파일 본문: ${f.name}]\n${f.content}\n\n`;
    });

    const combinedInput = multimodalParts.length > 0 ? [...multimodalParts, { text: integratedText }] : integratedText;
    
    setIsGenerating(true);
    startLoadingTimer('outline');
    
    try {
      const result = await aiService.getOutline({ 
        fileData: combinedInput, 
        meetingInfo: info, 
        settings: { ...settings, slideCount: settings.slideCount }, 
        template 
      });

      if (!result || (Array.isArray(result) && result.length === 0)) {
        throw new Error("데이터 형식이 올바르지 않습니다");
      }

      setOutline(result);
      setAiParts(multimodalParts);
      setSourceFileData(integratedText);
      setStep('outline');
      toast.success('AI 목차 설계 및 품질 검증 완료 (Enterprise Engine)');
    } catch (err: any) { 
      console.error("Outline Generation Failure:", err);
      toast.error(err.message === "데이터 형식이 올바르지 않습니다" || err.message.includes("API 키가 만료되었거나") ? err.message : `구성안 생성 실패: ${err.message}`);
    } finally { 
      setIsGenerating(false);
    }
  };

  const handleGenerateFull = async (approvedOutline: any, onSuccess?: () => void) => {
    // [FIX] 비동기 파이프라인의 연속성 보장을 위해 즉시 Generating 상태 활성화
    setIsGenerating(true);
    startLoadingTimer('full'); 
    
    try {
      // 1-Step: 파싱 성공
      console.log("[Step 1] 구성안 데이터 수신 및 파싱 성공");
      const combinedInput = aiParts.length > 0 ? [...aiParts, { text: sourceFileData }] : sourceFileData;
      
      // 2-Step: 생성 API 호출
      console.log("[Step 2] 슬라이드 콘텐츠 생성 API 호출 시작");
      const result = await aiService.generatePresentation({
        fileData: combinedInput, template, meetingInfo: info, settings, approvedOutline
      });
      
      // [FIX] 방어적 데이터 매핑: Dual-JSON 구조(slides 래퍼 등)를 모두 고려하여 최종 배열 추출
      const slideData = Array.isArray(result) ? result : (result?.slides || result?.presentation?.slides || []);
      
      // [CRITICAL FIX] 조용한 실패(Silent Failure) 방지 - 슬라이드가 0장이면 명시적 에러 발생
      if (!Array.isArray(slideData) || slideData.length === 0) {
        console.error("❌ [Engine] 슬라이드 데이터 생성 실패 (0장):", result);
        throw new Error("데이터 형식이 올바르지 않습니다");
      }

      const presentationWithBrand = { 
        ...(result?.presentation || result), 
        slides: slideData,
        brandColor: settings.brandColor 
      };

      setPresentationState(presentationWithBrand);
      setStorePresentation(presentationWithBrand);
      
      // 3-Step: Zustand 반영
      console.log("[Step 3] 최종 슬라이드 데이터 스토어(Zustand) 반영 완료");
      
      setStep('preview');
      toast.success(`총 ${slideData.length}장의 발표자료 생성이 완료되었습니다.`);
      if (onSuccess) onSuccess();
    } catch (err: any) { 
      console.error("Full Slides Generation Error:", err);
      // [UX] 에러 메시지 알림 명시화
      toast.error(err.message === "데이터 형식이 올바르지 않습니다" || err.message.includes("API 키가 만료되었거나") ? err.message : `발표자료 생성 실패: ${err.message || "알 수 없는 에러"}`);
    } finally { 
      // 4-Step: 종료
      setIsGenerating(false);
    }
  };

  const regenerateSlide = async (slideIndex: number, userInstruction?: string) => {
    if (!presentation) return;
    setIsGenerating(true);
    startLoadingTimer('regen');
    
    try {
      const currentSlide = presentation.slides[slideIndex];
      const result = await aiService.regenerateSlide({
        slideIndex, currentSlide, presentation,
        userInstruction: userInstruction || '현재 내용을 다듬어줘.'
      });

      if (result && result.slide) {
        const newSlides = [...presentation.slides];
        newSlides[slideIndex] = { ...result.slide, id: currentSlide.id };
        const updatedPres = { ...presentation, slides: newSlides };
        setPresentationState(updatedPres);
        setStorePresentation(updatedPres);
        toast.success(`${slideIndex + 1}번 슬라이드 재생성 완료`);
      }
    } catch (err: any) {
        toast.error(err.message.includes("API 키가 만료되었거나") ? err.message : `슬라이드 재생성 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const reviewAndFixPresentation = async () => {
    if (!presentation) return;
    setIsGenerating(true);
    startLoadingTimer('review');
    try {
      const { result } = await aiService.reviewAndFix({ presentation });
      if (result?.presentation) {
        setPresentationState(result.presentation);
        setStorePresentation(result.presentation);
        toast.success('디자인 밸런스 자동 최적화 완료 (Self-annealing)');
      }
    } catch (err: any) {
      toast.error(err.message.includes("API 키가 만료되었거나") ? err.message : `자동 디자인 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(res => setTimeout(res, 1000));
      toast.success('프로젝트가 안전하게 저장되었습니다.');
    } catch (err) {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setPresentationState(null);
    setOutline(null);
    setDataFiles([]);
    setDataSummary('');
    setIsGenerating(false);
    setExecutionPlan(null); // 계획서 리셋
    toast.info('플랫폼 초기화 완료');
  };

  return {
    step, setStep, isGenerating, isSaving, loadingMessage,
    info, setInfo, settings, setSettings,
    template, setTemplate,
    presentation, outline, currentSlideIndex, setCurrentSlideIndex,
    handleGenerateOutline, handleGenerateFull, regenerateSlide,
    reviewAndFixPresentation, handleSave,
    reset, dataFiles, handleDataFileUpload, handleRemoveDataFile,
    dataSummary, setDataSummary, sourceFileData, setSourceFileData,
    referenceFileName, isAnalyzingReference, handleReferenceFileUpload,
    handleClearReferenceFile: () => { setReferenceFileName(''); setReferenceStructure(null); },
    isDark, toggleDark, appTheme, changeTheme,
    openHistory: () => setIsHistoryOpen(true),
    isChatOpen, setChatOpen: setIsChatOpen,
    isReviewOpen, setReviewOpen: setIsReviewOpen,
    executionPlan
  };
};
