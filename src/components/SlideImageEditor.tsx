import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Loader2, Trash2, Wand2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { aiService } from '@/lib/ai-service';

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
  slideContent: string;
  slideType: string;
  onChange: (imageUrl: string | undefined) => void;
}

// ⚠️ [보안 경고]: 추후 이 로직은 반드시 Vercel 백엔드 함수(api/search.js)로 옮기셔야 합니다!
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

async function searchUnsplashImages(query: string, page: number, perPage = 12) {
  if (!UNSPLASH_ACCESS_KEY) throw new Error('Unsplash API 키가 설정되지 않았습니다.');
  
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  
  if (!res.ok) throw new Error('Unsplash 검색에 실패했습니다.');
  
  const data = await res.json();
  const images: UnsplashImage[] = (data.results || []).map((img: any) => ({
    id: img.id,
    url: img.urls.regular,
    thumbUrl: img.urls.thumb,
    altDescription: img.alt_description || query,
    photographer: img.user.name,
    photographerUrl: img.user.links.html,
  }));
  
  return { images, totalPages: data.total_pages ?? 0 };
}

export function SlideImageEditor({
  imageUrl,
  slideTitle,
  slideContent,
  onChange,
}: SlideImageEditorProps) {
  const [isGenerating, setIsGenerating]       = useState(false);
  const [customPrompt, setCustomPrompt]       = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  const [isImgLoading, setIsImgLoading] = useState(false);
  const [imgError, setImgError]         = useState(false);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showSearch, setShowSearch]       = useState(false);
  const [searchPage, setSearchPage]       = useState(1);
  const [totalPages, setTotalPages]       = useState(0);
  
  // ✅ 추가: 스크롤 영역을 제어하기 위한 Ref
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const generateImage = async (prompt?: string) => {
    setIsGenerating(true);
    setImgError(false);
    toast.loading('AI 이미지 생성 중... (최대 30초)', { id: 'img-gen' });
    
    try {
      const title   = prompt ? `${slideTitle} ${prompt}` : slideTitle;
      const content = prompt || slideContent;
      const url = await aiService.generateImage(title, content);
      
      onChange(url);
      setImgError(false);
      toast.success('이미지가 생성되었습니다!', { id: 'img-gen' });
      setShowPromptInput(false);
      setCustomPrompt('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '이미지 생성에 실패했습니다.';
      toast.error(errorMsg, { id: 'img-gen' });
      setImgError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const searchImages = async (page = 1) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
      const result = await searchUnsplashImages(searchQuery, page);
      setSearchResults(result.images);
      setTotalPages(result.totalPages);
      setSearchPage(page);
      
      // ✅ 추가: 새 페이지 로드 시 맨 위로 스크롤
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unsplash 검색 실패';
      toast.error(errorMsg);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUnsplashImage = (img: UnsplashImage) => {
    onChange(img.url);
    setImgError(false);
    toast.success(`${img.photographer}님의 사진이 적용되었습니다.`);
    setShowSearch(false);
    setSearchResults([]);
  };

  const removeImage = () => {
    onChange(undefined);
    setImgError(false);
    toast.success('이미지가 제거되었습니다.');
  };

  return (
    <div>
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
        슬라이드 이미지
      </span>

      {/* ── 이미지가 있는 경우 ── */}
      {imageUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border shadow-card group min-h-[12rem] bg-muted/20">

            {isImgLoading && (
              <div className="absolute inset-0 z-10 w-full h-full bg-muted animate-pulse flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {imgError ? (
              <div className="w-full h-48 bg-muted/50 rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <span className="text-3xl">🖼️</span>
                <p className="text-xs font-medium">이미지를 불러올 수 없습니다</p>
                <Button size="sm" variant="outline" onClick={() => generateImage()} disabled={isGenerating} className="text-xs h-7 gap-1">
                  <Wand2 className="w-3 h-3" /> 다시 생성
                </Button>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={slideTitle || '슬라이드 배경 이미지'}
                className={`w-full h-48 object-cover transition-opacity duration-300 ${isImgLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoadStart={() => { setIsImgLoading(true); setImgError(false); }}
                onLoad={() => setIsImgLoading(false)}
                onError={() => { setIsImgLoading(false); setImgError(true); }}
              />
            )}

            {!imgError && !isImgLoading && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-20">
                <Button size="sm" variant="secondary" onClick={() => generateImage()} disabled={isGenerating} className="gap-1">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  재생성
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setShowSearch(true); setSearchQuery(slideTitle); }} className="gap-1">
                  <Search className="w-3.5 h-3.5" /> 검색
                </Button>
                <Button size="sm" variant="destructive" onClick={removeImage} className="gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {showPromptInput && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="이미지 설명을 입력하세요..."
                className="text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPrompt) generateImage(customPrompt);
                }}
              />
              <Button size="sm" onClick={() => generateImage(customPrompt)} disabled={isGenerating || !customPrompt} className="gap-1 flex-shrink-0">
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ── 이미지가 없는 경우 ── */
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateImage()} disabled={isGenerating} className="flex-1 gap-2 py-6">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              AI 생성
            </Button>
            <Button variant="outline" onClick={() => { setShowSearch(true); setSearchQuery(slideTitle); }} className="flex-1 gap-2 py-6">
              <Search className="w-4 h-4" /> 검색
            </Button>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20 text-sm text-muted-foreground animate-in fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-accent flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">이미지 생성 중...</p>
                <p className="text-xs">AI가 슬라이드에 맞는 이미지를 만들고 있어요 (최대 30초)</p>
              </div>
            </div>
          )}

          {!showPromptInput ? (
            <button onClick={() => setShowPromptInput(true)} className="text-xs text-muted-foreground hover:text-accent transition-colors">
              + 직접 설명 입력하기
            </button>
          ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 파란 하늘 아래 도시 전경..."
                className="text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPrompt) generateImage(customPrompt);
                }}
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
        <div className="mt-4 border border-border rounded-xl bg-card p-4 space-y-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Unsplash 검색
            </span>
            <button onClick={() => { setShowSearch(false); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="비즈니스, 기술, 자연..."
              className="text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') searchImages(1); }}
              autoFocus
            />
            <Button size="sm" onClick={() => searchImages(1)} disabled={isSearching || !searchQuery.trim()} className="gap-1 flex-shrink-0">
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <ScrollArea className="max-h-[320px]" ref={scrollAreaRef}>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {searchResults.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => selectUnsplashImage(img)}
                    className="relative group rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/30 transition-all aspect-video"
                  >
                    <img src={img.thumbUrl} alt={img.altDescription} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[9px] truncate w-full text-left">
                        {img.photographer}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-border mt-2">
                  <Button size="sm" variant="ghost" onClick={() => searchImages(searchPage - 1)} disabled={searchPage <= 1 || isSearching}>
                    이전
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {searchPage} / {totalPages}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => searchImages(searchPage + 1)} disabled={searchPage >= totalPages || isSearching}>
                    다음
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}

          {searchResults.length === 0 && !isSearching && searchQuery && (
            <p className="text-xs text-muted-foreground text-center py-8">
              검색 결과가 없습니다.
            </p>
          )}

          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Unsplash</a>
          </p>
        </div>
      )}
    </div>
  );
}
