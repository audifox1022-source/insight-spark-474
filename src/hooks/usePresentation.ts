import { useState, useCallback, useEffect } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, Slide, AppStep } from '@/types/presentation';
import { savePresentation, loadPresentations, deletePresentation, SavedPresentation } from '@/lib/presentation-storage';
import { OutlineData } from '@/components/OutlinePreview';
import { ReviewResult } from '@/components/ReviewPanel';
import { toast } from 'sonner';
import { retryWithBackoff, getKoreanErrorMessage } from '@/lib/retry-with-backoff';
import { aiService } from '@/lib/ai-service'; // ✨ Supabase 대신 직접 만든 aiService 호출

export type ExtendedStep = AppStep | 'outline';

export function usePresentation() {
  const [step, setStep] = useState<ExtendedStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>('auto');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '', department: '', reporter: '', notes: '',
  });
  const [settings, setSettings] = useState<PresentationSettings>({
    difficulty: 'medium', volume: 'standard',
  });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedList, setSavedList] = useState<SavedPresentation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const [appTheme, setAppTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('app_theme') || 'blue';
    return 'blue';
  });

  const changeTheme = useCallback((theme: string) => {
    document.documentElement.classList.remove('theme-navy', 'theme-purple', 'theme-green', 'theme-orange');
    if (theme !== 'blue') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('app_theme', theme);
    setAppTheme(theme);
    toast.success('테마가 변경되었습니다.');
  }, []);

  const [isDark, setIsDark] = useState(() => {
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
    return parsedFiles.map((f) => f.summary).join(' | ');
  }, [parsedFiles]);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    try {
      const results = await Promise.all(files.map(parseFile));
      const failed = results.filter((r) => r.fileType === 'unknown');
      const succeeded = results.filter((r) => r.fileType !== 'unknown');
      if (succeeded.length > 0) {
        setParsedFiles((prev) => [...prev, ...succeeded]);
        setFileNames((prev) => [...prev, ...succeeded.map((f) => f.fileName)]);
        toast.success(`${succeeded.length}개 파일이 업로드되었습니다.`);
      }
      if (failed.length > 0) toast.error(`${failed.length}개 파일을 처리할 수 없습니다.`);
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── ✨ Supabase 대신 Client-Side API 직접 호출 ──
  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) return;
    setIsLoadingOutline(true);
    setStep('outline' as ExtendedStep);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.getOutline({ fileData: payload, meetingInfo, settings, template });
        },
        { maxRetries: 1, onRetry: (attempt, max) => toast.loading(`구성안 생성 재시도 중... (${attempt}/${max})`, { id: 'outline-retry' }) }
      );
      toast.dismiss('outline-retry');
      setOutline(resData.outline);
    } catch (err: any) {
      toast.dismiss('outline-retry');
      toast.error(getKoreanErrorMessage(err, '구성안 생성'));
      setStep('info');
    } finally {
      setIsLoadingOutline(false);
    }
  }, [parsedFiles, meetingInfo, settings, template]);

  const generatePresentation = useCallback(async (approvedOutline?: OutlineData) => {
    if (parsedFiles.length === 0) return;
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.generatePresentation({ fileData: payload, meetingInfo, settings, template, approvedOutline: approvedOutline || null });
        },
        { maxRetries: 1, onRetry: (attempt, max) => toast.loading(`발표자료 생성 재시도 중... (${attempt}/${max})`, { id: 'gen-retry' }) }
      );
      toast.dismiss('gen-retry');
      setPresentation(resData.presentation);
      setStep('preview');
      toast.success('발표 자료가 생성되었습니다!');
    } catch (err: any) {
      toast.dismiss('gen-retry');
      toast.error(getKoreanErrorMessage(err, '발표자료 생성'));
      setStep('info');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedFiles, meetingInfo, settings, template]);

  const updateSlide = useCallback((index: number, updated: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], ...updated };
      return { ...prev, slides };
    });
  }, []);

  const regenerateSlide = useCallback(async (slideIndex: number, userInstruction?: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading('슬라이드를 재생성하는 중...', { id: 'regen' });
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.regenerateSlide({ slideIndex, currentSlide, presentation, fileData: payload, userInstruction });
        },
        { maxRetries: 1, onRetry: () => toast.loading('슬라이드 재생성 재시도 중...', { id: 'regen' }) }
      );
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1 });
      toast.success('슬라이드가 재생성되었습니다!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '슬라이드 재생성'), { id: 'regen' });
    }
  }, [presentation, parsedFiles, updateSlide]);

  const requestChatEdit = useCallback(async (message: string, slideIndex: number, currentSlide: Slide): Promise<{ slide: Slide; summary: string } | null> => {
    try {
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.chatEdit({ userMessage: message, currentSlide, slideIndex, presentation });
        },
        { maxRetries: 1 }
      );
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, 'AI 채팅 수정'));
      return null;
    }
  }, [presentation]);

  const changeSlidePersona = useCallback(async (slideIndex: number, persona: 'jobs' | 'mckinsey') => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading(`${persona === 'jobs' ? '🍎 스티브 잡스' : '💼 맥킨지'} 스타일로 변환 중...`, { id: 'persona' });

    try {
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.changePersona({ currentSlide, persona });
        },
        { maxRetries: 1 }
      );
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1, layout: currentSlide.layout, persona });
      toast.success('스타일 변환 완료! ✨', { id: 'persona' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '스타일 변환'), { id: 'persona' });
    }
  }, [presentation, updateSlide]);

  const cycleLayout = useCallback((slideIndex: number) => {
    if (!presentation) return;
    const layouts: Slide['layout'][] = ['default', 'split-left', 'split-right', 'highlight', 'grid'];
    const currentLayout = presentation.slides[slideIndex].layout || 'default';
    const nextLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
    
    updateSlide(slideIndex, { layout: nextLayout });
    toast.success('레이아웃이 변경되었습니다 🪄');
  }, [presentation, updateSlide]);

  const handleSave = useCallback(async () => {
    if (!presentation) return;
    setIsSaving(true);
    try {
      const id = await savePresentation(presentation, meetingInfo, settings, template);
      if (id) {
        setPresentation((prev) => prev ? { ...prev, id } : prev);
        toast.success('발표 자료가 저장되었습니다.');
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
    setPresentation({ id: saved.id, title: saved.title, slides: saved.slides });
    setMeetingInfo(saved.meetingInfo);
    setSettings(saved.settings);
    setTemplate(saved.template);
    setStep('preview');
    setHistoryOpen(false);
    toast.success(`"${saved.title}" 불러왔습니다.`);
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
        slideNumber: afterIndex + 2, title: '새 슬라이드', type: 'data',
        content: ['내용을 입력하세요'], notes: '', keyMetrics: [],
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
    setPresentation((prev) => prev ? { ...prev, title } : prev);
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
    setOutline(null);
    setTemplate('auto');
    setReviewResult(null);
  }, []);

  const requestReview = useCallback(async () => {
    if (!presentation) return;
    setIsReviewing(true);
    try {
      const resData = await aiService.review({ presentation });
      setReviewResult(resData.review);
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '리뷰'));
    } finally {
      setIsReviewing(false);
    }
  }, [presentation]);

  const applyReviewFix = useCallback(async (slideIndex: number, issue: string, suggestion: string) => {
    if (!presentation) return false;
    const currentSlide = presentation.slides[slideIndex];
    const instruction = `리뷰어의 피드백을 반영해주세요. 지적된 문제점: "${issue}", 개선 제안: "${suggestion}". 이 제안에 맞게 슬라이드의 내용을 완벽하게 수정하세요.`;
    
    try {
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.chatEdit({ userMessage: instruction, currentSlide, slideIndex, presentation });
        },
        { maxRetries: 1 }
      );
      if (resData.result) {
        updateSlide(slideIndex, resData.result.slide);
        toast.success(`✨ 슬라이드 ${slideIndex + 1}번에 제안이 적용되었습니다!`);
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '제안 적용'));
      return false;
    }
  }, [presentation, updateSlide]);

  const reviewAndFixPresentation = useCallback(async () => {
    if (!presentation) return;
    setIsFixing(true);
    toast.loading('AI가 전체 내용을 분석하고 흐름을 최적화하고 있습니다...', { id: 'review-fix' });

    try {
      const resData = await retryWithBackoff(
        async () => {
          return await aiService.reviewAndFix({ presentation });
        },
        { maxRetries: 1, onRetry: () => toast.loading('최적화 재시도 중...', { id: 'review-fix' }) }
      );
      setPresentation(resData.result.presentation);
      toast.success(`최적화 완료! ✨ ${resData.result.summary}`, { id: 'review-fix', duration: 5000 });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '전체 최적화'), { id: 'review-fix' });
    } finally {
      setIsFixing(false);
    }
  }, [presentation]);

  return {
    step, setStep,
    dataSummary: dataSummary(), fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    template, setTemplate,
    outline, isLoadingOutline,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen,
    openHistory, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen,
    reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  };
}
