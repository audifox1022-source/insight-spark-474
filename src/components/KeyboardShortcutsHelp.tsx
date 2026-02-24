import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { category: '슬라이드 이동', items: [
    { keys: ['←', '↑'], desc: '이전 슬라이드' },
    { keys: ['→', '↓'], desc: '다음 슬라이드' },
  ]},
  { category: '슬라이드 편집', items: [
    { keys: ['Ctrl', 'D'], desc: '현재 슬라이드 복제' },
    { keys: ['N'], desc: '새 슬라이드 추가' },
    { keys: ['Delete'], desc: '현재 슬라이드 삭제' },
  ]},
  { category: '앱 기능', items: [
    { keys: ['Ctrl', 'S'], desc: '발표자료 저장' },
    { keys: ['Ctrl', 'Enter'], desc: '발표 모드 시작' },
    { keys: ['F5'], desc: '발표 모드 시작' },
    { keys: ['?'], desc: '단축키 도움말' },
  ]},
];

function KeyBadge({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md bg-muted border border-border text-xs font-mono font-semibold text-foreground shadow-sm">
      {k}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent" />
            키보드 단축키
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {group.category}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.desc} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm text-foreground">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                          <KeyBadge k={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pb-1">
          텍스트 입력 중에는 방향키/Delete 단축키가 비활성화됩니다
        </p>
      </DialogContent>
    </Dialog>
  );
}
