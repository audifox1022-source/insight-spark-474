import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Loader2, Trash2, Wand2, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription: string;
  photographer: string;
  photographerUrl: string;
}

interface SlideImageEditorProps {
  imageUrl?: string;
  slideTitle: string;
  slideContent: string[];
  slideType: string;
  onChange: (imageUrl: string | undefined) => void;
}

export function SlideImageEditor({ imageUrl, slideTitle, slideContent, slideType, onChange }: SlideImageEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // Unsplash search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const generateImage = async (prompt?: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: {
          mode: 'generate_image',
          slideTitle,
          slideContent,
          slideType,
          customPrompt: prompt || undefined,
        },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error('이미지 URL을 받지 못했습니다.');
      onChange(data.imageUrl);
      toast.success('이미지가 생성되었습니다!');
      setShowPromptInput(false);
      setCustomPrompt('');
    } catch (err: any) {
      toast.error(err?.message || '이미지 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const searchImages = async (page = 1) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { mode: 'search_images', query: searchQuery, page, perPage: 12 },
      });
      if (error) throw error;
      setSearchResults(data.images || []);
      setTotalPages(data.totalPages || 0);
      setSearchPage(page);
    } catch (err: any) {
      toast.error(err?.message || '이미지 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectUnsplashImage = (img: UnsplashImage) => {
    onChange(img.url);
    toast.success(`${img.photographer}님의 이미지가 적용되었습니다.`);
    setShowSearch(false);
    setSearchResults([]);
  };

  const removeImage = () => {
    onChange(undefined);
    toast.success('이미지가 제거되었습니다.');
  };

  return (
    <div>
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
        🖼️ 슬라이드 이미지
      </span>

      {imageUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border shadow-card group">
            <img src={imageUrl} alt="슬라이드 이미지" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button size="sm" variant="secondary" onClick={() => generateImage()} disabled={isGenerating} className="gap-1">
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                재생성
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowSearch(true); setSearchQuery(slideTitle); }} className="gap-1">
                <Search className="w-3.5 h-3.5" /> 검색
              </Button>
              <Button size="sm" variant="destructive" onClick={removeImage} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </Button>
            </div>
          </div>

          {/* 커스텀 프롬프트 */}
          <div className="flex gap-2">
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="원하는 이미지를 설명하세요..."
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && customPrompt && generateImage(customPrompt)}
            />
            <Button size="sm" onClick={() => generateImage(customPrompt)} disabled={isGenerating || !customPrompt} className="gap-1 flex-shrink-0">
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateImage()} disabled={isGenerating} className="flex-1 gap-2 py-6">
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 이미지 생성 중...</>
              ) : (
                <><ImagePlus className="w-4 h-4" /> AI 이미지 자동 생성</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowSearch(true); setSearchQuery(slideTitle); }}
              className="flex-1 gap-2 py-6"
            >
              <Search className="w-4 h-4" /> Unsplash 검색
            </Button>
          </div>

          {!showPromptInput ? (
            <button onClick={() => setShowPromptInput(true)} className="text-xs text-muted-foreground hover:text-accent transition-colors">
              ✏️ 직접 설명을 입력하여 이미지 생성하기
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="원하는 이미지를 설명하세요..."
                className="text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && customPrompt && generateImage(customPrompt)}
              />
              <Button size="sm" onClick={() => generateImage(customPrompt)} disabled={isGenerating || !customPrompt} className="gap-1 flex-shrink-0">
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Unsplash 검색 패널 ── */}
      {showSearch && (
        <div className="mt-4 border border-border rounded-xl bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Unsplash 이미지 검색
            </span>
            <button onClick={() => { setShowSearch(false); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="예: business, technology, nature..."
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && searchImages(1)}
              autoFocus
            />
            <Button size="sm" onClick={() => searchImages(1)} disabled={isSearching || !searchQuery.trim()} className="gap-1 flex-shrink-0">
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <ScrollArea className="max-h-[320px]">
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => selectUnsplashImage(img)}
                    className="relative group rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/30 transition-all aspect-video"
                  >
                    <img src={img.thumbUrl} alt={img.altDescription} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[9px] truncate w-full">
                        📷 {img.photographer}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => searchImages(searchPage - 1)}
                    disabled={searchPage <= 1 || isSearching}
                  >
                    ← 이전
                  </Button>
                  <span className="text-xs text-muted-foreground">{searchPage} / {totalPages}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => searchImages(searchPage + 1)}
                    disabled={searchPage >= totalPages || isSearching}
                  >
                    다음 →
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}

          {searchResults.length === 0 && !isSearching && searchQuery && (
            <p className="text-xs text-muted-foreground text-center py-4">
              검색어를 입력하고 검색 버튼을 누르세요
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
          </p>
        </div>
      )}
    </div>
  );
}
