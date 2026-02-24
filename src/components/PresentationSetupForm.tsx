import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import { Sparkles, ArrowLeft, SlidersHorizontal, Layout, FileText, BarChart3, Lightbulb, Wand2 } from 'lucide-react';

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
}

const TEMPLATES = [
  {
    id: 'auto',
    icon: <Wand2 className="w-5 h-5" />,
    label: 'AI 자동 구성',
    desc: '파일 내용을 분석해 최적의 구성을 자동 제안',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'report',
    icon: <FileText className="w-5 h-5" />,
    label: '보고서',
    desc: '현황 → 분석 → 결론 → 실행계획 흐름',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'analysis',
    icon: <BarChart3 className="w-5 h-5" />,
    label: '데이터 분석',
    desc: '차트와 수치 중심의 분석 발표 구성',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'proposal',
    icon: <Lightbulb className="w-5 h-5" />,
    label: '제안서',
    desc: '문제 제기 → 솔루션 → 기대효과 흐름',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'summary',
    icon: <Layout className="w-5 h-5" />,
    label: '요약 브리핑',
    desc: '핵심 내용만 간결하게 압축한 구성',
    color: 'from-emerald-500 to-teal-600',
  },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '쉬움', desc: '핵심만 간단히' },
  { value: 'medium', label: '보통', desc: '일반 업무 보고 수준' },
  { value: 'hard', label: '상세', desc: '심층 분석 포함' },
  { value: 'executive', label: '임원급', desc: '경영진 보고 수준' },
];

const VOLUME_OPTIONS = [
  { value: 'brief', label: '간략 (3-4장)' },
  { value: 'standard', label: '표준 (5-7장)' },
  { value: 'detailed', label: '상세 (8-12장)' },
  { value: 'comprehensive', label: '종합 (13장+)' },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange, onGenerate, onBack,
  isGenerating, fileNames, dataSummary,
}: PresentationSetupFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('auto');

  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

  const updateSetting = <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* 업로드된 파일 정보 */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <span className="text-success text-lg">📊</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
            <p className="text-xs text-muted-foreground">{dataSummary}</p>
          </div>
        </div>
      </div>

      {/* 템플릿 선택 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layout className="w-4 h-4 text-primary" />
          발표자료 유형 선택
        </div>
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl.id)}
              className={`
                flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                ${selectedTemplate === tpl.id
                  ? 'border-primary bg-primary/5 shadow-card'
                  : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/60'
                }
              `}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tpl.color} flex items-center justify-center text-white flex-shrink-0`}>
                {tpl.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{tpl.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tpl.desc}</p>
              </div>
              {selectedTemplate === tpl.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 발표 설정 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          발표자료 설정
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty">난이도</Label>
            <Select value={settings.difficulty} onValueChange={(v) => updateSetting('difficulty', v as PresentationSettings['difficulty'])}>
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume">분량</Label>
            <Select value={settings.volume} onValueChange={(v) => updateSetting('volume', v as PresentationSettings['volume'])}>
              <SelectTrigger id="volume">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOLUME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 발표 주제 및 추가 지시사항 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="w-4 h-4 text-primary" />
          발표 정보 (선택)
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">발표 주제 / 제목</Label>
            <Input
              id="topic"
              placeholder="예: 2024년 3분기 실적 분석 보고"
              value={info.week}
              onChange={(e) => update('week', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporter">발표자</Label>
              <Input
                id="reporter"
                placeholder="홍길동"
                value={info.reporter}
                onChange={(e) => update('reporter', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">소속 / 부서</Label>
              <Input
                id="department"
                placeholder="전략기획팀"
                value={info.department}
                onChange={(e) => update('department', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">AI 추가 지시사항</Label>
            <Textarea
              id="notes"
              placeholder="예: 경쟁사 비교 강조, 비용 절감 방향 중심으로 구성, 3페이지에 차트 필수 포함..."
              value={info.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          이전
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 py-5 text-base"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? '발표 자료 생성 중...' : 'AI로 발표자료 생성'}
        </Button>
      </div>
    </motion.div>
  );
}
