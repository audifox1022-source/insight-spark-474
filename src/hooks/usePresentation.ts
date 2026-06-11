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
import { parseFile } from '@/utils/fileParser';
import { normalizePresentationSlides } from '@/utils/presentation-normalizer';
import { appendInsightBriefToPrompt, buildInsightBrief } from '@/lib/insight-brief';
import { buildPresentationFromResult } from '@/lib/presentation-result';
import { enforceSlideCountContract } from '@/lib/slide-count-contract';
import { alignSlidesToApprovedOutline } from '@/lib/outline-contract';
import { mergeRegeneratedSlide } from '@/lib/slide-regeneration-contract';
import { mergeReviewedPresentation } from '@/lib/presentation-review-contract';
import { buildPresentationBriefPromptContext } from '@/lib/presentation-prompt-context';
import { createDefaultMeetingInfo, normalizeMeetingInfo } from '@/lib/meeting-info';
import {
  deletePresentation,
  loadPresentations,
  normalizeSavedAspectRatio,
  savePresentation,
  type SavedPresentation,
} from '@/lib/presentation-storage';

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
  const [info, setInfo] = useState<MeetingInfo>(() => createDefaultMeetingInfo());

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
  const [savedPresentations, setSavedPresentations] = useState<SavedPresentation[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Zustand Store Sync
  const setStorePresentation = useSlideStore((state) => state.setPresentation);
  const storeAspectRatio = useSlideStore((state) => state.aspectRatio);
  const setStoreAspectRatio = useSlideStore((state) => state.setAspectRatio);
  const resetSlideStore = useSlideStore((state) => state.reset);
  const setExecutionPlan = useSlideStore((state) => state.setExecutionPlan);
  const executionPlan = useSlideStore((state) => state.executionPlan);

  const buildCurrentInsightBrief = () => buildInsightBrief({
    meetingInfo: info,
    settings,
    template,
    dataSummary,
    sourceFileData,
    dataFiles,
    referenceStructure,
  });

  const refreshSavedPresentations = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const items = await loadPresentations();
      setSavedPresentations(items);
    } catch (err) {
      console.error('Saved presentation list load failed:', err);
      toast.error('저장 목록을 불러오지 못했습니다.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const openHistoryPanel = useCallback(() => {
    setIsHistoryOpen(true);
    void refreshSavedPresentations();
  }, [refreshSavedPresentations]);

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
    generationCancelledRef.current = false;

    if (!executionPlan || !executionPlan.isApproved) {
      setIsGenerating(true);
      startLoadingTimer('plan');
      try {
        // [FIX] 업로드된 파일 내용(sourceFileData)을 Plan 생성에 반드시 포함
        let userRequest = buildPresentationBriefPromptContext(info);
        if (sourceFileData && sourceFileData.trim().length > 0) {
          userRequest += `\n\n[업로드된 원본 문서 내용]\n${sourceFileData.substring(0, 15000)}`;
        }
        const insightBrief = buildCurrentInsightBrief();
        userRequest = appendInsightBriefToPrompt(userRequest, insightBrief);
        const plan = await aiService.createProjectPlan(userRequest, settings);
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
            tasks: tasksData || [],
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

    const parsedFiles = dataFiles.filter(f => f.status === 'success');
    const multimodalParts: any[] = [];
    let integratedText = `${buildPresentationBriefPromptContext(info)}\n\n`;

    // [FIX] 업로드 파일 원본 내용(sourceFileData)을 반드시 통합 텍스트에 포함
    if (sourceFileData && sourceFileData.trim().length > 0) {
      integratedText += `[업로드된 원본 문서 내용]\n${sourceFileData}\n\n`;
    }

    if (dataSummary) {
      integratedText = `[데이터 심층 분석 보고서]\n${dataSummary}\n\n` + integratedText;
    }

    parsedFiles.forEach(f => {
      if (Array.isArray(f.content)) multimodalParts.push(...f.content);
      else integratedText += `[파일 본문: ${f.name}]\n${f.content}\n\n`;
    });

    const insightBrief = buildCurrentInsightBrief();
    integratedText = appendInsightBriefToPrompt(integratedText, insightBrief);

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
      setSourceFileData(integratedText);
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
      const insightBrief = buildCurrentInsightBrief();
      const insightEnhancedSource = appendInsightBriefToPrompt(sourceFileData, insightBrief);
      const combinedInput = aiParts.length > 0 ? [...aiParts, { text: insightEnhancedSource }] : insightEnhancedSource;
      
      console.log("[Step 2] 슬라이드 콘텐츠 생성 API 호출 시작");
      const result = await aiService.generatePresentation({
        fileData: combinedInput, template, meetingInfo: info, settings, approvedOutline, insightBrief
      });
      if (generationCancelledRef.current) return;
      
      const normalizedSlides = normalizePresentationSlides(result);
      const slideCountContract = enforceSlideCountContract(normalizedSlides, { settings, approvedOutline });
      const outlineContract = alignSlidesToApprovedOutline(slideCountContract.slides, approvedOutline);
      const slideData = outlineContract.slides;
      
      if (!Array.isArray(slideData) || slideData.length === 0) {
        console.error("❌ [Engine] 슬라이드 데이터 생성 실패 (0장):", result);
        throw new Error("데이터 형식이 올바르지 않습니다");
      }

      const presentationWithBrand = buildPresentationFromResult({
        rawResult: result,
        slides: slideData,
        fallbackTitle: approvedOutline?.presentation_title || approvedOutline?.title || info.title || '발표자료',
        brandColor: settings.brandColor,
      });

      setPresentationState(presentationWithBrand);
      setStorePresentation(presentationWithBrand);
      
      console.log("[Step 3] 최종 슬라이드 데이터 스토어(Zustand) 반영 완료");
      if (slideCountContract.adjusted) {
        console.info(
          `[Slide Count Contract] ${slideCountContract.originalCount} -> ${slideCountContract.actualCount} (${slideCountContract.action})`
        );
      }
      if (outlineContract.adjusted) {
        console.info(
          `[Outline Contract] aligned ${outlineContract.alignedCount}/${outlineContract.outlineCount} slides`
        );
      }
      
      setStep('preview');
      toast.success(
        slideCountContract.adjusted
          ? `요청한 ${slideData.length}장 구성에 맞춰 발표자료 생성을 완료했습니다.`
          : `총 ${slideData.length}장의 발표자료 생성이 완료되었습니다.`
      );
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
        const regenerationContract = mergeRegeneratedSlide(currentSlide, result.slide, slideIndex);
        newSlides[slideIndex] = regenerationContract.slide;
        const updatedPres = { ...presentation, slides: newSlides };
        setPresentationState(updatedPres);
        setStorePresentation(updatedPres);
        if (regenerationContract.adjusted) {
          console.info(
            `[Slide Regeneration Contract] normalized slide ${slideIndex + 1}; preserved ${regenerationContract.preservedFields.join(', ') || 'schema'}`
          );
        }
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
        const reviewContract = mergeReviewedPresentation(presentation, result.presentation);
        setPresentationState(reviewContract.presentation);
        setStorePresentation(reviewContract.presentation);
        if (reviewContract.adjusted) {
          console.info(
            `[Presentation Review Contract] normalized ${reviewContract.normalizedSlideCount} slides; restored ${reviewContract.restoredMissingSlides}, dropped ${reviewContract.droppedExtraSlides}`
          );
        }
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
      if (!presentation) {
        toast.error('저장할 발표자료가 없습니다.');
        return;
      }
      const savedId = await savePresentation(presentation, info, settings, template, storeAspectRatio);
      if (!savedId) throw new Error('저장 결과 ID가 없습니다.');

      if (presentation.id !== savedId) {
        const updatedPresentation = { ...presentation, id: savedId };
        setPresentationState(updatedPresentation);
        setStorePresentation(updatedPresentation);
      }

      await refreshSavedPresentations();
      toast.success('프로젝트가 안전하게 저장되었습니다.');
    } catch (err) {
      console.error('Presentation save failed:', err);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedPresentation = useCallback((item: SavedPresentation) => {
    const loadedPresentation: Presentation = {
      id: item.id,
      title: item.title,
      slides: normalizePresentationSlides(item.slides || []),
      brandColor: item.settings?.brandColor,
    };

    if (!loadedPresentation.slides.length) {
      toast.error('불러올 슬라이드가 없습니다.');
      return;
    }

    setPresentationState(loadedPresentation);
    setStorePresentation(loadedPresentation);
    setStoreAspectRatio(normalizeSavedAspectRatio(item.aspectRatio));
    setInfo(normalizeMeetingInfo(item.meetingInfo));
    setSettings(prev => ({ ...prev, ...(item.settings || {}) }));
    setTemplate(item.template || 'auto');
    setCurrentSlideIndex(0);
    setStep('preview');
    setIsHistoryOpen(false);
    toast.success('저장된 발표자료를 불러왔습니다.');
  }, [setStoreAspectRatio, setStorePresentation]);

  const deleteSavedPresentation = useCallback(async (id: string) => {
    const ok = await deletePresentation(id);
    if (!ok) {
      toast.error('저장된 발표자료를 삭제하지 못했습니다.');
      return;
    }
    setSavedPresentations(prev => prev.filter(item => item.id !== id));
    toast.success('저장된 발표자료를 삭제했습니다.');
  }, []);

  const reset = () => {
    generationCancelledRef.current = true;
    setStep('upload');
    setPresentationState(null);
    setOutline(null);
    setCurrentSlideIndex(0);
    setInfo(createDefaultMeetingInfo());
    setTemplate('auto');
    setDataFiles([]);
    setDataSummary('');
    setAiParts([]);
    setSourceFileData('');
    setReferenceFileName('');
    setReferenceStructure(null);
    setIsGenerating(false);
    resetSlideStore();
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
    openHistory: openHistoryPanel,
    isHistoryOpen,
    closeHistory: () => setIsHistoryOpen(false),
    savedPresentations,
    isHistoryLoading,
    loadSavedPresentation,
    deleteSavedPresentation,
    isChatOpen, setChatOpen: setIsChatOpen,
    isReviewOpen, setReviewOpen: setIsReviewOpen,
    executionPlan,
    forceAbort
  };
};
