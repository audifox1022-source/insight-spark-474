// ============================================================
// SlideImageEditor.tsx — 배경/이미지 설정 4탭 UI (전면 개편)
// 탭1: 색상/그라디언트 | 탭2: AI 이미지 | 탭3: 프리셋 | 탭4: Unsplash
// ============================================================
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Search, X, ImageIcon, Palette, Grid3X3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// ──────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────
interface UnsplashImage {
  id: string; url: string; thumbUrl: string;
  altDescription: string; photographer: string; photographerUrl: string;
}
interface SlideImageEditorProps {
  imageUrl?: string;
  bgGradient?: string;
  slideTitle: string;
  slideContent: string;
  slideType: string;
  onChange: (imageUrl: string | undefined) => void;
  onGradientChange?: (gradient: string | undefined) => void;
}
type TabType = 'color' | 'ai' | 'preset' | 'search';

// ──────────────────────────────────────────────────────────
// 추천 색상 조합 (신뢰 비즈니스 + 다양한 무드)
// ──────────────────────────────────────────────────────────
const COLOR_PALETTES = [
  { id: 'teal', label: '신뢰 틸', gradient: 'linear-gradient(135deg, #0D5C63 0%, #2EC4B6 100%)' },
  { id: 'navy', label: '딥 네이비', gradient: 'linear-gradient(135deg, #1B2A4A 0%, #2563EB 100%)' },
  { id: 'slate', label: '슬레이트', gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)' },
  { id: 'emerald', label: '에메랄드', gradient: 'linear-gradient(135deg, #064E3B 0%, #34D399 100%)' },
  { id: 'purple', label: '바이올렛', gradient: 'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)' },
  { id: 'rose', label: '로즈', gradient: 'linear-gradient(135deg, #9F1239 0%, #F43F5E 100%)' },
  { id: 'amber', label: '앰버', gradient: 'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)' },
  { id: 'ocean', label: '오션블루', gradient: 'linear-gradient(135deg, #0C4A6E 0%, #38BDF8 100%)' },
  { id: 'forest', label: '포레스트', gradient: 'linear-gradient(135deg, #14532D 0%, #4ADE80 100%)' },
  { id: 'sunset', label: '선셋', gradient: 'linear-gradient(135deg, #7C2D12 0%, #F97316 0%, #FBBF24 100%)' },
  { id: 'midnight', label: '미드나잇', gradient: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)' },
  { id: 'pearl', label: '펄 화이트', gradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' },
];

// ──────────────────────────────────────────────────────────
// 프리셋 배경 이미지 팔레트 (Unsplash 큐레이션, 무료 사용)
// ──────────────────────────────────────────────────────────
const PRESET_IMAGES = {
  비즈니스: [
    { id: 'b1', thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&h=720&fit=crop', label: '오피스 공간' },
    { id: 'b2', thumb: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1280&h=720&fit=crop', label: '미팅룸' },
    { id: 'b3', thumb: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1280&h=720&fit=crop', label: '팀워크' },
    { id: 'b4', thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1280&h=720&fit=crop', label: '전문가' },
    { id: 'b5', thumb: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1280&h=720&fit=crop', label: '전략 기획' },
    { id: 'b6', thumb: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=1280&h=720&fit=crop', label: '데이터 분석' },
  ],
  기술: [
    { id: 't1', thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&h=720&fit=crop', label: '회로기판' },
    { id: 't2', thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&h=720&fit=crop', label: '테크 배경' },
    { id: 't3', thumb: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1280&h=720&fit=crop', label: 'AI & 로봇' },
    { id: 't4', thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&h=720&fit=crop', label: '디지털 지구' },
    { id: 't5', thumb: 'https://images.unsplash.com/photo-1563986768711-b3bde3dc821e?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1563986768711-b3bde3dc821e?w=1280&h=720&fit=crop', label: '코딩' },
    { id: 't6', thumb: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1280&h=720&fit=crop', label: '서버' },
  ],
  자연: [
    { id: 'n1', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', label: '산' },
    { id: 'n2', thumb: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1280&h=720&fit=crop', label: '바다' },
    { id: 'n3', thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&h=720&fit=crop', label: '숲' },
    { id: 'n4', thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1280&h=720&fit=crop', label: '풍경' },
    { id: 'n5', thumb: 'https://images.unsplash.com/photo-1490750967868-88df5691cc7f?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1490750967868-88df5691cc7f?w=1280&h=720&fit=crop', label: '꽃' },
    { id: 'n6', thumb: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1280&h=720&fit=crop', label: '하늘' },
  ],
  심플: [
    { id: 's1', thumb: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=1280&h=720&fit=crop', label: '파스텔 블러' },
    { id: 's2', thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&h=720&fit=crop', label: '추상 물결' },
    { id: 's3', thumb: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=1280&h=720&fit=crop', label: '밝은 패턴' },
    { id: 's4', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280&h=720&fit=crop', label: '기하학' },
    { id: 's5', thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1280&h=720&fit=crop', label: '미니멀' },
    { id: 's6', thumb: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=225&fit=crop', full: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1280&h=720&fit=crop', label: '그라데이션' },
  ],
};

// ──────────────────────────────────────────────────────────
// Unsplash 검색 유틸리티
// ──────────────────────────────────────────────────────────
const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

async function searchUnsplash(query: string, page: number) {
  if (!UNSPLASH_KEY) throw new Error('Unsplash API 키가 없습니다. .env에 VITE_UNSPLASH_ACCESS_KEY를 추가하세요.');
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=12&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
  );
  if (!res.ok) throw new Error('Unsplash 검색 실패');
  const data = await res.json();
  return {
    images: (data.results || []).map((img: any) => ({
      id: img.id, url: img.urls.regular, thumbUrl: img.urls.thumb,
      altDescription: img.alt_description || query,
      photographer: img.user.name, photographerUrl: img.user.links.html,
    })) as UnsplashImage[],
    totalPages: data.total_pages ?? 0,
  };
}

// ──────────────────────────────────────────────────────────
// AI 이미지 생성 (Pollinations.ai 직접 호출 — 로컬도 작동)
// ──────────────────────────────────────────────────────────
function buildPollinationsUrl(title: string, content: string, seed?: number) {
  const snippet = (content || '').slice(0, 80).trim();
  const topic = [title, snippet].filter(Boolean).join(', ');
  // 심플한 영문 프롬프트 — 특수문자 최소화로 파싱 오류 방지
  const prompt = `professional business presentation slide background, ${topic}, minimal clean design, blue teal gradient, 4K, no text, no letters, no watermark`;
  const s = seed ?? Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&seed=${s}`;
}

// ──────────────────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────────────────
export function SlideImageEditor({
  imageUrl, bgGradient, slideTitle, slideContent, onChange, onGradientChange,
}: SlideImageEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('color');
  const [selectedPaletteCategory, setSelectedPaletteCategory] = useState<keyof typeof PRESET_IMAGES>('비즈니스');

  // AI 탭 상태
  const [aiImageUrl, setAiImageUrl] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSeed, setAiSeed] = useState<number>(Math.floor(Math.random() * 999999));
  const [customPromptMode, setCustomPromptMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiImgError, setAiImgError] = useState(false);

  // Unsplash 탭 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // ── AI 이미지 생성
  const generateAiImage = (newSeed?: number) => {
    const seed = newSeed ?? Math.floor(Math.random() * 999999);
    setAiSeed(seed);
    setAiImgError(false);
    setIsAiLoading(true);

    const title = customPromptMode && customPrompt.trim() ? customPrompt : slideTitle;
    const content = customPromptMode ? '' : slideContent;
    const url = buildPollinationsUrl(title, content, seed);
    setAiImageUrl(url);
  };

  const applyAiImage = () => {
    if (!aiImageUrl) { generateAiImage(); return; }
    if (onGradientChange) onGradientChange(undefined);
    onChange(aiImageUrl);
    toast.success('AI 이미지가 적용되었습니다!');
  };

  // ── 그라디언트 적용
  const applyGradient = (gradient: string) => {
    onChange(undefined);
    if (onGradientChange) onGradientChange(gradient);
    toast.success('색상이 적용되었습니다!');
  };

  // ── 프리셋 이미지 적용
  const applyPreset = (fullUrl: string, label: string) => {
    if (onGradientChange) onGradientChange(undefined);
    onChange(fullUrl);
    toast.success(`'${label}' 배경이 적용되었습니다!`);
  };

  // ── 배경 제거
  const removeBg = () => {
    onChange(undefined);
    if (onGradientChange) onGradientChange(undefined);
    toast.success('배경이 제거되었습니다.');
  };

  // ── Unsplash 검색
  const doSearch = async (page = 1) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchUnsplash(searchQuery, page);
      setSearchResults(result.images);
      setTotalPages(result.totalPages);
      setSearchPage(page);
    } catch (e: any) {
      toast.error(e.message || 'Unsplash 검색 실패');
    } finally {
      setIsSearching(false);
    }
  };

  const tabs: { key: TabType; icon: React.ReactNode; label: string }[] = [
    { key: 'color', icon: <Palette className="w-3.5 h-3.5" />, label: '색상' },
    { key: 'ai', icon: <Wand2 className="w-3.5 h-3.5" />, label: 'AI' },
    { key: 'preset', icon: <Grid3X3 className="w-3.5 h-3.5" />, label: '프리셋' },
    { key: 'search', icon: <Search className="w-3.5 h-3.5" />, label: '검색' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">슬라이드 배경</span>
        {(imageUrl || bgGradient) && (
          <button onClick={removeBg} className="text-[10px] text-destructive hover:opacity-70 flex items-center gap-0.5 transition-opacity">
            <X className="w-3 h-3" /> 제거
          </button>
        )}
      </div>

      {/* 현재 배경 미리보기 */}
      {(imageUrl || bgGradient) && (
        <div
          className="w-full h-16 rounded-xl border border-border overflow-hidden flex items-center justify-center"
          style={{ background: bgGradient || undefined }}
        >
          {imageUrl && <img src={imageUrl} alt="현재 배경" className="w-full h-full object-cover" />}
          {bgGradient && !imageUrl && (
            <span className="text-[10px] font-semibold text-white/80 drop-shadow">현재 색상</span>
          )}
        </div>
      )}

      {/* 탭 헤더 */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={[
              'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all',
              activeTab === t.key
                ? 'bg-background shadow-sm text-primary border border-border/50'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── 탭 1: 색상/그라디언트 */}
      {activeTab === 'color' && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-medium">추천 색상 조합을 클릭해 바로 적용해 보세요</p>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => applyGradient(p.gradient)}
                className={[
                  'relative h-14 rounded-xl border-2 overflow-hidden transition-all hover:scale-105 hover:shadow-md',
                  bgGradient === p.gradient ? 'border-primary ring-2 ring-primary/30' : 'border-border/40 hover:border-primary/50',
                ].join(' ')}
                title={p.label}
                style={{ background: p.gradient }}
              >
                <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white drop-shadow-md">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 탭 2: AI 이미지 생성 */}
      {activeTab === 'ai' && (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground font-medium">슬라이드 내용 기반으로 AI가 배경 이미지를 생성합니다</p>

          {/* 커스텀 프롬프트 토글 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomPromptMode(!customPromptMode)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all ${customPromptMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
            >
              {customPromptMode ? '✓ 직접 입력 중' : '직접 입력'}
            </button>
          </div>

          {customPromptMode && (
            <Input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="예: 파란 도시 야경, 미래적인 기술..."
              className="text-xs h-8"
              onKeyDown={e => { if (e.key === 'Enter') generateAiImage(); }}
            />
          )}

          {/* AI 이미지 미리보기 */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
            {!aiImageUrl && !isAiLoading && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-30" />
                <span className="text-[10px]">생성 버튼을 눌러 이미지를 만들어보세요</span>
              </div>
            )}
            {isAiLoading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[10px] text-muted-foreground">AI 이미지 생성 중... (최대 20초)</span>
              </div>
            )}
            {aiImageUrl && !aiImgError && (
              <img
                src={aiImageUrl}
                alt="AI 생성 이미지"
                className="w-full h-full object-cover"
                onLoad={() => setIsAiLoading(false)}
                onError={() => { setIsAiLoading(false); setAiImgError(true); }}
              />
            )}
            {aiImgError && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <span className="text-xl">⚠️</span>
                <span className="text-[10px]">이미지 로드 실패. 다시 시도해 주세요</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateAiImage()}
              disabled={isAiLoading}
              className="flex-1 gap-1.5 text-xs"
            >
              {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {aiImageUrl ? '재생성' : 'AI 생성'}
            </Button>
            {aiImageUrl && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => generateAiImage()}
                  disabled={isAiLoading}
                  title="다른 버전 생성"
                  className="px-2.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={applyAiImage}
                  disabled={isAiLoading}
                  className="flex-1 gap-1.5 text-xs"
                >
                  적용
                </Button>
              </>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground text-center">Powered by Pollinations AI · 무료 서비스로 속도가 느릴 수 있어요</p>
        </div>
      )}

      {/* ── 탭 3: 프리셋 팔레트 */}
      {activeTab === 'preset' && (
        <div className="space-y-2">
          {/* 카테고리 탭 */}
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(PRESET_IMAGES) as (keyof typeof PRESET_IMAGES)[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedPaletteCategory(cat)}
                className={[
                  'px-3 py-1 text-[10px] font-bold rounded-full border transition-all',
                  selectedPaletteCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 이미지 그리드 */}
          <div className="grid grid-cols-2 gap-2">
            {PRESET_IMAGES[selectedPaletteCategory].map(img => (
              <button
                key={img.id}
                onClick={() => applyPreset(img.full, img.label)}
                className={[
                  'relative group aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] hover:shadow-md',
                  imageUrl === img.full ? 'border-primary ring-2 ring-primary/30' : 'border-border/40 hover:border-primary/50',
                ].join(' ')}
              >
                <img src={img.thumb} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-[9px] font-semibold">{img.label}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground text-center">Photos by Unsplash</p>
        </div>
      )}

      {/* ── 탭 4: Unsplash 검색 */}
      {activeTab === 'search' && (
        <div className="space-y-3">
          {!UNSPLASH_KEY && (
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-[10px] text-warning font-medium">
              ⚠️ Unsplash API 키가 없습니다. .env에 VITE_UNSPLASH_ACCESS_KEY를 추가해야 검색이 됩니다.
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="비즈니스, 기술, 자연..."
              className="text-xs h-8"
              onKeyDown={e => { if (e.key === 'Enter') doSearch(1); }}
            />
            <Button size="sm" onClick={() => doSearch(1)} disabled={isSearching || !searchQuery.trim()} className="px-3">
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="grid grid-cols-3 gap-2 pb-2">
                {searchResults.map(img => (
                  <button
                    key={img.id}
                    onClick={() => { onChange(img.url); if (onGradientChange) onGradientChange(undefined); toast.success(`${img.photographer}님의 사진 적용`); }}
                    className="relative group aspect-video rounded-lg overflow-hidden border border-border hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
                  >
                    <img src={img.thumbUrl} alt={img.altDescription} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-1 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[8px] truncate w-full">{img.photographer}</span>
                    </div>
                  </button>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="ghost" onClick={() => doSearch(searchPage - 1)} disabled={searchPage <= 1 || isSearching} className="text-xs h-7 px-2">이전</Button>
                  <span className="text-xs text-muted-foreground">{searchPage} / {totalPages}</span>
                  <Button size="sm" variant="ghost" onClick={() => doSearch(searchPage + 1)} disabled={searchPage >= totalPages || isSearching} className="text-xs h-7 px-2">다음</Button>
                </div>
              )}
            </ScrollArea>
          )}
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <p className="text-[10px] text-muted-foreground text-center py-6">결과가 없습니다.</p>
          )}
          <p className="text-[9px] text-muted-foreground text-center">Photos by Unsplash</p>
        </div>
      )}
    </div>
  );
}
