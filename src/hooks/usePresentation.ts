import { useState, useCallback, useEffect } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, Slide, AppStep } from '@/types/presentation';
import { supabase } from '@/integrations/supabase/client';
import { savePresentation, loadPresentations, deletePresentation, SavedPresentation } from '@/lib/presentation-storage';
import { toast } from 'sonner';

export function usePresentation() {
  const [step, setStep] = useState<AppStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>('auto');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '',
    department: '',
    reporter: '',
    notes: '',
  });
  const [settings, setSettings] = useState<PresentationSettings>({
    difficulty: 'medium',
    volume: 'standard',
  });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedList, setSavedList] = useState<SavedPresentation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── 다크모드 ──
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
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
      if (failed.length > 0) {
        toast.error(`${failed.length}개 파일을 처리할 수 없습니다.`);
      }
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const generatePresentation = useCallback(async () => {
    if (parsedFiles.length === 0) return;
    setStep('generating');
    setIsGenerating(true);
    try {
      const payload = buildAIPayload(parsedFiles);
      const { data: resData, error } = await supabase.functions.invoke('generate-presentation', {
        body: { fileData: payload, meetingInfo, settings, template },
      });
      if (error) throw error;
      if (resData?.presentation) {
        setPresentation(resData.presentation);
        setStep('preview');
        toast.success('발표 자료가 생성되었습니다!');
      } else {
        throw new Error('발표 자료를 생성하지 못했습니다.');
      }
    } catch (err: any) {
      toast.error(err.message || '발표 자료 생성 중 오류가 발생했습니다.');
      setStep('info');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedFiles, meetingInfo, settings, template]);

  // ── 저장 (localStorage) ──
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

  // ── 히스토리 ──
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
        slideNumber: afterIndex + 2,
        title: '새 슬라이드',
        type: 'data',
        content: ['내용을 입력하세요'],
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
    setPresentation((prev) => prev ? { ...prev, title } : prev);
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
    setTemplate('auto');
  }, []);

  return {
    step, setStep,
    dataSummary: dataSummary(), fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    template, setTemplate,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen,
    openHistory, loadFromHistory, deleteFromHistory,
    isDark, toggleDark,
    handleFilesUpload, removeFile, generatePresentation, reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  };
}
