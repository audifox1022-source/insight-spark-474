// ============================================================
// src/hooks/usePresentation.ts — 최종 통합 및 철통 방어 버전
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
// 1. 데이터 정규화 및 크래시 방지 헬퍼
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

  // 화이트스크린 방지: 유효한 타입 및 레이아웃 검사
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
  const defaultSlide: Slide = { slideNumber: 1, type: 'title', layout: 'default', title: '슬라이드 생성 오류', content: ['데이터를 불러오지 못했습니다.'], keyMetrics: [], persona: 'standard' };
  if (!presentation || typeof presentation !== 'object') return { title: '새 발표 자료', theme: 'blue', slides: [defaultSlide] };
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
// 2. 메인 훅: usePresentation
// ─────────────────────────────────────────────────────────

export function usePresentation() {
  const [step, setStep] = useState<ExtendedStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>('auto');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({ week: '', department: '', reporter: '', notes: '' });
  const [settings, setSettings] = useState<PresentationSettings>({ difficulty: 'medium', volume: 'standard' });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  
  // UI 상태 관리
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

  // 참고 양식 파일 상태
  const [referenceFile, setReferenceFile] = useState<ParsedFileData | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [referenceStructure, setReferenceStructure] = useState<any | null>(null);

  // 테마 관리
  const [appTheme, setAppTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('apptheme') || 'blue' : 'blue'));
  const [isDark, setIsDark] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false));

  // 📂 [Effect] parsedFiles 변화 추적 (디버깅)
  useEffect(() => {
    console.log('📂 [parsedFiles 변화]', parsedFiles.length, '개:', parsedFiles.map(f => f.fileName));
  }, [parsedFiles]);

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

  // ─────────────────────────────────────────────────────────
  // 3. 핸들러: 파일 처리
  // ─────────────────────────────────────────────────────────

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
    const dummyFile: ParsedFileData = { fileName: '직접입력.txt', fileType: 'text/plain', content: prompt, summary: prompt.slice(0, 30) };
    setParsedFiles([dummyFile]);
    setFileNames([dummyFile.fileName]);
    setMeetingInfo((prev) => ({ ...prev, week: prompt.slice(0, 40) }));
    setStep('info');
    toast.success('주제가 입력되었습니다.');
  }, []);

  // ─────────────────────────────────────────────────────────
  // 4. 핸들러: AI 생성 및 편집
  // ─────────────────────────────────────────────────────────

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
    console.log('🚀 [generatePresentation] 호출됨');
    if (parsedFiles.length === 0) { setStep('upload'); return; }
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(() => aiService.generatePresentation({ fileData: payload, meetingInfo, settings, template, approvedOutline, referenceStructure }), { maxRetries: 1 });
      const { presentation: fixedPresentation } = validateAndFixPresentation(resData.presentation);
      setPresentation(normalizePresentationSlides(fixedPresentation));
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
      const resData = await retryWithBackoff(() => aiService.chatEdit({ userMessage: message, currentSlide, slideIndex, presentation }), { maxRetries: 1 });
      if (resData.result?.slide) resData.result.slide = normalizeSlideForApp(resData.result.slide, slideIndex);
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      return null;
    }
  }, [presentation]);

  const generateSlideImage = useCallback(async (slideIndex: number) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    setIsGeneratingImage(true);
    toast.loading('AI 배경 이미지 분석 및 생성 중...', { id: 'gen-image' });
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

  // ─────────────────────────────────────────────────────────
  // 5. 핸들러: 저장 및 기타 조작
  // ─────────────────────────────────────────────────────────

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
  }, []);

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

  const cycleLayout = useCallback((slideIndex: number) => {
    if (!presentation) return;
    const layouts: Slide['layout'][] = ['default', 'split-left', 'split-right', 'highlight', 'grid'];
    const currentLayout = presentation.slides[slideIndex].layout || 'default';
    const nextLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
    updateSlide(slideIndex, { layout: nextLayout });
  }, [presentation, updateSlide]);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
    setOutline(null);
    clearReferenceFile();
  }, [clearReferenceFile]);

  // ─────────────────────────────────────────────────────────
  // 6. 리뷰 및 전체 최적화
  // ─────────────────────────────────────────────────────────

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
    chatOpen, setChatOpen, currentChatSlideIndex, setCurrentChatSlideIndex,
    openChatWithSlide: (idx: number) => { setCurrentChatSlideIndex(idx); setChatOpen(true); },
    reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix: async () => false,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile, handlePromptSubmit,
    referenceFileName, isAnalyzingReference, referenceStructure, handleReferenceFileUpload, clearReferenceFile,
    requestOutline, generatePresentation,
    regenerateSlide, requestChatEdit,
    changeSlidePersona: async (idx: number, persona: string) => { /* persona change logic */ },
    cycleLayout, updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide, updateAllSlides,
    addSlide, deleteSlide, duplicateSlide, moveSlide,
    updatePresentationTitle: (title: string) => setPresentation(p => p ? ({ ...p, title }) : null),
  };
}
