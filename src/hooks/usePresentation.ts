import { useState, useCallback } from 'react';
import { parseExcelFile, ParsedExcelData, summarizeForAI } from '@/lib/excel-parser';
import { MeetingInfo, Presentation, AppStep } from '@/types/presentation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePresentation() {
  const [step, setStep] = useState<AppStep>('upload');
  const [allExcelData, setAllExcelData] = useState<ParsedExcelData[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '',
    department: '단조사업부 생산부문',
    reporter: '',
    notes: '',
  });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const mergedData = useCallback((): ParsedExcelData | null => {
    if (allExcelData.length === 0) return null;
    const merged: ParsedExcelData = { sheetNames: [], sheets: {}, summary: '' };
    for (const d of allExcelData) {
      for (const name of d.sheetNames) {
        const uniqueName = merged.sheetNames.includes(name) ? `${name}_${merged.sheetNames.length}` : name;
        merged.sheetNames.push(uniqueName);
        merged.sheets[uniqueName] = d.sheets[name];
      }
    }
    const totalRows = Object.values(merged.sheets).reduce((a, s) => a + s.length, 0);
    merged.summary = `파일 ${allExcelData.length}개, 시트 ${merged.sheetNames.length}개, 총 ${totalRows}행`;
    return merged;
  }, [allExcelData]);

  const handleFilesUpload = useCallback(async (files: File[]) => {
    try {
      const results = await Promise.all(files.map(parseExcelFile));
      setAllExcelData((prev) => [...prev, ...results]);
      setFileNames((prev) => [...prev, ...files.map((f) => f.name)]);
      setStep('info');
      toast.success(`${files.length}개 파일이 업로드되었습니다.`);
    } catch {
      toast.error('일부 엑셀 파일을 처리할 수 없습니다.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAllExcelData((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const generatePresentation = useCallback(async () => {
    const data = mergedData();
    if (!data) return;
    setStep('generating');
    setIsGenerating(true);

    try {
      const summarized = summarizeForAI(data.sheets);
      const { data: resData, error } = await supabase.functions.invoke('generate-presentation', {
        body: { excelData: summarized, meetingInfo },
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
  }, [mergedData, meetingInfo]);

  const reset = useCallback(() => {
    setStep('upload');
    setAllExcelData([]);
    setFileNames([]);
    setPresentation(null);
  }, []);

  return {
    step, setStep,
    excelData: mergedData(), fileNames,
    meetingInfo, setMeetingInfo,
    presentation, isGenerating,
    handleFilesUpload, removeFile, generatePresentation, reset,
  };
}
