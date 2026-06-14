import { motion } from 'framer-motion';
import { Sparkles, Globe, Headphones, FileDigit, FolderOpen, Moon, Sun } from 'lucide-react';

type AppMode = 'presentation' | 'designer' | 'translator' | 'audiolab' | 'pdfeditor';

interface MobileNavProps {
  activeApp: AppMode;
  onAppChange: (mode: AppMode) => void;
  onHistoryOpen: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const NAV_ITEMS: { mode: AppMode; label: string; icon: typeof Sparkles }[] = [
  { mode: 'presentation', label: '발표자료', icon: Sparkles },
  { mode: 'translator', label: 'AI 번역', icon: Globe },
  { mode: 'audiolab', label: 'Audio', icon: Headphones },
  { mode: 'pdfeditor', label: 'PDF', icon: FileDigit },
];

export const MobileNav = ({ activeApp, onAppChange, onHistoryOpen, isDark, onToggleTheme }: MobileNavProps) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ mode, label, icon: Icon }) => {
          const isActive = activeApp === mode;
          return (
            <button
              key={mode}
              onClick={() => onAppChange(mode)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </div>
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </button>
          );
        })}
        
        <div className="w-px h-8 bg-border/60" />
        
        <button
          onClick={onHistoryOpen}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          aria-label="저장 목록"
        >
          <FolderOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none">저장</span>
        </button>
        
        <button
          onClick={onToggleTheme}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
          <span className="text-[10px] font-bold leading-none">테마</span>
        </button>
      </div>
    </nav>
  );
};
