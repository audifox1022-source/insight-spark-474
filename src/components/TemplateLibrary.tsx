import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TEMPLATE_LIBRARY, 
  TEMPLATE_CATEGORIES, 
  getTemplatesByCategory, 
  searchTemplates,
  type TemplatePreset 
} from '@/lib/template-library';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplatePreset) => void;
  selectedId?: string;
}

export function TemplateLibrary({ isOpen, onClose, onSelect, selectedId }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTemplates(searchQuery);
    }
    if (activeCategory) {
      return getTemplatesByCategory(activeCategory);
    }
    return TEMPLATE_LIBRARY;
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-4xl bg-card border border-border shadow-2xl rounded-[40px] overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">템플릿 라이브러리</h2>
              <p className="text-sm text-muted-foreground mt-1">목적에 맞는 템플릿을 선택하세요</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 검색 및 카테고리 */}
          <div className="p-6 border-b border-border space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="키워드로 검색 (예: 보고서, 제안서, 연구...)"
                className="pl-10 h-12 rounded-2xl"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  !activeCategory 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                전체 ({TEMPLATE_LIBRARY.length})
              </button>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeCategory === cat.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 템플릿 목록 */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedId === template.id}
                    onSelect={() => onSelect(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TemplateCard({ template, isSelected, onSelect }: { 
  template: TemplatePreset; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={`relative rounded-2xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary bg-primary/5 shadow-lg' 
          : 'border-border hover:border-primary/40 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      {/* 그라디언트 헤더 */}
      <div className={`h-20 bg-gradient-to-br ${template.gradient} rounded-t-2xl flex items-center justify-center relative`}>
        <span className="text-4xl">{template.icon}</span>
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-sm">{template.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
        </div>

        {/* 태그 */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        {/* 설정 미리보기 */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{template.settings.slideCount}장</span>
          <span>·</span>
          <span>{template.settings.difficulty === 'executive' ? '임원용' : 
                 template.settings.difficulty === 'hard' ? '전문가' : 
                 template.settings.difficulty === 'medium' ? '표준' : '초급'}</span>
        </div>

        {/* 슬라이드 구조 펼치기 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
        >
          {expanded ? '접기' : '슬라이드 구조 보기'}
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-border space-y-1">
                {template.slideStructure.map((slide, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px] font-bold">{i + 1}</span>
                    {slide}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
