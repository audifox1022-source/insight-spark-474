import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MeetingInfo } from '@/types/presentation';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface MeetingInfoFormProps {
  info: MeetingInfo;
  onChange: (info: MeetingInfo) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
  fileName: string;
  dataSummary: string;
}

export function MeetingInfoForm({
  info, onChange, onGenerate, onBack, isGenerating, fileName, dataSummary,
}: MeetingInfoFormProps) {
  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

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
          <div>
            <p className="font-medium text-sm">{fileName}</p>
            <p className="text-xs text-muted-foreground">{dataSummary}</p>
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
            placeholder="금주 특이사항이나 AI가 참고할 내용을 입력하세요..."
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
