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

// ─────────────────────────────────────────────────────────────────
// 🔧 핵심 수정: AI 반환 슬라이드를 앱 내부 Slide 타입으로 안전하게 변환
//
// AI가 반환하는 chartData 형식:
//   { type: 'bar', labels: ['A','B'], datasets: [{ label: '값', data: [10,20] }] }
//
// SlideChart(Recharts)가 기대하는 SlideChartData 형식:
//   { chartType: 'bar', data: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }] }
//
// 이 변환이 없으면 SlideChart 내부의 data.some() 호출에서 TypeError 발생
// ─────────────────────────────────────────────────────────────────
function convertAIChartData(rawChartData: any): SlideChartData | undefined {
  if (!rawChartData) return undefined;

  // 이미 SlideChartData 형식인 경우 (data 배열이 name/value 구조)
  if (Array.isArray(rawChartData.data) && rawChartData.data[0]?.name !== undefined) {
    return rawChartData as SlideChartData;
  }

  // AI 반환 형식 (labels + datasets) → SlideChartData 변환
  const labels: string[] = Array.isArray(rawChartData.labels) ? rawChartData.labels : [];
  const datasets: any[] = Array.isArray(rawChartData.datasets) ? rawChartData.datasets : [];

  if (labels.length === 0) return undefined;

  const primaryDataset = datasets[0] || { data: [] };
  const secondaryDataset = datasets[1];

  const data = labels.map((label, i) => ({
    name: String(label),
    value: Number(primaryDataset.data?.[i] ?? 0),
    ...(secondaryDataset ? { value2: Number(secondaryDataset.data?.[i] ?? 0) } : {}),
  }));

  return {
    chartType: (rawChartData.type === 'line' ? 'line'
      : rawChartData.type === 'pie' ? 'pie'
      : rawChartData.type === 'area' ? 'area'
      : 'bar') as SlideChartData['chartType'],
    title: rawChartData.title || '',
    data,
    series1Label: primaryDataset.label || '값',
    series2Label: secondaryDataset?.label,
    showLegend: datasets.length > 1,
  };
}

// ─────────────────────────────────────────────────────────────────
// 🔧 AI 반환 슬라이드 전체를 안전하게 정규화
//   - content, keyMetrics 등 배열 필드 보장
//   - chartData 포맷 변환 적용
// ─────────────────────────────────────────────────────────────────
function normalizeSlideForApp(raw: any, index: number): Slide {
  if (!raw || typeof raw !== 'object') {
    return {
      slideNumber: index + 1,
      type: 'content',
      title: '',
      content: [],
      keyMetrics: [],
    };
  }

  // content 배열 보장 (AI가 points, bullets 등 다양한 키로 반환할 수 있음)
  const rawContent = raw.content ?? raw.points ?? raw.bullets ?? raw.items ?? raw.list ?? [];
  const content: string[] = Array.isArray(rawContent)
    ? rawContent.map((p: any) =>
        p && typeof p === 'object'
          ? String(p.title ?? p.text ?? JSON.stringify(p))
          : String(p)
      )
    : typeof rawContent === 'string'
    ? [rawContent]
    : [];

  // keyMetrics 배열 보장
  const keyMetrics = Array.isArray(raw.keyMetrics) ? raw.keyMetrics : [];

  // chartData 포맷 변환 (핵심: .some() 에러 방지)
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

// ─────────────────────────────────────────────────────────────────
// presentation 전체 슬라이드 정규화
// ─────────────────────────────────────────────────────────────────
function normalizePresentationSlides(presentation: any): Presentation {
  if (!presentation || !Array.isArray(presentation.slides)) {
    return { title: presentation?.title ?? '새 발표 자료', slides: [] };
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
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '', department: '', reporter: '', notes: '',
  });
  const [settings, setSettings] = useState<PresentationSettings>({
    difficulty: 'medium', volume: 'standard',
  });
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
    if (theme !== 'blue') document.documentElement.classList.add(`theme-${theme}`);
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
      const failed = results.filter((r) => r.fileType === 'unknown' || r.parseError);
      const succeeded = results.filter((r) => r.fileType !== 'unknown' && !r.parseError);

      if (succeeded.length > 0) {
        setParsedFiles((prev) => [...prev, ...succeeded]);
        setFileNames((prev) => [...prev, ...succeeded.map((f) => f.fileName)]);
        toast.success(`${succeeded.length}개 파일이 업로드되었습니다.`);
      }

      if (failed.length > 0) {
        failed.forEach((f) => {
          if (f.parseError) {
            toast.error(`"${f.fileName}" 파싱 실패 — 스캔 PDF이거나 손상된 파일일 수 있습니다.`);
          } else {
            toast.error(`"${f.fileName}" 지원하지 않는 형식입니다.`);
          }
        });
      }

      if (succeeded.length === 0 && failed.length > 0) {
        toast.error('파일을 분석할 수 없습니다. 다른 파일을 시도해보세요.');
        return;
      }
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setParsedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePromptSubmit = useCallback((prompt: string) => {
    if (!prompt.trim()) return;

    const dummyFile: ParsedFileData = {
      fileName: '💡_사용자_요청사항.txt',
      fileType: 'text/plain',
      content: prompt,
      summary: prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt,
    };

    setParsedFiles([dummyFile]);
    setFileNames([dummyFile.fileName]);
    setMeetingInfo(prev => ({
      ...prev,
      week: prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt,
    }));
    setStep('info');
    toast.success('요청사항이 접수되었습니다! 세부 설정을 확인해주세요.');
  }, []);

  const requestOutline = useCallback(async () => {
    if (parsedFiles.length === 0) return;
    setIsLoadingOutline(true);
    setStep('outline' as ExtendedStep);
    try {
      const payload = buildAIPayload(parsedFiles);
      const resData = await retryWithBackoff(
        async () => await aiService.getOutline({ fileData: payload, meetingInfo, settings, template }),
        {
          maxRetries: 1,
          onRetry: (attempt, max) => toast.loading(`재시도 중... (${attempt}/${max})`, { id: 'outline-retry' }),
        }
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
        async () => await aiService.generatePresentation({
          fileData: payload, meetingInfo, settings, template,
          approvedOutline: approvedOutline || null,
        }),
        {
          maxRetries: 1,
          onRetry: (attempt, max) => toast.loading(`재시도 중... (${attempt}/${max})`, { id: 'gen-retry' }),
        }
      );
      toast.dismiss('gen-retry');

      // 🔧 핵심 수정: AI 응답을 앱 타입에 맞게 변환 후 저장
      setPresentation(normalizePresentationSlides(resData.presentation));
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

  const updatePresentationMaster = useCallback((updates: Partial<Presentation>) => {
    setPresentation((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const updateSlide = useCallback((index: number, updated: Partial<Slide>) => {
    setPresentation((prev) => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      // ✅ 단순 merge: normalizeSlideForApp 재호출 제거
      // normalizeSlideForApp은 AI 응답 수신 시에만 적용해야 하며,
      // 사용자 직접 편집(튜닝값 등)에 재적용하면 값이 덮어씌워질 수 있음
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
        async () => await aiService.regenerateSlide({
          slideIndex, currentSlide, presentation,
          fileData: payload, userInstruction,
        }),
        { maxRetries: 1, onRetry: () => toast.loading('재시도 중...', { id: 'regen' }) }
      );
      // 🔧 재생성된 슬라이드도 정규화
      updateSlide(slideIndex, { ...resData.slide, slideNumber: slideIndex + 1 });
      toast.success('슬라이드가 재생성되었습니다!', { id: 'regen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '슬라이드 재생성'), { id: 'regen' });
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
      // 🔧 채팅 수정 결과도 정규화
      if (resData.result?.slide) {
        resData.result.slide = normalizeSlideForApp(resData.result.slide, slideIndex);
      }
      return resData.result;
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, 'AI 채팅 수정'));
      return null;
    }
  }, [presentation]);

  const changeSlidePersona = useCallback(async (slideIndex: number, persona: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];

    const personaLabels: Record<string, string> = {
      jobs: '🍎 스티브 잡스', mckinsey: '💼 맥킨지',
      ceo: '👔 임원진 보고', team: '🤝 팀원 공유', client: '🏢 외부 고객',
    };

    toast.loading(`${personaLabels[persona] || '새로운'} 스타일로 변환 중...`, { id: 'persona' });
    try {
      const resData = await retryWithBackoff(
        async () => await aiService.changePersona({ currentSlide, persona }),
        { maxRetries: 1 }
      );
      updateSlide(slideIndex, {
        ...resData.slide,
        slideNumber: slideIndex + 1,
        layout: currentSlide.layout,
        persona: persona as Slide['persona'],
      });
      toast.success('스타일 변환 완료! ✨', { id: 'persona' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '스타일 변환'), { id: 'persona' });
    }
  }, [presentation, updateSlide]);

  const generateSlideImage = useCallback(async (slideIndex: number) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[slideIndex];

    setIsGeneratingImage(true);
    toast.loading('AI가 내용에 맞는 배경 이미지를 그리고 있습니다... 🎨 (약 5~10초 소요)', { id: 'gen-image' });

    try {
      const contentStr = Array.isArray(currentSlide.content) && currentSlide.content.length > 0
        ? currentSlide.content.join(' ')
        : '비즈니스 프레젠테이션';
      const imageUrl = await aiService.generateImage(currentSlide.title, contentStr);

      updateSlide(slideIndex, { imageUrl });
      toast.success('AI 배경 이미지가 성공적으로 적용되었습니다! ✨', { id: 'gen-image' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err, '이미지 생성'), { id: 'gen-image' });
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
    // 🔧 히스토리에서 불러올 때도 정규화 적용 (저장 당시 포맷이 달랐을 수 있음)
    setPresentation(normalizePresentationSlides({
      id: saved.id,
      title: saved.title,
      slides: saved.slides,
    }));
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

  const applyReviewFix = useCallback(async (
    slideIndex: number,
    issue: string,
    suggestion: string,
  ): Promise<boolean> => {
    if (!presentation) return false;
    const currentSlide = presentation.slides[slideIndex];
    const instruction = `리뷰어의 피드백을 반영해주세요. 지적된 문제점: "${issue}", 개선 제안: "${suggestion}". 이 제안에 맞게 슬라이드의 내용을 완벽하게 수정하세요.`;

    try {
      const resData = await retryWithBackoff(
        async () => await aiService.chatEdit({ userMessage: instruction, currentSlide, slideIndex, presentation }),
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
        async () => await aiService.reviewAndFix({ presentation }),
        {
          maxRetries: 1,
          onRetry: () => toast.loading('최적화 재시도 중...', { id: 'review-fix' }),
        }
      );
      // 🔧 전체 최적화 결과도 정규화
      setPresentation(normalizePresentationSlides(resData.result.presentation));
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
    handlePromptSubmit,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout, updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  };
}
