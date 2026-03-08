'use client';

import React, { useEffect, useState } from 'react';
import { useSlideStore } from '@/store/useSlideStore';
import { SlideCanvas } from '@/components/SlideCanvas';
import { FloatingAIToolbar } from '@/components/FloatingAIToolbar';
import { Sparkles, Layers, Terminal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateSlides } from '@/lib/gemini';
import { Slide } from '@/types/presentation';

export default function Home() {
  const { slides, setSlides, setActiveSlideId, activeSlideId, setApiKey, apiKey } = useSlideStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');

  useEffect(() => {
    // Initial State Setup
    const envApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'DEMO_KEY';
    setApiKey(envApiKey);
    const initialSlide = {
      id: 'slide-1',
      layout_type: 'content',
      theme: {
        bg_color: '#09090b',
        accent_color: '#6366f1',
        text_color: '#fafafa',
        font_family: 'Inter',
      },
      content: {
        title: '하이브리드 UX의 미래',
        subtitle: '수동 편집과 AI 편집의 완벽한 조화',
        body: [
          '실시간 텍스트 직접 수정 (Manual Edit)',
          '맥락 인식 기반 AI 수정 요청 (AI Edit)',
          '단일 원본 JSON 상태 관리 (SSOT)',
        ],
      },
      titleStyle: {},
      contentStyle: {},
    };
    
    const secondSlide = {
      id: 'slide-2',
      layout_type: 'two_column',
      theme: { ...initialSlide.theme, accent_color: '#ec4899' },
      content: {
        title: '수정 방식 비교',
        left_column: { 
          id: 'l1', 
          title: 'Manual Edit', 
          items: ['빠른 오타 수정', '미세한 톤 조정', '직관적인 타이핑'] 
        },
        right_column: { 
          id: 'r1', 
          title: 'AI Edit', 
          items: ['내용 요약 및 확장', '문체 변경 (톤앤매너)', '데이터 시각화 제안'] 
        },
        body: [],
      },
      titleStyle: {},
      contentStyle: {},
    };

    setSlides([initialSlide as any, secondSlide as any]);
    setActiveSlideId('slide-1');
  }, [setApiKey, setSlides, setActiveSlideId]);

  const handleGenerate = async () => {
    if (!topic.trim() || !apiKey) return;
    setIsGenerating(true);
    try {
      const newSlides = await generateSlides(apiKey, topic);
      setSlides(newSlides);
      setActiveSlideId(newSlides[0]?.id || '');
    } catch (err) {
      console.error(err);
      alert('슬라이드 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-xl fixed top-0 w-full z-40">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black">⚡</div>
            <span className="font-bold tracking-tight text-xl hidden md:block">InsightSpark</span>
          </div>
          
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="어떤 주제로 발표 자료를 만들까요?"
            className="max-w-md w-full bg-zinc-800/50 border border-zinc-700 rounded-full px-5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition-all">
            <Layers size={16} /> 슬라이드
          </button>
          <div className="h-6 w-px bg-zinc-700" />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] rounded-full text-sm font-bold transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
            {isGenerating ? '생성 중...' : '생성하기'}
          </button>
        </div>
      </header>

      {/* Hero Section / Canvas Container */}
      <div className="pt-32 pb-20 px-4 max-w-6xl mx-auto flex flex-col items-center">
        <div className="w-full relative group">
          <SlideCanvas />
          <FloatingAIToolbar />
        </div>

        {/* Instructions */}
        <div className="mt-12 grid grid-cols-3 gap-8 w-full">
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <h4 className="flex items-center gap-2 font-bold mb-3 text-indigo-400">
              <Terminal size={16} /> Step 1: Manual Edit
            </h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              슬라이드 위의 텍스트를 직접 클릭해 보세요. 즉시 내용을 수정할 수 있으며 Zustand Store에 실시간 저장됩니다.
            </p>
          </div>
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <h4 className="flex items-center gap-2 font-bold mb-3 text-violet-400">
              <Sparkles size={16} /> Step 2: AI Edit
            </h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              요소를 선택하면 나타나는 하단 AI 툴바에 명령어를 입력해 보세요. 선택된 영역의 컨텍스트를 유지하며 수정됩니다.
            </p>
          </div>
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <h4 className="flex items-center gap-2 font-bold mb-3 text-pink-400">
              <Layers size={16} /> Step 3: Result
            </h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              모든 변경 사항은 단일 JSON 원본을 유지합니다. 우측 하단 페이지 번호를 클릭해 슬라이드를 전환할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Thumbnail Navigator (Simple) */}
        <div className="flex gap-4 mt-8 pb-10 overflow-x-auto w-full px-4 scrollbar-hide">
          {slides.map((s: Slide, idx: number) => (
            <button
              key={s.id}
              onClick={() => setActiveSlideId(s.id)}
              className={cn(
                "w-32 aspect-video bg-zinc-800 rounded-lg border-2 transition-all p-2 text-left text-[10px] overflow-hidden",
                activeSlideId === s.id ? "border-indigo-500 scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <div className="font-bold mb-1 opacity-50">Slide 0{idx + 1}</div>
              <div className="line-clamp-2">{s.content.title}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
