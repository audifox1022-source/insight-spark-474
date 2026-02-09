import { useState, useCallback } from 'react';
import { parseExcelFile, ParsedExcelData } from '@/lib/excel-parser';
import { MeetingInfo, Presentation, AppStep } from '@/types/presentation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePresentation() {
  const [step, setStep] = useState<AppStep>('upload');
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
  const [fileName, setFileName] = useState('');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    week: '',
    department: '단조사업부 생산부문',
    reporter: '',
    notes: '',
  });
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      setExcelData(parsed);
      setFileName(file.name);
      setStep('info');
      toast.success(`${file.name} 파일이 성공적으로 업로드되었습니다.`);
    } catch {
      toast.error('엑셀 파일을 처리할 수 없습니다.');
    }
  }, []);

  const generatePresentation = useCallback(async () => {
    if (!excelData) return;
    setStep('generating');
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { excelData: excelData.sheets, meetingInfo },
      });

      if (error) throw error;
      if (data?.presentation) {
        setPresentation(data.presentation);
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
  }, [excelData, meetingInfo]);

  const reset = useCallback(() => {
    setStep('upload');
    setExcelData(null);
    setFileName('');
    setPresentation(null);
  }, []);

  return {
    step, setStep,
    excelData, fileName,
    meetingInfo, setMeetingInfo,
    presentation, isGenerating,
    handleFileUpload, generatePresentation, reset,
  };
}
