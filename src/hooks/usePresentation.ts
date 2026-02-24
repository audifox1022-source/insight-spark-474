import { useState, useCallback, useEffect } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, Slide, AppStep } from '@/types/presentation';
import { supabase } from '@/integrations/supabase/client';
import { savePresentation, loadPresentations, deletePresentation, SavedPresentation } from '@/lib/presentation-storage';
import { OutlineData } from '@/components/OutlinePreview';
import { toast } from 'sonner';
import { retryWithBackoff, getKoreanErrorMessage } from '@/lib/retry-with-backoff';

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

  // 다크모드
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
        setStep('info');
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

  // ── 구성안 미리보기 요청 ──
  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) return;
    setIsLoadingOutline(true);
    setStep('outline' as ExtendedStep);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-presentation', {
            body: { mode: 'outline', fileData: payload, meetingInfo, settings, template },
          });
          if (error) throw error;
          if (!data?.outline) throw new Error('AI가 구성안 형식을 생성하지 못했습니다.');
          return data;
        },
        {
          maxRetries: 2,
          onRetry: (attempt, max) => {
            toast.loading(`구성안 생성 재시도 중... (${attempt}/${max})`, { id: 'outline-retry' });
          },
        },
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

  // ── 전체 발표자료 생성 (구성안 승인 후) ──
  const generatePresentation = useCallback(async (approvedOutline?: OutlineData) => {
    if (parsedFiles.length === 0) return;
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-presentation', {
            body: {
              mode: 'generate',
              fileData: payload, meetingInfo, settings, template,
              approvedOutline: approvedOutline || null,
            },
          });
          if (error) throw error;
          if (!data?.presentation) throw new Error('AI가 슬라이드 데이터를 올바르게 생성하지 못했습니다.');
          return data;
        },
        {
          maxRetries: 2,
          onRetry: (attempt, max) => {
            toast.loading(`발표자료 생성 재시도 중... (${attempt}/${max})`, { id: 'gen-retry' });
          },
        },
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

  // ── 특정 슬라이드 재생성 ──
  const regenerateSlide = useCallback(async (
    slideIndex: number,
    userInstruction?: string,
  ) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];
    toast.loading('슬라이드를 재생성하는 중...', { id: 'regen' });
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-presentation', {
            body: {
              mode: 'regenerate_slide',
              slideIndex,
              currentSlide,
              presentation,
              fileData: payload,
              meetingInfo,
              settings,
              userInstruction,
            },
          });
          if (error) throw error;
          if (!data?.slide) throw new Error('슬라이드 데이터를 올바르게 재생성하지 못했습니다.');
          return data;
        },
        {
          maxRetries: 1,
          onRetry: () => {
            toast.loading('슬라이드 재생성 재시도 중...', { id: 'regen' });
          },
        },
      );
      setPresentation((prev) => {
        if (!prev) return prev;
        const slides = [...prev.slides];
        slides[slideIndex] = { ...resData.slide, slideNumber: slideIndex + 1 };
        return { ...prev, slides };
      });
      toast.success('슬라이드가 재생성되었습니다!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '슬라이드 재생성'), { id: 'regen' });
    }
  }, [presentation, parsedFiles, meetingInfo, settings]);

  // ── 채팅형 슬라이드 수정 ──
  const requestChatEdit = useCallback(async (
    message: string,
    slideIndex: number,
    currentSlide: Slide,
  ): Promise<{ slide: Slide; summary: string } | null> => {
    try {
      const resData = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-presentation', {
            body: {
              mode: 'chat_edit',
              userMessage: message,
              currentSlide,
              slideIndex,
              presentation,
            },
          });
          if (error) throw error;
          if (!data?.result) throw new Error('AI 수정 결과를 받지 못했습니다.');
          return data;
        },
        { maxRetries: 1 },
      );
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, 'AI 채팅 수정'));
      return null;
    }
  }, [presentation]);

  // ── 저장/히스토리 ──
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

  // ── 슬라이드 편집 ──
  const updateSlide = useCallback((index: number, updated: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], ...updated };
      return { ...prev, slides };
    });
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
  }, []);

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
    isDark, toggleDark,
    handleFilesUpload, removeFile,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  };
}
