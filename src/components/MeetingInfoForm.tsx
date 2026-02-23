import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import { Sparkles, ArrowLeft, SlidersHorizontal } from 'lucide-react';

interface MeetingInfoFormProps {
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

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '쉬움', desc: '핵심 내용만 간단히' },
  { value: 'medium', label: '보통', desc: '일반적인 업무 보고 수준' },
  { value: 'hard', label: '상세', desc: '심층 분석 및 전문 용어 포함' },
  { value: 'executive', label: '임원급', desc: '경영진 보고 수준의 전략적 관점' },
];

const VOLUME_OPTIONS = [
  { value: 'brief', label: '간략 (3-4장)', desc: '핵심만 압축' },
  { value: 'standard', label: '표준 (5-7장)', desc: '일반적인 보고 분량' },
  { value: 'detailed', label: '상세 (8-12장)', desc: '세부 분석 포함' },
  { value: 'comprehensive', label: '종합 (13장+)', desc: '전체 데이터 심층 분석' },
];

export function MeetingInfoForm({
  info, onChange, settings, onSettingsChange, onGenerate, onBack, isGenerating, fileNames, dataSummary,
}: MeetingInfoFormProps) {
  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

  const updateSetting = <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-xl mx-auto space-y-6"
    >
      {/* File info card */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <span className="text-success text-lg">📊</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
            <p className="text-xs text-muted-foreground">{dataSummary}</p>
          </div>
        </div>
      </div>

      {/* Presentation settings */}
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
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                    </div>
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
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="week">회의 주차</Label>
            <Input
              id="week"
              placeholder="예: 2024년 제24주"
              value={info.week}
              onChange={(e) => update('week', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reporter">보고자</Label>
            <Input
              id="reporter"
              placeholder="홍길동 부장"
              value={info.reporter}
              onChange={(e) => update('reporter', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">보고 부서</Label>
          <Input
            id="department"
            value={info.department}
            onChange={(e) => update('department', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">특이사항 / 추가 지시사항</Label>
          <Textarea
            id="notes"
            placeholder="특이사항이나 AI가 참고할 내용을 입력하세요..."
            value={info.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          이전
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? '발표 자료 생성 중...' : '발표 자료 생성'}
        </Button>
      </div>
    </motion.div>
  );
}
