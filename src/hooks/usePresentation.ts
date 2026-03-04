import { useState, useCallback, useEffect } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, Slide, AppStep, SlideChartData } from '@/types/presentation';
import { savePresentation, loadPresentations, deletePresentation, SavedPresentation } from '@/lib/presentation-storage';
import { OutlineData } from '@/components/OutlinePreview';
import { ReviewResult } from '@/components/ReviewPanel';
import { toast } from 'sonner';
import { retryWithBackoff, getKoreanErrorMessage } from '@/lib/retry-with-backoff';
import { aiService } from '@/lib/ai-service';

export type ExtendedStep = AppStep | 'outline';

// ✅ 참고 양식 분석 결과 타입
export interface ReferenceStructure {
  slideCount: number;
  structure: { type: string; title: string; description: string }[];
  tone: string;
  keyPatterns: string[];
}

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
  if (!raw || typeof raw !== 'object') {
    return { slideNumber: index + 1, type: 'content', title: '', content: [], keyMetrics: [] };
  }
  const rawContent = raw.content ?? raw.points ?? raw.bullets ?? raw.items ?? raw.list ?? [];
  const content: string[] = Array.isArray(rawContent)
    ? rawContent.map((p: any) => typeof p === 'object' ? String(p.title ?? p.text ?? JSON.stringify(p)) : String(p))
    : typeof rawContent === 'string' ? [rawContent] : [];
  const keyMetrics = Array.isArray(raw.keyMetrics) ? raw.keyMetrics : [];
  const chartData = convertAIChartData(raw.chartData);
  return {
    ...raw,
    slideNumber: raw.slideNumber ?? index + 1,
    type: raw.type ?? 'content',
    title: raw.title ?? '',
    content,
    keyMetrics,
    chartData,
  } as Slide;
}

function normalizePresentationSlides(presentation: any): Presentation {
  if (!presentation || !Array.isArray(presentation.slides)) {
    return { title: presentation?.title ?? '', slides: [] };
  }
  return {
    ...presentation,
    slides: presentation.slides.map(normalizeSlideForApp),
  };
}

export function usePresentation() {
  const [step, setStep] = useState<ExtendedStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>('auto');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({ week: '', department: '', reporter: '', notes: '' });
  const [settings, setSettings] = useState<PresentationSettings>({ difficulty: 'medium', volume: 'standard' });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
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

  // ✅ NEW: 참고 양식 파일 상태
  const [referenceFile, setReferenceFile] = useState<ParsedFileData | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string>('');
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [referenceStructure, setReferenceStructure] = useState<ReferenceStructure | null>(null);

  const [appTheme, setAppTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('apptheme') || 'blue';
    return 'blue';
  });

  const changeTheme = useCallback((theme: string) => {
    document.documentElement.classList.remove('theme-navy', 'theme-purple', 'theme-green', 'theme-orange');
    if (theme !== 'blue') document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('apptheme', theme);
    setAppTheme(theme);
    toast.success(`테마가 변경되었습니다.`);
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('theme') === 'dark';
    return false;
  });

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
    changeTheme(appTheme);
  }, []);

  const dataSummary = useCallback((): string => {
    if (parsedFiles.length === 0) return '';
    return parsedFiles.map((f) => f.summary).join(' ');
  }, [parsedFiles]);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    try {
      const results = await Promise.all(files.map(parseFile));
      const failed = results.filter((r) => r.fileType === 'unknown' || r.parseError);
      const succeeded = results.filter((r) => r.fileType !== 'unknown' && !r.parseError);

      if (succeeded.length > 0) {
        setParsedFiles((prev) => [...prev, ...succeeded]);
        setFileNames((prev) => [...prev, ...succeeded.map((f) => f.fileName)]);
        toast.success(`${succeeded.length}개 파일이 업로드되었습니다.`);
      }
      if (failed.length > 0) {
        failed.forEach((f) => {
          if (f.parseError) toast.error(`${f.fileName}: PDF 파싱 오류`);
          else toast.error(`${f.fileName}: 지원하지 않는 형식입니다.`);
        });
      }
      if (succeeded.length === 0 && failed.length === 0) {
        toast.error('업로드할 파일이 없습니다.');
      }
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ✅ NEW: 참고 양식 파일 업로드 & 분석 핸들러
  const handleReferenceFileUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsAnalyzingReference(true);
    setReferenceStructure(null);
    toast.loading('참고 양식 분석 중...', { id: 'ref-analyze' });

    try {
      const parsed = await parseFile(file);
      if (parsed.fileType === 'unknown' || parsed.parseError) {
        toast.error('지원하지 않는 참고 파일 형식입니다.', { id: 'ref-analyze' });
        return;
      }
      setReferenceFile(parsed);
      setReferenceFileName(file.name);

      const structure = await aiService.analyzeReferenceStructure(parsed.content);
      setReferenceStructure(structure);
      toast.success(`참고 양식 분석 완료! (${structure.slideCount}장 구조 인식)`, { id: 'ref-analyze' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'ref-analyze' });
    } finally {
      setIsAnalyzingReference(false);
    }
  }, []);

  // ✅ NEW: 참고 양식 초기화
  const clearReferenceFile = useCallback(() => {
    setReferenceFile(null);
    setReferenceFileName('');
    setReferenceStructure(null);
  }, []);

  const handlePromptSubmit = useCallback((prompt: string) => {
    if (!prompt.trim()) return;
    const dummyFile: ParsedFileData = {
      fileName: '직접입력.txt',
      fileType: 'text/plain',
      content: prompt,
      summary: prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt,
    };
    setParsedFiles([dummyFile]);
    setFileNames([dummyFile.fileName]);
    setMeetingInfo((prev) => ({ ...prev, week: prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt }));
    setStep('info');
    toast.success('프롬프트가 입력되었습니다!');
  }, []);

  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) return;
    setIsLoadingOutline(true);
    setStep('outline' as ExtendedStep);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => await aiService.getOutline({
          fileData: payload,
          meetingInfo,
          settings,
          template,
          referenceStructure, // ✅ 참고 양식 전달
        }),
        {
          maxRetries: 1,
          onRetry: (attempt, max) => toast.loading(`재시도 중... ${attempt}/${max}`, { id: 'outline-retry' }),
        }
      );
      toast.dismiss('outline-retry');
      const outlineData: OutlineData = {
        title: resData.title ?? '새 발표 자료',
        outline: Array.isArray(resData.outline) ? resData.outline : [],
      };
      setOutline(outlineData);
    } catch (err: any) {
      toast.dismiss('outline-retry');
      toast.error(getKoreanErrorMessage(err));
      setStep('info');
    } finally {
      setIsLoadingOutline(false);
    }
  }, [parsedFiles, meetingInfo, settings, template, referenceStructure]);

  const generatePresentation = useCallback(async (approvedOutline?: OutlineData) => {
    if (parsedFiles.length === 0) return;
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => await aiService.generatePresentation({
          fileData: payload,
          meetingInfo,
          settings,
          template,
          approvedOutline: approvedOutline ?? null,
          referenceStructure, // ✅ 참고 양식 전달
        }),
        {
          maxRetries: 1,
          onRetry: (attempt, max) => toast.loading(`재시도 중... ${attempt}/${max}`, { id: 'gen-retry' }),
        }
      );
      toast.dismiss('gen-retry');
      setPresentation(normalizePresentationSlides(resData.presentation));
      setStep('preview');
      toast.success('발표자료가 생성되었습니다!');
    } catch (err: any) {
      toast.dismiss('gen-retry');
      toast.error(getKoreanErrorMessage(err));
      setStep('info');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedFiles, meetingInfo, settings, template, referenceStructure]);

  const updatePresentationMaster = useCallback((updates: Partial<Presentation>) => {
    setPresentation((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const updateSlide = useCallback((index: number, updated: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = normalizeSlideForApp({ ...slides[index], ...updated }, index);
      return { ...prev, slides };
    });
  }, []);

  const regenerateSlide = useCallback(async (slideIndex: number, userInstruction?: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading('슬라이드 재생성 중...', { id: 'regen' });
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => await aiService.regenerateSlide({ slideIndex, currentSlide, presentation, fileData: payload, userInstruction }),
        { maxRetries: 1, onRetry: () => toast.loading('재시도 중...', { id: 'regen' }) }
      );
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1 });
      toast.success('재생성 완료!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'regen' });
    }
  }, [presentation, parsedFiles, updateSlide]);

  const requestChatEdit = useCallback(async (
    message: string,
    slideIndex: number,
    currentSlide: Slide,
  ): Promise<{ slide: Slide; summary: string } | null> => {
    try {
      const resData = await retryWithBackoff(
        async () => await aiService.chatEdit({ userMessage: message, currentSlide, slideIndex, presentation }),
        { maxRetries: 1 }
      );
      if (resData.result?.slide) {
        resData.result.slide = normalizeSlideForApp(resData.result.slide, slideIndex);
      }
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err));
      return null;
    }
  }, [presentation]);

  const changeSlidePersona = useCallback(async (slideIndex: number, persona: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    const personaLabels: Record<string, string> = {
      jobs: 'Jobs 스타일', mckinsey: 'McKinsey 스타일', ceo: 'CEO 스타일', team: '팀 공유용', client: '클라이언트용',
    };
    toast.loading(`${personaLabels[persona] || persona} 변환 중...`, { id: 'persona' });
    try {
      const resData = await retryWithBackoff(
        async () => await aiService.changePersona({ currentSlide, persona }),
        { maxRetries: 1 }
      );
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
      const contentStr = Array.isArray(currentSlide.content) && currentSlide.content.length > 0
        ? currentSlide.content.join(' ')
        : '';
      const imageUrl = await aiService.generateImage(currentSlide.title, contentStr);
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
    toast.success(`레이아웃 변경됨`);
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
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [presentation, meetingInfo, settings, template]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const list = await loadPresentations();
      setSavedList(list);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    await fetchHistory();
  }, [fetchHistory]);

  const loadFromHistory = useCallback((saved: SavedPresentation) => {
    setPresentation(normalizePresentationSlides({ id: saved.id, title: saved.title, slides: saved.slides }));
    setMeetingInfo(saved.meetingInfo);
    setSettings(saved.settings);
    setTemplate(saved.template);
    setStep('preview');
    setHistoryOpen(false);
    toast.success(`"${saved.title}" 불러오기 완료`);
  }, []);

  const deleteFromHistory = useCallback(async (id: string) => {
    const ok = await deletePresentation(id);
    if (ok) {
      setSavedList((prev) => prev.filter((p) => p.id !== id));
      toast.success('삭제되었습니다.');
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  }, []);

  const addSlide = useCallback((afterIndex: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const newSlide: Slide = {
        slideNumber: afterIndex + 2,
        title: '',
        type: 'content',
        content: [],
        notes: '',
        keyMetrics: [],
      };
      const slides = [...prev.slides];
      slides.splice(afterIndex + 1, 0, newSlide);
      slides.forEach((s, i) => { s.slideNumber = i + 1; });
      return { ...prev, slides };
    });
  }, []);

  const deleteSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev || prev.slides.length <= 1) return prev;
      const slides = prev.slides.filter((_, i) => i !== index);
      slides.forEach((s, i) => { s.slideNumber = i + 1; });
      return { ...prev, slides };
    });
  }, []);

  const duplicateSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const clone = JSON.parse(JSON.stringify(slides[index])) as Slide;
      slides.splice(index + 1, 0, clone);
      slides.forEach((s, i) => { s.slideNumber = i + 1; });
      return { ...prev, slides };
    });
  }, []);

  const moveSlide = useCallback((from: number, to: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      slides.forEach((s, i) => { s.slideNumber = i + 1; });
      return { ...prev, slides };
    });
  }, []);

  const updatePresentationTitle = useCallback((title: string) => {
    setPresentation((prev) => (prev ? { ...prev, title } : prev));
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
    setOutline(null);
    setTemplate('auto');
    setReviewResult(null);
    clearReferenceFile(); // ✅ 참고 파일도 초기화
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

  const applyReviewFix = useCallback(async (
    slideIndex: number,
    issue: string,
    suggestion: string
  ): Promise<boolean> => {
    if (!presentation) return false;
    const currentSlide = presentation.slides[slideIndex];
    const instruction = `문제: ${issue}\n개선사항: ${suggestion}\n위 내용을 반영하여 슬라이드를 개선해주세요.`;
    try {
      const resData = await retryWithBackoff(
        async () => await aiService.chatEdit({ userMessage: instruction, currentSlide, slideIndex, presentation }),
        { maxRetries: 1 }
      );
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
      const resData = await retryWithBackoff(
        async () => await aiService.reviewAndFix({ presentation, settings }),
        {
          maxRetries: 1,
          onRetry: () => toast.loading('재시도 중...', { id: 'review-fix' }),
        }
      );
      setPresentation(normalizePresentationSlides(resData.result.presentation));
      toast.success(`최적화 완료! ${resData.result.summary}`, { id: 'review-fix', duration: 5000 });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'review-fix' });
    } finally {
      setIsFixing(false);
    }
  }, [presentation, settings]);

  const openChatWithSlide = useCallback((slideIndex: number) => {
    setCurrentChatSlideIndex(slideIndex);
    setChatOpen(true);
  }, []);

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
    chatOpen, setChatOpen,
    currentChatSlideIndex, openChatWithSlide,
    reviewOpen, setReviewOpen,
    reviewResult, isReviewing, requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile, handlePromptSubmit,
    requestOutline, generatePresentation,
    regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout,
    updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide,
    addSlide, deleteSlide, duplicateSlide, moveSlide,
    updatePresentationTitle,
    // ✅ NEW: 참고 양식 관련 반환값
    referenceFileName,
    isAnalyzingReference,
    referenceStructure,
    handleReferenceFileUpload,
    clearReferenceFile,
  };
}
