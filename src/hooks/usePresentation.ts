// ============================================================
// src/hooks/usePresentation.ts — 엄격한 데이터 검증 및 철통 방어
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

export interface ReferenceStructure {
  slideCount: number;
  structure: { type: string; title: string }[];
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
  const baseRaw = (raw && typeof raw === 'object') ? raw : {};
  
  const rawContent = baseRaw.content ?? baseRaw.points ?? baseRaw.bullets ?? baseRaw.items ?? baseRaw.list ?? [];
  let content: string[] = Array.isArray(rawContent)
    ? rawContent
        .map((p: any) => typeof p === 'object' ? String(p.title ?? p.text ?? JSON.stringify(p)) : String(p))
        .filter(item => item && item.trim().length > 0) 
    : typeof rawContent === 'string' ? [rawContent] : [];
    
  if (content.length === 0) content = ["내용이 없습니다."];

  const validTypes = ['title', 'agenda', 'content', 'chart', 'compare', 'kpi', 'summary', 'quote', 'section', 'image', 'process', 'table', 'timeline', 'cards'];
  let slideType = (baseRaw.type && typeof baseRaw.type === 'string') ? baseRaw.type.toLowerCase() : 'content';
  if (!validTypes.includes(slideType)) slideType = 'content';
  
  const validLayouts = ['default', 'split-left', 'split-right', 'highlight', 'grid', 'full'];
  let slideLayout = (baseRaw.layout && typeof baseRaw.layout === 'string') ? baseRaw.layout.toLowerCase() : 'default';
  if (!validLayouts.includes(slideLayout)) slideLayout = 'default';
  
  let keyMetrics = Array.isArray(baseRaw.keyMetrics) ? baseRaw.keyMetrics : [];
  if (slideType === 'kpi' && keyMetrics.length === 0) {
    keyMetrics = [{ label: '주요 지표', value: '데이터 누락', description: 'AI가 지표를 생성하지 못했습니다.' }];
  }
  
  let chartData = convertAIChartData(baseRaw.chartData);
  if (slideType === 'chart' && !chartData) {
    chartData = {
      chartType: 'bar', title: baseRaw.title || '차트 데이터 (임시)', data: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }], series1Label: '데이터', showLegend: false
    };
  }
  
  if (slideType === 'compare' && content.length < 2) {
    content = ['비교 항목 A', '비교 항목 B', ...content];
  }
  
  return {
    ...baseRaw,
    slideNumber: Number(baseRaw.slideNumber) || index + 1,
    type: slideType,
    layout: slideLayout,
    title: baseRaw.title || '제목 없음',
    content,
    keyMetrics,
    chartData,
    notes: baseRaw.notes || '',
    imageUrl: baseRaw.imageUrl || undefined,
    persona: baseRaw.persona || 'standard',
  } as Slide;
}

// 🚨 가장 중요: 여기서 빈 배열이 넘어오면 강제로 에러 안내 슬라이드를 끼워 넣습니다.
function normalizePresentationSlides(presentation: any): Presentation {
  const fallbackSlide: Slide = { 
    slideNumber: 1, 
    type: 'title', 
    layout: 'default', 
    title: '데이터 로드 실패', 
    content: ['AI가 데이터를 올바르게 생성하지 못했거나, 너무 긴 응답으로 인해 끊겼습니다.', '내용을 요약하여 다시 시도해 주세요.'], 
    keyMetrics: [], 
    persona: 'standard' 
  };

  if (!presentation || typeof presentation !== 'object') {
    return { title: '새 발표 자료', theme: 'blue', slides: [fallbackSlide] };
  }

  let slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  
  if (slides.length === 0) {
    console.warn("⚠️ normalizePresentationSlides: slides 배열이 비어있어 기본 슬라이드를 채웁니다.");
    slides = [fallbackSlide];
  } else {
    slides = slides.map(normalizeSlideForApp);
  }
  
  return { 
    ...presentation, 
    title: presentation.title || '새 발표 자료', 
    theme: presentation.theme || 'blue', 
    slides 
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
  const [referenceFile, setReferenceFile] = useState<ParsedFileData | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [referenceStructure, setReferenceStructure] = useState<ReferenceStructure | null>(null);

  const [appTheme, setAppTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('apptheme') || 'blue' : 'blue'));
  const [isDark, setIsDark] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false));

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
  }, [appTheme, changeTheme]);

  const dataSummary = useCallback((): string => parsedFiles.length === 0 ? '' : parsedFiles.map((f) => f.summary).join(' '), [parsedFiles]);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    try {
      const results = await Promise.all(files.map(parseFile));
      const failed = results.filter((r) => r.fileType === 'unknown' || r.parseError);
      const succeeded = results.filter((r) => r.fileType !== 'unknown' && !r.parseError);
      if (succeeded.length > 0) {
        setParsedFiles((prev) => [...prev, ...succeeded]);
        setFileNames((prev) => [...prev, ...succeeded.map((f) => f.fileName)]);
        toast.success(`${succeeded.length}개 파일 업로드 완료`);
      }
      if (failed.length > 0) failed.forEach((f) => toast.error(`${f.fileName}: ${f.parseError ? '파싱 오류' : '지원하지 않는 형식'}`));
      if (succeeded.length === 0 && failed.length === 0) toast.error('업로드할 파일이 없습니다.');
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
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
    setReferenceStructure(null);
    try {
      const parsed = await parseFile(file);
      setReferenceFile(parsed);
      const result = await aiService.analyzeReferenceStructure(typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content));
      setReferenceStructure(result as ReferenceStructure);
      toast.success('참고 양식 분석 완료');
    } catch (err: any) {
      toast.error('양식 분석 중 오류 발생');
      setReferenceFileName(null);
      setReferenceFile(null);
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
    const dummyFile: ParsedFileData = { fileName: '직접입력.txt', fileType: 'text/plain', content: prompt, summary: prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt };
    setParsedFiles([dummyFile]);
    setFileNames([dummyFile.fileName]);
    setMeetingInfo((prev) => ({ ...prev, week: prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt }));
    setStep('info');
    toast.success('프롬프트 입력 완료');
  }, []);

  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) { toast.error('파일 데이터가 없습니다.'); return; }
    setIsLoadingOutline(true);
    setStep('outline');
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(async () => await aiService.getOutline({ fileData: payload, meetingInfo, settings, template, referenceStructure }), { maxRetries: 1, onRetry: (a, m) => toast.loading(`재시도 중... ${a}/${m}`, { id: 'outline-retry' }) });
      toast.dismiss('outline-retry');
      setOutline({ title: resData.title ?? '새 발표 자료', outline: Array.isArray(resData.outline) ? resData.outline : [] });
    } catch (err: any) {
      toast.dismiss('outline-retry');
      toast.error(getKoreanErrorMessage(err));
      setStep('info');
    } finally {
      setIsLoadingOutline(false);
    }
  }, [parsedFiles, meetingInfo, settings, template, referenceStructure]);

  const generatePresentation = useCallback(async (approvedOutline?: OutlineData) => {
    if (parsedFiles.length === 0) { toast.error('자료가 없습니다.'); setStep('upload'); return; }
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(async () => await aiService.generatePresentation({ fileData: payload, meetingInfo, settings, template, approvedOutline: approvedOutline ?? null, referenceStructure }), { maxRetries: 1, onRetry: (a, m) => toast.loading(`재시도 중... ${a}/${m}`, { id: 'gen-retry' }) });
      toast.dismiss('gen-retry');
      
      const { presentation: fixedPresentation, totalWarnings, fixedSlides } = validateAndFixPresentation(resData.presentation);
      
      // ✅ 여기서 무조건 유효한 슬라이드 배열이 보장됨
      const normalizedData = normalizePresentationSlides(fixedPresentation);
      setPresentation(normalizedData);
      
      setCurrentChatSlideIndex(0); // 첫 슬라이드로 초기화
      setStep('preview');
      toast.success(`발표자료 생성 완료${fixedSlides > 0 ? ` (${fixedSlides}개 슬라이드 자동 보정)` : ''}`);
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
    toast.loading('재생성 중...', { id: 'regen' });
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(async () => await aiService.regenerateSlide({ slideIndex, currentSlide, presentation, fileData: payload, userInstruction }), { maxRetries: 1 });
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1 });
      toast.success('재생성 완료!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'regen' });
    }
  }, [presentation, parsedFiles, updateSlide]);

  const requestChatEdit = useCallback(async (message: string, slideIndex: number, currentSlide: Slide): Promise<{ slide: Slide; summary: string } | null> => {
    try {
      const resData = await retryWithBackoff(async () => await aiService.chatEdit({ userMessage: message, currentSlide, slideIndex, presentation }), { maxRetries: 1 });
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
    toast.loading('변환 중...', { id: 'persona' });
    try {
      const resData = await retryWithBackoff(async () => await aiService.changePersona({ currentSlide, persona }), { maxRetries: 1 });
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1, layout: currentSlide.layout, persona: persona as Slide['persona'] });
      toast.success('변환 완료!', { id: 'persona' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'persona' });
    }
  }, [presentation, updateSlide]);

  const generateSlideImage = useCallback(async (slideIndex: number) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    setIsGeneratingImage(true);
    toast.loading('이미지 생성 중...', { id: 'gen-image' });
    try {
      const contentStr = Array.isArray(currentSlide.content) ? currentSlide.content.join(' ') : '';
      const imageUrl = await retryWithBackoff(async () => await aiService.generateImage(`[${presentation.title}] - ${currentSlide.title}`, contentStr), { maxRetries: 1 });
      updateSlide(slideIndex, { imageUrl });
      toast.success('이미지 생성 완료!', { id: 'gen-image' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'gen-image' });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [presentation, updateSlide]);

  const cycleLayout = useCallback((slideIndex: number) => {
    if (!presentation) return;
    const layouts: Slide['layout'][] = ['default', 'split-left', 'split-right', 'highlight', 'grid'];
    const nextLayout = layouts[(layouts.indexOf(presentation.slides[slideIndex].layout || 'default') + 1) % layouts.length];
    updateSlide(slideIndex, { layout: nextLayout });
    toast.success('레이아웃 변경');
  }, [presentation, updateSlide]);

  const handleSave = useCallback(async () => {
    if (!presentation) return;
    setIsSaving(true);
    try {
      const id = await savePresentation(presentation, meetingInfo, settings, template);
      if (id) {
        setPresentation((prev) => (prev ? { ...prev, id } : prev));
        toast.success('저장되었습니다.');
        setSavedList(await loadPresentations());
      } else toast.error('저장 실패');
    } finally {
      setIsSaving(false);
    }
  }, [presentation, meetingInfo, settings, template]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingList(true);
    try { setSavedList(await loadPresentations()); } finally { setIsLoadingList(false); }
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
    setCurrentChatSlideIndex(0);
    setStep('preview');
    setHistoryOpen(false);
    toast.success(`"${saved.title}" 불러오기 완료`);
  }, []);

  const deleteFromHistory = useCallback(async (id: string) => {
    if (await deletePresentation(id)) {
      setSavedList((prev) => prev.filter((p) => p.id !== id));
      toast.success('삭제되었습니다.');
    } else toast.error('삭제 실패');
  }, []);

  const addSlide = useCallback((afterIndex: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides.splice(afterIndex + 1, 0, { slideNumber: 0, title: '', type: 'content', layout: 'default', content: [], notes: '', keyMetrics: [], persona: 'standard' });
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const deleteSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev || prev.slides.length <= 1) return prev;
      const slides = prev.slides.filter((_, i) => i !== index);
      setCurrentChatSlideIndex(c => Math.max(0, Math.min(c, slides.length - 1)));
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const duplicateSlide = useCallback((index: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides.splice(index + 1, 0, JSON.parse(JSON.stringify(slides[index])));
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const moveSlide = useCallback((from: number, to: number) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      setCurrentChatSlideIndex(to);
      return { ...prev, slides: slides.map((s, i) => ({ ...s, slideNumber: i + 1 })) };
    });
  }, []);

  const updatePresentationTitle = useCallback((title: string) => setPresentation((prev) => (prev ? { ...prev, title } : prev)), []);

  const reset = useCallback(() => {
    setStep('upload'); setParsedFiles([]); setFileNames([]); setPresentation(null); setOutline(null); setTemplate('auto'); setReviewResult(null); clearReferenceFile(); setCurrentChatSlideIndex(0);
  }, [clearReferenceFile]);

  const requestReview = useCallback(async () => {
    if (!presentation) return;
    setIsReviewing(true);
    try {
      const resData = await aiService.review({ presentation });
      setReviewResult(resData.review);
    } catch (err: any) { toast.error(getKoreanErrorMessage(err)); } finally { setIsReviewing(false); }
  }, [presentation]);

  const applyReviewFix = useCallback(async (slideIndex: number, issue: string, suggestion: string): Promise<boolean> => {
    if (!presentation) return false;
    try {
      const resData = await retryWithBackoff(async () => await aiService.chatEdit({ userMessage: `문제: ${issue}\n개선: ${suggestion}`, currentSlide: presentation.slides[slideIndex], slideIndex, presentation }), { maxRetries: 1 });
      if (resData.result) { updateSlide(slideIndex, resData.result.slide); toast.success('개선 완료!'); return true; }
      return false;
    } catch (err: any) { toast.error(getKoreanErrorMessage(err)); return false; }
  }, [presentation, updateSlide]);

  const reviewAndFixPresentation = useCallback(async () => {
    if (!presentation) return;
    setIsFixing(true); toast.loading('최적화 중...', { id: 'fix' });
    try {
      const resData = await retryWithBackoff(async () => await aiService.reviewAndFix({ presentation, settings }), { maxRetries: 1 });
      const { presentation: fixedPresentation } = validateAndFixPresentation(resData.result.presentation);
      setPresentation(normalizePresentationSlides(fixedPresentation));
      toast.success('최적화 완료!', { id: 'fix' });
    } catch (err: any) { toast.error(getKoreanErrorMessage(err), { id: 'fix' }); } finally { setIsFixing(false); }
  }, [presentation, settings]);

  const openChatWithSlide = useCallback((slideIndex: number) => { setCurrentChatSlideIndex(slideIndex); setChatOpen(true); }, []);

  return {
    step, setStep, dataSummary: dataSummary(), fileNames, meetingInfo, setMeetingInfo, settings, setSettings, template, setTemplate, outline, isLoadingOutline, presentation, isGenerating, isSaving, handleSave, savedList, isLoadingList, historyOpen, setHistoryOpen, openHistory, loadFromHistory, deleteFromHistory, chatOpen, setChatOpen, currentChatSlideIndex, setCurrentChatSlideIndex, openChatWithSlide, reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix, isFixing, reviewAndFixPresentation, isDark, toggleDark, appTheme, changeTheme, handleFilesUpload, removeFile, handlePromptSubmit, referenceFileName, isAnalyzingReference, referenceStructure, handleReferenceFileUpload, clearReferenceFile, requestOutline, generatePresentation, regenerateSlide, requestChatEdit, changeSlidePersona, cycleLayout, updatePresentationMaster, isGeneratingImage, generateSlideImage, reset, updateSlide, updateAllSlides, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  };
}
