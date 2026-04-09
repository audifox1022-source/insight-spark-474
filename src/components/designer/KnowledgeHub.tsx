// ============================================================
// src/components/designer/KnowledgeHub.tsx
// [LLM WIKI] Persistent Knowledge Base & Hot Cache UI
// Karpathy's LLM Wiki pattern implementation for Insight Spark
// ============================================================
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Brain, Zap, Search, Filter, 
  FileDown, RefreshCw, Trash2, ChevronRight,
  Clock, Tag, Library, Info, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideStore } from '@/store/useSlideStore';
import { knowledgeStore, WikiNote } from '@/services/ai/knowledgeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface KnowledgeHubProps {
  onClose?: () => void;
}

export const KnowledgeHub: React.FC<KnowledgeHubProps> = () => {
  const { hotContext, wikiNotes, setWikiNotes } = useSlideStore();
  const [activeTab, setActiveTab] = useState<'wiki' | 'cache'>('wiki');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<WikiNote | null>(null);

  useEffect(() => {
    // 저장소에서 지식 로드
    setWikiNotes(knowledgeStore.getAllNotes());
  }, []);

  const filteredNotes = wikiNotes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportWiki = () => {
    const notes = knowledgeStore.getAllNotes();
    if (notes.length === 0) {
      toast.error("저장된 지식이 없습니다.");
      return;
    }

    const mdContent = notes.map(n => 
      `# ${n.title}\n\nCategory: ${n.category}\nTags: ${n.tags.join(', ')}\nLast Modified: ${new Date(n.lastModified).toLocaleString()}\n\n---\n\n${n.content}`
    ).join('\n\n\n');

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Insight_Spark_Wiki_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    toast.success("위키 데이터를 Markdown 파일로 추출했습니다.");
  };

  const handleClearWiki = () => {
    if (window.confirm("모든 지식 베이스를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      knowledgeStore.clearAllKnowledge();
      setWikiNotes([]);
      toast.success("지식 베이스가 초기화되었습니다.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
            <Library className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">지능형 전략 지식 허브</h2>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" /> LLM Wiki & Compounding Knowledge
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportWiki} className="rounded-xl font-bold gap-2 h-10 border-indigo-500/20 hover:bg-indigo-500/5">
            <FileDown className="w-4 h-4 text-indigo-500" /> Obsidian 스타일 추출
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClearWiki} className="rounded-xl h-10 w-10 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 border-r border-border bg-muted/20 p-6 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('wiki')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'wiki' ? 'bg-white shadow-md text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
          >
            <BookOpen className="w-4 h-4" /> 지식 위키 ({wikiNotes.length})
          </button>
          <button 
            onClick={() => setActiveTab('cache')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'cache' ? 'bg-white shadow-md text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
          >
            <Brain className="w-4 h-4" /> 핫 캐시 (작업기억)
          </button>
          
          <div className="mt-auto p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">LLM Wiki Pattern</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              모든 작업과 소스가 위키로 축적되어 AI의 장기 기억이 됩니다. 정보가 쌓일수록 더 깊이 있는 전략 생성이 가능해집니다.
            </p>
          </div>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'wiki' ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Note List */}
              <div className="w-96 border-r border-border flex flex-col overflow-hidden bg-card/30">
                <div className="p-6">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      placeholder="지식 검색..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl pl-11 pr-4 h-11 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-2 custom-scrollbar">
                  {filteredNotes.map(note => (
                    <button 
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedNote?.id === note.id ? 'bg-white border-primary shadow-lg ring-4 ring-primary/5' : 'bg-white/50 border-transparent hover:bg-white hover:border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest">{note.category}</span>
                        <Clock className="w-3 h-3 text-slate-300" />
                      </div>
                      <h4 className="text-sm font-black text-foreground mb-1 line-clamp-1">{note.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{note.content}</p>
                    </button>
                  ))}
                  {filteredNotes.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                      <Library className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-sm font-bold italic">저장된 지식이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Note Detail View */}
              <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto p-12 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {selectedNote ? (
                    <motion.div 
                      key={selectedNote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="max-w-3xl mx-auto space-y-10"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {selectedNote.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5" /> {tag}
                            </span>
                          ))}
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground">{selectedNote.title}</h1>
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Last Synced: {new Date(selectedNote.lastModified).toLocaleString()}
                        </div>
                      </div>

                      <div className="w-full h-px bg-border/60" />

                      <div className="prose prose-slate max-w-none text-slate-600 dark:text-slate-300 leading-loose whitespace-pre-wrap font-medium">
                        {selectedNote.content}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                       <BookOpen className="w-16 h-16" />
                       <div className="space-y-1">
                          <p className="text-xl font-black">노트를 선택하세요</p>
                          <p className="text-sm font-medium italic italic">좌측 목록에서 열어볼 위키 지식을 선택해 주세요.</p>
                       </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 p-12 overflow-y-auto custom-scrollbar">
               <div className="max-w-4xl mx-auto space-y-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-amber-500/10 flex items-center justify-center">
                      <Brain className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-foreground tracking-tight">핫 캐시 (Hot Cache)</h2>
                      <p className="text-sm text-muted-foreground font-medium">최근 세션의 주요 작업 맥락과 AI가 기억하고 있는 선호도 요약입니다.</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950 border border-border shadow-2xl rounded-[32px] overflow-hidden p-10 relative group">
                    <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="w-10 h-10 text-amber-500" />
                    </div>
                    {hotContext ? (
                      <div className="prose prose-amber max-w-none text-slate-700 dark:text-slate-200 leading-loose whitespace-pre-wrap font-bold text-lg italic">
                        "{hotContext}"
                      </div>
                    ) : (
                      <div className="py-20 text-center opacity-30 space-y-4">
                        <Zap className="w-12 h-12 mx-auto" />
                        <p className="text-lg font-black italic">아직 기록된 세션 컨텍스트가 없습니다.</p>
                        <p className="text-sm font-medium">AI와 대화를 시작하거나 발표자료를 생성하면 자동으로 기억이 형성됩니다.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                       <h4 className="font-black text-indigo-500 flex items-center gap-2 italic uppercase tracking-widest text-xs">
                         <Search className="w-4 h-4" /> Persistent Memory
                       </h4>
                       <p className="text-xs text-slate-500 leading-relaxed font-medium">
                         핫 캐시는 모든 AI API 호출 시 시스템 프롬프트에 자동으로 주입됩니다. AI에게 별도의 요약을 해주지 않아도 여러분의 스타일과 최근 작업을 이해하고 있습니다.
                       </p>
                    </div>
                    <div className="p-8 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                       <h4 className="font-black text-emerald-500 flex items-center gap-2 italic uppercase tracking-widest text-xs">
                         <RefreshCw className="w-4 h-4" /> Auto Updating
                       </h4>
                       <p className="text-xs text-slate-500 leading-relaxed font-medium">
                         이 작업기억은 행동이 끝날 때마다 '배경 요약 에이전트'가 자동으로 갱신합니다. 사용자가 수동으로 관리할 필요가 전혀 없습니다.
                       </p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
