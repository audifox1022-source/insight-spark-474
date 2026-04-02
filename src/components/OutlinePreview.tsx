// ============================================================
// src/components/OutlinePreview.tsx
// [Phase 29] 목차 항목 삭제 및 순서 변경(Up/Down) 기능 추가
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Sparkles, BarChart3, Target, 
  ClipboardList, Layout, Edit3, Check, X,
  ArrowUp, ArrowDown, Trash2
} from 'lucide-react';
import { useState } from 'react';

export interface OutlineItem {
  slideNumber: number;
  title: string;
  type: string;
  description: string;
  speakerPersona?: string;
  strategicGoal?: string;
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
  title: 'bg-violet-100 text-violet-700 border-violet-200',
  data: 'bg-blue-100 text-blue-700 border-blue-200',
  chart: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  action: 'bg-amber-100 text-amber-700 border-amber-200',
  summary: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const slideTypeLabels: Record<string, string> = {
  title: '표지', data: '데이터', chart: '차트', action: '실행계획', summary: '요약',
};

function EditableOutlineItem({
  item, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast
}: {
  item: OutlineItem;
  onUpdate: (updated: OutlineItem) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  const save = () => {
    onUpdate({ ...item, title: draft });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col gap-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all group relative overflow-hidden h-full"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-[1.5]" />

      <div className="flex flex-col h-full z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 text-white text-sm font-black shadow-md border-2 border-white">
              {item.slideNumber}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${slideTypeBadgeColors[item.type] || 'bg-muted text-muted-foreground border-slate-200'}`}>
              {slideTypeIcons[item.type]}
              {slideTypeLabels[item.type] || item.type}
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className={`p-1.5 rounded-lg border transition-colors ${isFirst ? 'text-slate-200 border-slate-100' : 'text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className={`p-1.5 rounded-lg border transition-colors ${isLast ? 'text-slate-200 border-slate-100' : 'text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-10 text-sm font-bold border-indigo-200 focus-visible:ring-indigo-500 shadow-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && save()}
              />
              <button onClick={save} className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 transition-colors shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 group/title mb-3">
              <h4 className="text-lg font-black text-slate-800 leading-tight line-clamp-2">{item.title}</h4>
              <button
                onClick={() => { setDraft(item.title); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-400 border border-transparent hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <p className="text-sm text-slate-600 leading-relaxed tracking-wide line-clamp-4 mb-4 flex-1">
            {item.description}
          </p>

          <div className="flex flex-col gap-2 mt-auto">
            {item.speakerPersona && (
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50/80 border border-indigo-100/80 text-indigo-700 text-[12px] font-bold rounded-xl mr-auto">
                <span>🗣️</span> 톤앤매너: {item.speakerPersona}
              </div>
            )}
            {item.strategicGoal && (
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50/80 border border-amber-100/80 text-amber-700 text-[12px] font-bold rounded-xl mr-auto">
                <span>💡</span> 전략 목표: {item.strategicGoal}
              </div>
            )}
          </div>
        </div>
      </div>
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

  const deleteItem = (index: number) => {
    setEditableOutline((prev) => {
      const newOutline = prev.outline.filter((_, i) => i !== index).map((o, idx) => ({
        ...o,
        slideNumber: idx + 1
      }));
      return { ...prev, outline: newOutline };
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setEditableOutline((prev) => {
      const newOutline = [...prev.outline];
      [newOutline[index - 1], newOutline[index]] = [newOutline[index], newOutline[index - 1]];
      const resortOutline = newOutline.map((o, idx) => ({ ...o, slideNumber: idx + 1 }));
      return { ...prev, outline: resortOutline };
    });
  };

  const moveDown = (index: number) => {
    if (index === editableOutline.outline.length - 1) return;
    setEditableOutline((prev) => {
      const newOutline = [...prev.outline];
      [newOutline[index + 1], newOutline[index]] = [newOutline[index], newOutline[index + 1]];
      const resortOutline = newOutline.map((o, idx) => ({ ...o, slideNumber: idx + 1 }));
      return { ...prev, outline: resortOutline };
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[1400px] mx-auto px-8 space-y-10 flex flex-col items-center justify-center py-12"
    >
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 text-sm font-bold border border-indigo-100 shadow-sm">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          AI가 데이터 분석을 기반으로 최적의 전체 목차를 설계했습니다
        </div>
        <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">{editableOutline.title}</h3>
        <p className="text-base text-slate-500 font-medium text-center">
          총 <strong className="text-indigo-600">{editableOutline.outline.length}</strong>개의 슬라이드 후보가 준비되었습니다. 장표를 추가하거나 삭제, 순서를 변경하여 나만의 발표 시나리오를 완성하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full border-t border-slate-200 pt-8">
        <AnimatePresence>
          {editableOutline.outline.map((item, i) => (
            <EditableOutlineItem
              key={i}
              item={item}
              isFirst={i === 0}
              isLast={i === editableOutline.outline.length - 1}
              onUpdate={(updated) => updateItem(i, updated)}
              onDelete={() => deleteItem(i)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 pt-8 pb-4 w-full max-w-3xl border-t border-border mt-8">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="w-36 h-16 rounded-2xl border-slate-300 border-2 text-slate-700 font-bold hover:bg-slate-100 hover:text-slate-900 transition-all text-lg"
        >
          이전으로
        </Button>
        <Button
          onClick={() => onConfirm(editableOutline)}
          disabled={isGenerating || editableOutline.outline.length === 0}
          className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-indigo-300 transition-all text-xl font-black"
        >
          {isGenerating ? (
            <><Loader2 className="w-6 h-6 animate-spin mr-3" /> 승인된 목차로 전체 슬라이드 디자인 중...</>
          ) : (
            <><Check className="w-6 h-6 mr-3" /> 이 목차로 슬라이드 본문 생성하기</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
