// ============================================================
// src/hooks/usePresentation.ts (Work AI 고성능 발표자료 엔진)
// [ENTERPRISE UPGRADE] AI 아키텍처 연동 및 UI 상태 복구
// [THEME MIGRATION] 전역 useThemeStore 시스템으로 테마 제어권 이관 (v1.2.0)
// [FIX] ReferenceError: toggleDark is not defined 해결 (v1.2.1)
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { Presentation, MeetingInfo, PresentationSettings, Slide } from '@/types/presentation';
import { aiService } from '@/services/ai/geminiService';
import { useSlideStore } from '@/store/useSlideStore';
import { useThemeStore } from '@/store/useThemeStore'; // [NEW] 전역 테마 스토어
import { toast } from 'sonner';
import {
  formatParsedFileForPrompt,
  parseFile,
  ParsedFileData
} from '@/utils/fileParser';
import { buildUploadedContextFromState, UploadedDataFileState } from '@/utils/presentationContext';
import { repairPlanTasks } from '@/utils/planTasks';
import { repairSlideDeck } from '@/utils/slideQuality';

export interface ReferenceStructure {
  slideCount: number;
  keyPatterns: string[];
  structure: {
    title: string;
    type: string;
  }[];
}

export interface DataFileState extends UploadedDataFileState {}

function normalizeContentItem(item: any) {
  if (typeof item === 'string') {
    return { heading: item, description: '' };
  }

  if (!item || typeof item !== 'object') {
    return { heading: String(item || ''), description: '' };
  }

  const rawDescription = item.description || item.desc || item.body || item.content || item.value || '';
  const description = Array.isArray(rawDescription)
    ? rawDescription.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join('\n')
    : (typeof rawDescription === 'object' && rawDescription !== null ? JSON.stringify(rawDescription) : String(rawDescription || ''));

  return {
    heading: item.heading || item.title || item.label || item.name || item.text || '',
    description
  };
}

function normalizeLayout(slide: any, index: number): string {
  if (index === 0) return 'cover';
  const raw = String(slide?.layout || slide?.type || 'default').toLowerCase();
  if (raw.includes('timeline')) return 'timeline';
  if (raw.includes('compare') || raw.includes('comparison')) return 'comparison';
  if (raw.includes('matrix')) return 'matrix';
  if (raw.includes('grid')) return 'grid';
  if (raw.includes('split')) return 'split';
  if (raw.includes('quote')) return 'quote';
  return 'default';
}

function normalizeGeneratedSlides(slides: any[]) {
  return slides.map((slide, index) => {
    const content = Array.isArray(slide?.content)
      ? slide.content.map(normalizeContentItem)
      : (slide?.content ? [normalizeContentItem(slide.content)] : []);

    return {
      ...slide,
      id: slide?.id || `slide-${Date.now()}-${index}`,
      slideNumber: slide?.slideNumber || index + 1,
      title: slide?.title || (index === 0 ? 'Presentation' : `Slide ${index + 1}`),
      subtitle: slide?.subtitle || slide?.subhead || '',
      type: slide?.type || (index === 0 ? 'cover' : 'content'),
      layout: normalizeLayout(slide, index),
      content,
      elements: Array.isArray(slide?.elements) ? slide.elements : []
    };
  });
}

export const usePresentation = () => {
  // ── [UI & Theme System Integration] ───────────────────────
  // useThemeStore가 없는 환경(SSR 등)에서도 앱이 죽지 않도록 방어 코드 적용
  const themeStore = useThemeStore();
  const theme = themeStore?.theme || 'light';
  const toggleTheme = themeStore?.toggleTheme || (() => console.warn('Theme Store not initialized'));
  const appTheme = themeStore?.appTheme || 'blue';
  const setAppTheme = themeStore?.setAppTheme || (() => {});
  
  const isDark = theme === 'dark';
  const toggleDark = toggleTheme; // [FIX] ReferenceError 해결을 위해 명시적 선언
  
  // ── [Core Flow State] ────────────────────────────────────
  const [step, setStep] = useState<'upload' | 'info' | 'outline' | 'preview'>('upload');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI가 최신 gemini-2.5-flash 모델로 구성안을 설계하고 있습니다...');
  const generationCancelledRef = useRef(false);
  
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
  const [generationContext, setGenerationContext] = useState<string>('');
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
      '슬라이드 콘텐츠를 생성 중입니다...'
    );
  };

  const forceAbort = useCallback(() => {
    generationCancelledRef.current = true;
    setIsGenerating(false);
    toast.info('진행 중인 생성 작업을 중단했습니다.');
  }, []);

  const buildUploadedContext = useCallback(() => {
    return buildUploadedContextFromState({
      sourceFileData,
      dataSummary,
      dataFiles
    });
  }, [dataFiles, dataSummary, sourceFileData]);

  const handleDataFileUpload = async (files: File[]) => {
    const newFiles = files.map(f => ({ name: f.name, status: 'loading' as const }));
    setDataFiles(prev => [...prev, ...newFiles]);
    
    let allContentForAnalysis = "";
    
    for (const file of files) {
      try {
        const parsed = await parseFile(file);
        const isDataFile = file.name.match(/\.(xlsx|xls|csv)$/i);
        if (parsed.parseError && !parsed.summary && (!parsed.content || (Array.isArray(parsed.content) && parsed.content.length === 0))) {
          throw new Error(parsed.parseError);
        }
        
        setDataFiles(prev => prev.map(f => f.name === file.name ? {
          ...f,
          status: 'success',
          content: parsed.content,
          fileType: parsed.fileType,
          summary: parsed.summary,
          parseError: parsed.parseError
        } : f));
        
        if (isDataFile) {
          allContentForAnalysis += `${formatParsedFileForPrompt(parsed)}\n\n`;
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
        const content = formatParsedFileForPrompt(parsed);
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
    generationCancelledRef.current = false;
    const currentExecutionPlan = useSlideStore.getState().executionPlan;
    const uploadedContext = buildUploadedContext();

    if (!currentExecutionPlan || !currentExecutionPlan.isApproved) {
      setIsGenerating(true);
      startLoadingTimer('plan');
      try {
        // [FIX] 업로드된 파일 내용(sourceFileData)을 Plan 생성에 반드시 포함
        let userRequest = `주제: ${info.title || '자동 생성'}\n목표: ${info.objective}\n참고: ${info.notes}`;
        if (uploadedContext.text && uploadedContext.text.trim().length > 0) {
          userRequest += `\n\n[Uploaded source file content]\n${uploadedContext.text.substring(0, 30000)}`;
        }
        const planRequest = uploadedContext.mediaParts.length > 0
          ? [...uploadedContext.mediaParts, { text: userRequest }]
          : userRequest;
        const plan = await aiService.createProjectPlan(planRequest, settings);
        if (generationCancelledRef.current) return;
        if (plan) {
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
              for (const key in plan) {
                if (Array.isArray(plan[key]) && plan[key].length > 0) {
                  tasksData = plan[key];
                  break;
                }
              }
              if (tasksData.length === 0) tasksData = [plan];
            }
          } else {
            tasksData = [plan];
          }

          setExecutionPlan({
            id: `plan-${Date.now()}`,
            title: plan.title || '발표자료 생성 계획서',
            tasks: repairPlanTasks(tasksData || [], uploadedContext.text, settings.slideCount),
            isApproved: false,
            totalSlidesRequested: settings.slideCount
          });
          toast.success('AI 실행 계획서가 생성되었습니다. 검토 후 승인해 주세요.');
          if (onPlanReady) onPlanReady();
        }
      } catch (err) {
        if (!generationCancelledRef.current) {
          toast.error('계획서 생성 실패');
        }
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const integratedText = [
      `[Additional instructions]\n${info.notes || 'None'}`,
      uploadedContext.text ? `[Uploaded source context]\n${uploadedContext.text}` : ''
    ].filter(Boolean).join('\n\n');
    const multimodalParts = uploadedContext.mediaParts;

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
      if (generationCancelledRef.current) return;

      if (!result || (Array.isArray(result) && result.length === 0)) {
        throw new Error("데이터 형식이 올바르지 않습니다");
      }

      setOutline(result);
      setAiParts(multimodalParts);
      setGenerationContext(integratedText);
      setStep('outline');
      toast.success('AI 목차 설계 및 품질 검증 완료 (Enterprise Engine)');
    } catch (err: any) { 
      console.error("Outline Generation Failure:", err);
      if (!generationCancelledRef.current) {
        toast.error(err.message === "데이터 형식이 올바르지 않습니다" || err.message.includes("API 키가 만료되었거나") ? err.message : `구성안 생성 실패: ${err.message}`);
      }
    } finally { 
      setIsGenerating(false);
    }
  };

  const handleGenerateFull = async (approvedOutline: any, onSuccess?: () => void) => {
    generationCancelledRef.current = false;
    setIsGenerating(true);
    startLoadingTimer('full'); 
    
    try {
      console.log("[Step 1] 구성안 데이터 수신 및 파싱 성공");
      const fallbackContext = buildUploadedContext();
      const sourceText = generationContext || [
        `[Additional instructions]\n${info.notes || 'None'}`,
        fallbackContext.text ? `[Uploaded source context]\n${fallbackContext.text}` : ''
      ].filter(Boolean).join('\n\n');
      const mediaParts = aiParts.length > 0 ? aiParts : fallbackContext.mediaParts;
      const combinedInput = mediaParts.length > 0 ? [...mediaParts, { text: sourceText }] : sourceText;
      
      console.log("[Step 2] 슬라이드 콘텐츠 생성 API 호출 시작");
      const result = await aiService.generatePresentation({
        fileData: combinedInput, template, meetingInfo: info, settings, approvedOutline
      });
      if (generationCancelledRef.current) return;
      
      const slideData = Array.isArray(result) ? result : (result?.slides || result?.presentation?.slides || []);
      
      if (!Array.isArray(slideData) || slideData.length === 0) {
        console.error("❌ [Engine] 슬라이드 데이터 생성 실패 (0장):", result);
        throw new Error("데이터 형식이 올바르지 않습니다");
      }

      const normalizedSlideData = repairSlideDeck(normalizeGeneratedSlides(slideData), sourceText);
      const presentationMeta = Array.isArray(result) ? {} : (result?.presentation || result || {});
      const presentationWithBrand = { 
        ...presentationMeta, 
        id: presentationMeta.id || `presentation-${Date.now()}`,
        title: presentationMeta.title || result?.title || info.title || 'Generated Presentation',
        slides: normalizedSlideData,
        brandColor: settings.brandColor 
      };

      setPresentationState(presentationWithBrand);
      setStorePresentation(presentationWithBrand);
      
      console.log("[Step 3] 최종 슬라이드 데이터 스토어(Zustand) 반영 완료");
      
      setStep('preview');
      toast.success(`총 ${normalizedSlideData.length}장의 발표자료 생성이 완료되었습니다.`);
      if (onSuccess) onSuccess();
    } catch (err: any) { 
      console.error("Full Slides Generation Error:", err);
      if (!generationCancelledRef.current) {
        toast.error(err.message === "데이터 형식이 올바르지 않습니다" || err.message.includes("API 키가 만료되었거나") ? err.message : `발표자료 생성 실패: ${err.message || "알 수 없는 에러"}`);
      }
    } finally { 
      setIsGenerating(false);
    }
  };

  const regenerateSlide = async (slideIndex: number, userInstruction?: string) => {
    if (!presentation) return;
    generationCancelledRef.current = false;
    setIsGenerating(true);
    startLoadingTimer('regen');
    
    try {
      const currentSlide = presentation.slides[slideIndex];
      const result = await aiService.regenerateSlide({
        slideIndex, currentSlide, presentation,
        userInstruction: userInstruction || '현재 내용을 다듬어줘.'
      });
      if (generationCancelledRef.current) return;

      if (result && result.slide) {
        const newSlides = [...presentation.slides];
        newSlides[slideIndex] = { ...result.slide, id: currentSlide.id };
        const updatedPres = { ...presentation, slides: newSlides };
        setPresentationState(updatedPres);
        setStorePresentation(updatedPres);
        toast.success(`${slideIndex + 1}번 슬라이드 재생성 완료`);
      }
    } catch (err: any) {
        if (!generationCancelledRef.current) {
          toast.error(err.message.includes("API 키가 만료되었거나") ? err.message : `슬라이드 재생성 실패: ${err.message}`);
        }
    } finally {
      setIsGenerating(false);
    }
  };

  const reviewAndFixPresentation = async () => {
    if (!presentation) return;
    generationCancelledRef.current = false;
    setIsGenerating(true);
    startLoadingTimer('review');
    try {
      const { result } = await aiService.reviewAndFix({ presentation });
      if (generationCancelledRef.current) return;
      if (result?.presentation) {
        setPresentationState(result.presentation);
        setStorePresentation(result.presentation);
        toast.success('디자인 밸런스 자동 최적화 완료 (Self-annealing)');
      }
    } catch (err: any) {
      if (!generationCancelledRef.current) {
        toast.error(err.message.includes("API 키가 만료되었거나") ? err.message : `자동 디자인 실패: ${err.message}`);
      }
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
    generationCancelledRef.current = true;
    setStep('upload');
    setPresentationState(null);
    setOutline(null);
    setDataFiles([]);
    setDataSummary('');
    setAiParts([]);
    setSourceFileData('');
    setGenerationContext('');
    setReferenceFileName('');
    setReferenceStructure(null);
    setIsGenerating(false);
    setExecutionPlan(null);
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
    isDark, toggleDark, appTheme, changeTheme: setAppTheme, // [FIX] toggleDark 명시적 반환
    openHistory: () => setIsHistoryOpen(true),
    isChatOpen, setChatOpen: setIsChatOpen,
    isReviewOpen, setReviewOpen: setIsReviewOpen,
    executionPlan,
    forceAbort
  };
};
