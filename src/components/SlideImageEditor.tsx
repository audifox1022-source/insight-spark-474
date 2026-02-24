import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Loader2, Trash2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            <img
              src={imageUrl}
              alt="슬라이드 이미지"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => generateImage()}
                disabled={isGenerating}
                className="gap-1"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                재생성
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={removeImage}
                className="gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
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
            <Button
              size="sm"
              onClick={() => generateImage(customPrompt)}
              disabled={isGenerating || !customPrompt}
              className="gap-1 flex-shrink-0"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateImage()}
              disabled={isGenerating}
              className="flex-1 gap-2 py-6"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 이미지 생성 중...</>
              ) : (
                <><ImagePlus className="w-4 h-4" /> AI 이미지 자동 생성</>
              )}
            </Button>
          </div>

          {!showPromptInput ? (
            <button
              onClick={() => setShowPromptInput(true)}
              className="text-xs text-muted-foreground hover:text-accent transition-colors"
            >
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
              <Button
                size="sm"
                onClick={() => generateImage(customPrompt)}
                disabled={isGenerating || !customPrompt}
                className="gap-1 flex-shrink-0"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
