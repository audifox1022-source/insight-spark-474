import { useState, useCallback } from 'react';
import { parseFile, ParsedFileData, buildAIPayload } from '@/lib/file-parser';
import { MeetingInfo, PresentationSettings, Presentation, AppStep } from '@/types/presentation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePresentation() {
  const [step, setStep] = useState<AppStep>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFileData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '',
    department: '단조사업부 생산부문',
    reporter: '',
    notes: '',
  });
  const [settings, setSettings] = useState<PresentationSettings>({
    difficulty: 'medium',
    volume: 'standard',
  });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
        body: { fileData: payload, meetingInfo, settings },
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
  }, [parsedFiles, meetingInfo, settings]);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedFiles([]);
    setFileNames([]);
    setPresentation(null);
  }, []);

  return {
    step, setStep,
    dataSummary: dataSummary(), fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    presentation, isGenerating,
    handleFilesUpload, removeFile, generatePresentation, reset,
  };
}
