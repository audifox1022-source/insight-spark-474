// ============================================================
// src/hooks/usePresentation.ts — 누락된 인덱스 반환 수정 완결판
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, Slide, AppStep, SlideChartData } from '@/types/presentation';
import { savePresentation, loadPresentations, deletePresentation, SavedPresentation } from '@/lib/presentation-storage';
import { OutlineData } from '@/components/OutlinePreview';
import { ReviewResult } from '@/components/ReviewPanel';
import { toast } from 'sonner';
import { retryWithBackoff, getKoreanErrorMessage } from '@/lib/retry-with-backoff';
import { aiService } from '@/lib/ai-service';
import { validateAndFixPresentation } from '@/lib/layout-validator';

export type ExtendedStep = AppStep | 'outline';

// ─────────────────────────────────────────────────────────
// 데이터 정규화 헬퍼 함수
// ─────────────────────────────────────────────────────────

function convertAIChartData(rawChartData: any): SlideChartData | undefined {
  if (!rawChartData) return undefined;
  if (Array.isArray(rawChartData.data) && rawChartData.data[0]?.name !== undefined) {
    return rawChartData as SlideChartData;
  }
  const labels: string[] = Array.isArray(rawChartData.labels) ? rawChartData.labels : [];
  const datasets: any[] = Array.isArray(rawChartData.datasets) ? rawChartData.datasets : [];
  if (labels.length === 0) return undefined;

  const primaryDataset = datasets[0]?.data;
  const secondaryDataset = datasets[1];

  const data = labels.map((label, i) => ({
    name: String(label),
    value: Number(primaryDataset?.[i] ?? 0),
    ...(secondaryDataset ? { value2: Number(secondaryDataset.data?.[i] ?? 0) } : {}),
  }));

  return {
    chartType: rawChartData.type === 'line' ? 'line' : rawChartData.type === 'pie' ? 'pie' : rawChartData.type === 'area' ? 'area' : 'bar',
    title: rawChartData.title ?? '',
    data,
    series1Label: primaryDataset?.label ?? '',
    series2Label: secondaryDataset?.label,
    showLegend: datasets.length > 1,
  } as SlideChartData;
}

function normalizeSlideForApp(raw: any, index: number): Slide {
  const baseRaw = (raw && typeof raw === 'object') ? raw : {};
  const rawContent = baseRaw.content ?? baseRaw.points ?? baseRaw.bullets ?? baseRaw.items ?? baseRaw.list ?? [];
  let content: string[] = Array.isArray(rawContent)
    ? rawContent.map((p: any) => typeof p === 'object' ? String(p.title ?? p.text ?? JSON.stringify(p)) : String(p))
    : typeof rawContent === 'string' ? [rawContent] : [];

  const validTypes = ['title', 'agenda', 'content', 'chart', 'compare', 'kpi', 'summary', 'quote', 'section', 'image', 'process', 'table', 'timeline', 'cards'];
  let slideType = (baseRaw.type && typeof baseRaw.type === 'string') ? baseRaw.type.toLowerCase() : 'content';
  if (!validTypes.includes(slideType)) slideType = 'content';

  const validLayouts = ['default', 'split-left', 'split-right', 'highlight', 'grid', 'full'];
  let slideLayout = (baseRaw.layout && typeof baseRaw.layout === 'string') ? baseRaw.layout.toLowerCase() : 'default';
  if (!validLayouts.includes(slideLayout)) slideLayout = 'default';

  return {
    ...baseRaw,
    slideNumber: Number(baseRaw.slideNumber) || index + 1,
    type: slideType,
    layout: slideLayout,
    title: baseRaw.title || '',
    content,
    keyMetrics: Array.isArray(baseRaw.keyMetrics) ? baseRaw.keyMetrics : [],
    chartData: convertAIChartData(baseRaw.chartData),
    notes: baseRaw.notes || '',
    imageUrl: baseRaw.imageUrl || undefined,
    persona: baseRaw.persona || 'standard',
  } as Slide;
}

function normalizePresentationSlides(presentation: any): Presentation {
  const defaultSlide: Slide = { slideNumber: 1, type: 'title', layout: 'default', title: '슬라이드 생성 오류', content: ['데이터를 불러오지 못했습니다.'], keyMetrics: [], persona: 'standard' as any };
  if (!presentation || typeof presentation !== 'object') return { title: '새 발표 자료', slides: [defaultSlide] } as any;
  let slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  if (slides.length === 0) slides = [defaultSlide];
  return {
    ...presentation,
    title: presentation.title || '새 발표 자료',
    theme: presentation.theme || 'blue',
    slides: slides.map(normalizeSlideForApp),
  };
}

// ─────────────────────────────────────────────────────────
// 메인 훅: usePresentation
// ─────────────────────────────────────────────────────────

export function usePresentation() {
  const [step, setStep] = useState<ExtendedStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>('auto');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({ week: '', department: '', reporter: '', notes: '' });
  const [settings, setSettings] = useState<PresentationSettings>({ difficulty: 'medium', volume: 'standard' });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  
  // ✅ 에러의 핵심 원인이었던 상태
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedList, setSavedList] = useState<SavedPresentation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentChatSlideIndex, setCurrentChatSlideIndex] = useState(0);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const [referenceFile, setReferenceFile] = useState<ParsedFileData | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [referenceStructure, setReferenceStructure] = useState<any | null>(null);

  const [appTheme, setAppTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('apptheme') || 'blue' : 'blue'));
  const [isDark, setIsDark] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false));

  // New state for interactive elements
  const [selectedText, setSelectedText] = useState<string | undefined>();

  const changeTheme = useCallback((theme: string) => {
    document.documentElement.classList.remove('theme-navy', 'theme-purple', 'theme-green', 'theme-orange');
    if (theme !== 'blue') document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('apptheme', theme);
    setAppTheme(theme);
    toast.success('테마가 변경되었습니다.');
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    changeTheme(appTheme);
  }, []);

  const dataSummary = useCallback((): string => {
    return parsedFiles.map((f) => f.summary).join(' ');
  }, [parsedFiles]);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    try {
      const results = await Promise.all(files.map(parseFile));
      const succeeded = results.filter((r) => r.fileType !== 'unknown' && !r.parseError);
      if (succeeded.length > 0) {
        setParsedFiles((prev) => [...prev, ...succeeded]);
        setFileNames((prev) => [...prev, ...succeeded.map((f) => f.fileName)]);
        toast.success(`${succeeded.length}개 파일 업로드 완료`);
      }
    } catch {
      toast.error('파일 처리 중 오류 발생');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReferenceFileUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setReferenceFileName(file.name);
    setIsAnalyzingReference(true);
    try {
      const parsed = await parseFile(file);
      setReferenceFile(parsed);
      const result = await aiService.analyzeReferenceStructure(typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content));
      setReferenceStructure(result);
      toast.success('참고 양식 분석 완료');
    } catch {
      toast.error('양식 분석 중 오류 발생');
    } finally {
      setIsAnalyzingReference(false);
    }
  }, []);

  const clearReferenceFile = useCallback(() => {
    setReferenceFile(null);
    setReferenceFileName(null);
    setReferenceStructure(null);
  }, []);

  const handlePromptSubmit = useCallback((prompt: string) => {
    if (!prompt.trim()) return;
    const dummyFile: ParsedFileData = { fileName: '직접입력.txt', fileType: 'text/plain' as any, content: prompt, summary: prompt.slice(0, 30) };
    setParsedFiles([dummyFile]);
    setFileNames([dummyFile.fileName]);
    setMeetingInfo((prev) => ({ ...prev, week: prompt.slice(0, 40) }));
    setStep('info');
    toast.success('주제가 입력되었습니다.');
  }, []);

  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) { toast.error('자료가 없습니다.'); return; }
    setIsLoadingOutline(true);
    setStep('outline');
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(() => aiService.getOutline({ fileData: payload, meetingInfo, settings, template, referenceStructure }), { maxRetries: 1 });
      setOutline({ title: resData.title ?? '새 발표 자료', outline: resData.outline || [] });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      setStep('info');
    } finally {
      setIsLoadingOutline(false);
    }
  }, [parsedFiles, meetingInfo, settings, template, referenceStructure]);

  const generatePresentation = useCallback(async (approvedOutline?: OutlineData) => {
    if (parsedFiles.length === 0) { setStep('upload'); return; }
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(() => aiService.generatePresentation({ fileData: payload, meetingInfo, settings, template, approvedOutline, referenceStructure }), { maxRetries: 1 });
      const { presentation: fixedPresentation } = validateAndFixPresentation(resData.presentation);
      setPresentation(normalizePresentationSlides(fixedPresentation));
      setCurrentSlideIndex(0); // ✅ 화면 전환 시 슬라이드 0번으로 초기화
      setStep('preview');
      toast.success('발표자료가 생성되었습니다!');
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      setStep('info');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedFiles, meetingInfo, settings, template, referenceStructure]);

  const updateSlide = useCallback((index: number, updated: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = normalizeSlideForApp({ ...slides[index], ...updated }, index);
      return { ...prev, slides };
    });
  }, []);

  const updateAllSlides = useCallback((updates: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, index) => normalizeSlideForApp({ ...s, ...updates }, index));
      return { ...prev, slides };
    });
  }, []);

  const updatePresentationMaster = useCallback((updates: Partial<Presentation>) => {
    setPresentation((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const regenerateSlide = useCallback(async (slideIndex: number, userInstruction?: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading('슬라이드 재생성 중...', { id: 'regen' });
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(() => aiService.regenerateSlide({ slideIndex, currentSlide, presentation, fileData: payload, userInstruction }), { maxRetries: 1 });
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1 });
      toast.success('재생성 완료!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'regen' });
    }
  }, [presentation, parsedFiles, updateSlide]);

  const requestChatEdit = useCallback(async (message: string, slideIndex: number, currentSlide: Slide) => {
    try {
      const resData = await retryWithBackoff(() => aiService.chatEdit({ userMessage: message, currentSlide, slideIndex, presentation, selectedText }), { maxRetries: 1 });
      if (resData.result?.slide) resData.result.slide = normalizeSlideForApp(resData.result.slide, slideIndex);
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      return null;
    }
  }, [presentation]);

  const changeSlidePersona = useCallback(async (slideIndex: number, persona: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading('스타일 변환 중...', { id: 'persona' });
    try {
      const resData = await retryWithBackoff(() => aiService.changePersona({ currentSlide, persona }), { maxRetries: 1 });
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1, layout: currentSlide.layout, persona: persona as Slide['persona'] });
      toast.success('스타일 변환 완료!', { id: 'persona' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'persona' });
    }
  }, [presentation, updateSlide]);

  const generateSlideImage = useCallback(async (slideIndex: number) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    setIsGeneratingImage(true);
    toast.loading('AI 배경 이미지 생성 중...', { id: 'gen-image' });
    try {
      const contentStr = Array.isArray(currentSlide.content) ? currentSlide.content.join(' ') : '';
      const contextAwareTitle = `[발표: ${presentation.title}] - ${currentSlide.title}`;
      const imageUrl = await retryWithBackoff(() => aiService.generateImage(contextAwareTitle, contentStr), { maxRetries: 1 });
      updateSlide(slideIndex, { imageUrl });
      toast.success('AI 이미지 생성 완료!', { id: 'gen-image' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'gen-image' });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [presentation, updateSlide]);

  const cycleLayout = useCallback((slideIndex: number) => {
    if (!presentation) return;
    const layouts: Slide['layout'][] = ['default', 'split-left', 'split-right', 'highlight', 'grid'];
    const currentLayout = presentation.slides[slideIndex].layout || 'default';
    const nextLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
    updateSlide(slideIndex, { layout: nextLayout });
  }, [presentation, updateSlide]);

  const handleSave = useCallback(async () => {
    if (!presentation) return;
    setIsSaving(true);
    try {
      const id = await savePresentation(presentation, meetingInfo, settings, template);
      if (id) {
        setPresentation((prev) => (prev ? { ...prev, id } : prev));
        toast.success('저장되었습니다.');
        const list = await loadPresentations();
        setSavedList(list);
      }
    } finally {
      setIsSaving(false);
    }
  }, [presentation, meetingInfo, settings, template]);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setIsLoadingList(true);
    try {
      const list = await loadPresentations();
      setSavedList(list);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const loadFromHistory = useCallback((saved: SavedPresentation) => {
    setPresentation(normalizePresentationSlides(saved));
    setMeetingInfo(saved.meetingInfo);
    setSettings(saved.settings);
    setTemplate(saved.template);
    setCurrentSlideIndex(0); // 히스토리 열 때도 0으로 초기화
    setStep('preview');
    setHistoryOpen(false);
    toast.success(`"${saved.title}" 로드 완료`);
  }, []);

  const deleteFromHistory = useCallback(async (id: string) => {
    if (await deletePresentation(id)) {
      setSavedList((prev) => prev.filter((p) => p.id !== id));
      toast.success('삭제되었습니다.');
    }
  }, []);

  const addSlide = useCallback((afterIndex: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const newSlide = normalizeSlideForApp({ type: 'content', title: '', content: [] }, afterIndex + 1);
      const slides = [...prev.slides];
      slides.splice(afterIndex + 1, 0, newSlide);
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const deleteSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev || prev.slides.length <= 1) return prev;
      const slides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
    if (currentSlideIndex >= index && currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  }, [currentSlideIndex]);

  const duplicateSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const clone = JSON.parse(JSON.stringify(slides[index]));
      slides.splice(index + 1, 0, clone);
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const moveSlide = useCallback((from: number, to: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
    setOutline(null);
    setCurrentSlideIndex(0);
    clearReferenceFile();
  }, [clearReferenceFile]);

  const requestReview = useCallback(async () => {
    if (!presentation) return;
    setIsReviewing(true);
    try {
      const resData = await aiService.review({ presentation });
      setReviewResult(resData.review);
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
    } finally {
      setIsReviewing(false);
    }
  }, [presentation]);

  const applyReviewFix = useCallback(async (slideIndex: number, issue: string, suggestion: string): Promise<boolean> => {
    if (!presentation) return false;
    const currentSlide = presentation.slides[slideIndex];
    const instruction = `문제: ${issue}\n개선사항: ${suggestion}\n위 내용을 반영하여 슬라이드를 개선해주세요.`;
    try {
      const resData = await retryWithBackoff(() => aiService.chatEdit({ userMessage: instruction, currentSlide, slideIndex, presentation }), { maxRetries: 1 });
      if (resData.result) {
        updateSlide(slideIndex, resData.result.slide);
        toast.success(`슬라이드 ${slideIndex + 1} 개선 완료!`);
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      return false;
    }
  }, [presentation, updateSlide]);

  const reviewAndFixPresentation = useCallback(async () => {
    if (!presentation) return;
    setIsFixing(true);
    toast.loading('AI 전체 최적화 중...', { id: 'review-fix' });
    try {
      const resData = await retryWithBackoff(() => aiService.reviewAndFix({ presentation, settings }), { maxRetries: 1 });
      const { presentation: fixedPresentation } = validateAndFixPresentation(resData.result.presentation);
      setPresentation(normalizePresentationSlides(fixedPresentation));
      toast.success('전체 최적화가 완료되었습니다!', { id: 'review-fix' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'review-fix' });
    } finally {
      setIsFixing(false);
    }
  }, [presentation, settings]);

  const handleFactCheck = useCallback(async (text: string, slideContext: any) => {
    toast.loading('사실 관계를 검증하는 중입니다...', { id: 'fact-check' });
    try {
      const result = await aiService.verifyFact(text, slideContext);
      if (result.isFact === true) {
        toast.success(`팩트체크 완료: 신뢰할 수 있는 정보입니다. (${result.confidence})\n이유: ${result.reasoning}`, { id: 'fact-check', duration: 8000 });
      } else if (result.isFact === false) {
        toast.error(`⚠️ 팩트체크 주의: 환각이나 오류일 수 있습니다. (${result.confidence})\n이유: ${result.reasoning}`, { id: 'fact-check', duration: 10000 });
      } else {
        toast.info(`🤔 확인 불가: ${result.reasoning}`, { id: 'fact-check', duration: 8000 });
      }
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'fact-check' });
    }
  }, []);

  // ✅ 누락되었던 return 블록의 완벽한 복구
  return {
    step, setStep,
    dataSummary: dataSummary(),
    fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    template, setTemplate,
    outline, isLoadingOutline,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen, openHistory, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen, currentChatSlideIndex,
    reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile, handlePromptSubmit,
    referenceFileName, isAnalyzingReference, referenceStructure, handleReferenceFileUpload, clearReferenceFile,
    requestOutline, generatePresentation,
    regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout, updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide, updateAllSlides, addSlide, deleteSlide, duplicateSlide, moveSlide,
    updatePresentationTitle: (title: string) => setPresentation(p => p ? ({ ...p, title }) : null),
    
    // Interactive editing and fact check
    selectedText, setSelectedText, handleFactCheck,

    // ✅ 이것이 없어서 Index.tsx가 undefined를 넘기고 화면이 터졌습니다!
    currentSlideIndex, setCurrentSlideIndex, 
  };
}
