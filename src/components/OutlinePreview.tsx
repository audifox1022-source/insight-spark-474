import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, ChevronRight, BarChart3, Target, ClipboardList, Layout, Edit3, Check, X } from 'lucide-react';
import { useState } from 'react';

export interface OutlineItem {
  slideNumber: number;
  title: string;
  type: string;
  description: string;
}

export interface OutlineData {
  title: string;
  outline: OutlineItem[];
}

interface OutlinePreviewProps {
  outline: OutlineData;
  isGenerating: boolean;
  onConfirm: (outline: OutlineData) => void;
  onBack: () => void;
}

const slideTypeIcons: Record<string, React.ReactNode> = {
  title: <Layout className="w-3.5 h-3.5" />,
  data: <BarChart3 className="w-3.5 h-3.5" />,
  chart: <BarChart3 className="w-3.5 h-3.5" />,
  action: <Target className="w-3.5 h-3.5" />,
  summary: <ClipboardList className="w-3.5 h-3.5" />,
};

const slideTypeBadgeColors: Record<string, string> = {
  title: 'bg-violet-100 text-violet-700',
  data: 'bg-blue-100 text-blue-700',
  chart: 'bg-cyan-100 text-cyan-700',
  action: 'bg-amber-100 text-amber-700',
  summary: 'bg-emerald-100 text-emerald-700',
};

const slideTypeLabels: Record<string, string> = {
  title: '표지', data: '데이터', chart: '차트', action: '실행계획', summary: '요약',
};

function EditableOutlineItem({
  item, onUpdate,
}: {
  item: OutlineItem;
  onUpdate: (updated: OutlineItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  const save = () => {
    onUpdate({ ...item, title: draft });
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all group"
    >
      {/* 번호 */}
      <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 text-primary-foreground text-xs font-bold">
        {item.slideNumber}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium ${slideTypeBadgeColors[item.type] || 'bg-muted text-muted-foreground'}`}>
            {slideTypeIcons[item.type]}
            {slideTypeLabels[item.type] || item.type}
          </span>
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 text-sm font-semibold"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button onClick={save} className="w-6 h-6 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-tight">{item.title}</p>
            <button
              onClick={() => { setDraft(item.title); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
    </motion.div>
  );
}

export function OutlinePreview({ outline, isGenerating, onConfirm, onBack }: OutlinePreviewProps) {
  const [editableOutline, setEditableOutline] = useState<OutlineData>(outline);

  const updateItem = (index: number, updated: OutlineItem) => {
    setEditableOutline((prev) => {
      const newOutline = [...prev.outline];
      newOutline[index] = updated;
      return { ...prev, outline: newOutline };
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto space-y-5"
    >
      {/* 헤더 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          AI가 구성안을 제안했습니다
        </div>
        <h3 className="text-xl font-bold">{editableOutline.title}</h3>
        <p className="text-sm text-muted-foreground">
          총 {editableOutline.outline.length}장 · 슬라이드 제목을 클릭해 수정할 수 있어요
        </p>
      </div>

      {/* 목차 리스트 */}
      <div className="space-y-2">
        {editableOutline.outline.map((item, i) => (
          <EditableOutlineItem
            key={i}
            item={item}
            onUpdate={(updated) => updateItem(i, updated)}
          />
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          ← 다시 설정
        </Button>
        <Button
          onClick={() => onConfirm(editableOutline)}
          disabled={isGenerating}
          className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 py-5 text-base"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 발표자료 생성 중...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> 이 구성으로 생성하기</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
