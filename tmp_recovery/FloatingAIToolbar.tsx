'use client';

import React, { useState } from 'react';
import { useSlideStore } from '@/store/useSlideStore';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { classifyIntent } from '@/lib/gemini';

export const FloatingAIToolbar: React.FC = () => {
  const { selectedElementId, slides, mergeSlideFragment, setElementSelection, apiKey, updateElement } = useSlideStore();
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!selectedElementId) return null;

  const [slideId, path] = selectedElementId.split(':');
  const slide = slides.find(s => s.id === slideId);

  const handleSend = async () => {
    if (!command.trim() || !apiKey) return;

    setIsLoading(true);
    try {
      // Intent Classification with Error Prevention Rules
      const patch = await classifyIntent(apiKey, slide, command);
      
      // Merge partial JSON fragment
      mergeSlideFragment(slideId, patch);
      
      setCommand('');
      setElementSelection(null);
    } catch (err) {
      console.error(err);
      alert('AI ?몄쭛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. (60???쒗븳 ?먮뒗 臾몃㎘ ?ㅻ쪟 ?뺤씤)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-100/20 rounded-2xl shadow-2xl p-2 flex items-center gap-2 min-w-[400px]">
        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
          <Sparkles size={18} />
        </div>
        
        <div className="flex flex-col flex-1">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="?좏깮???곸뿭???대뼸寃??섏젙?좉퉴??"
            className="bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500 px-2 h-8"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus
          />
          <div className="px-2 text-[10px] text-zinc-600 flex justify-between">
            <span> AI???щ씪?대뱶??60???쒗븳 洹쒖튃??以?섑빀?덈떎.</span>
            <span className={command.length > 50 ? "text-yellow-500" : ""}>{command.length}??/span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSend}
            disabled={isLoading || !command.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          <button
            onClick={() => setElementSelection(null)}
            className="p-2 hover:bg-white/10 text-zinc-400 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="text-center mt-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          AI Edit Mode: <span className="text-indigo-400">{path}</span>
        </span>
      </div>
    </div>
  );
};
