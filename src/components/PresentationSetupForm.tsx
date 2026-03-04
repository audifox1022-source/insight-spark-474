import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import {
  Sparkles, ArrowLeft, SlidersHorizontal, Layout, FileText,
  BarChart3, Lightbulb, Wand2, Star, Trash2, BookmarkPlus,
  ChevronDown, ChevronUp, Upload, Loader2, Palette, X, ClipboardList,
} from 'lucide-react';
import { saveFavoriteTemplate, loadFavoriteTemplates, deleteFavoriteTemplate, FavoriteTemplate } from '@/lib/favorite-templates';
import { toast } from 'sonner';
import { aiService } from '@/lib/ai-service';
import { ReferenceStructure } from '@/hooks/usePresentation';

interface PresentationSetupFormProps {
  info: MeetingInfo;
  onChange: (info: MeetingInfo) => void;
  settings: PresentationSettings;
  onSettingsChange: (settings: PresentationSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
  fileNames: string[];
  dataSummary: string;
  template: string;
  setTemplate: (t: string) => void;
  // ✅ NEW: 참고 양식 props
  referenceFileName: string;
  isAnalyzingReference: boolean;
  referenceStructure: ReferenceStructure | null;
  onReferenceFileUpload: (files: File[]) => void;
  onClearReferenceFile: () => void;
}

const TEMPLATES = [
  { id: 'auto',     icon: <Wand2 className="w-5 h-5" />,    label: 'AI 자동',    desc: 'AI가 최적 구성 자동 판단',   color: 'from-violet-500 to-purple-600' },
  { id: 'report',   icon: <FileText className="w-5 h-5" />,  label: '보고서',     desc: '업무 보고서 형식',           color: 'from-blue-500 to-indigo-600' },
  { id: 'analysis', icon: <BarChart3 className="w-5 h-5" />, label: '분석 자료',  desc: '데이터 분석 중심',           color: 'from-cyan-500 to-blue-600' },
  { id: 'proposal', icon: <Lightbulb className="w-5 h-5" />, label: '기획안',     desc: '제안서 / 기획 발표',         color: 'from-amber-500 to-orange-600' },
  { id: 'summary',  icon: <Layout className="w-5 h-5" />,    label: '요약 자료',  desc: '핵심만 정리한 요약본',       color: 'from-emerald-500 to-teal-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy',      label: '초급',   desc: '쉬운 설명' },
  { value: 'medium',    label: '중급',   desc: '실무 표준' },
  { value: 'hard',      label: '고급',   desc: '전문가용' },
  { value: 'executive', label: '임원용', desc: 'ROI 중심' },
];

const VOLUME_OPTIONS = [
  { value: 'brief',         label: '간략 (3-5장)' },
  { value: 'standard',      label: '표준 (6-10장)' },
  { value: 'detailed',      label: '상세 (11-15장)' },
  { value: 'comprehensive', label: '완전 (16장+)' },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange,
  onGenerate, onBack, isGenerating,
  fileNames, dataSummary, template, setTemplate,
  referenceFileName, isAnalyzingReference, referenceStructure,
  onReferenceFileUpload, onClearReferenceFile,
}: PresentationSetupFormProps) {
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [favName, setFavName] = useState('내 PPT 설정');
  const [templateFile, setTemplateFile] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedStyle, setExtractedStyle] = useState<{
    primaryColor: string; accentColor: string; description: string;
  } | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null); // ✅ NEW

  useEffect(() => { setFavorites(loadFavoriteTemplates()); }, []);

  const update = (key: keyof MeetingInfo, value: string) => onChange({ ...info, [key]: value });
  const updateSetting = <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  const handleSaveFavorite = () => {
    if (!favName.trim()) { toast.error('이름을 입력해주세요.'); return; }
    saveFavoriteTemplate(favName.trim(), template, settings, {
      department: info.department, reporter: info.reporter,
    });
    setFavorites(loadFavoriteTemplates());
    setFavName('내 PPT 설정');
    setShowSaveDialog(false);
    toast.success(`"${favName}" 저장 완료`);
  };

  const handleLoadFavorite = (fav: FavoriteTemplate) => {
    setTemplate(fav.template);
    onSettingsChange(fav.settings);
    if (fav.meetingInfo?.department) onChange({ ...info, department: fav.meetingInfo.department });
    if (fav.meetingInfo?.reporter) onChange({ ...info, reporter: fav.meetingInfo.reporter ?? '' });
    setShowFavorites(false);
    toast.success(`"${fav.name}" 불러옴`);
  };

  const handleDeleteFavorite = (id: string, name: string) => {
    deleteFavoriteTemplate(id);
    setFavorites(loadFavoriteTemplates());
    toast.success(`"${name}" 삭제됨`);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(pptx?|png|jpe?g)$/i)) {
      toast.error('PPT, PNG, JPG 파일만 지원합니다.');
      return;
    }
    setTemplateFileName(file.name);
    setIsAnalyzing(true);
    setExtractedStyle(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setTemplateFile(dataUrl);
      const result = await aiService.analyzeTemplate(dataUrl);
      setExtractedStyle({
        primaryColor: result.primaryColor || '#1B3A5C',
        accentColor: result.accentColor || '#0D8ECF',
        description: result.description || '',
      });
      toast.success('템플릿 스타일 분석 완료!');
    } catch (err: any) {
      toast.error(err?.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTemplate = () => {
    setTemplateFile(null);
    setTemplateFileName('');
    setExtractedStyle(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  // ✅ NEW: 참고 파일 드롭존 핸들러
  const handleReferenceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onReferenceFileUpload(files);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* 업로드된 파일 표시 */}
      {fileNames.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success text-lg">✅</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
              <p className="text-xs text-
