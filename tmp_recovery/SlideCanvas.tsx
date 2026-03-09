'use client';

import React from 'react';
import { useSlideStore } from '@/store/useSlideStore';
import { EditableText } from './EditableText';
import { cn } from '@/lib/utils';

const getAutoFitClass = (text: string, baseClass: string, maxLength: number = 40) => {
  if (text.length > maxLength) {
    return cn(baseClass, "scale-[0.9] origin-left transition-transform");
  }
  if (text.length > maxLength * 0.7) {
    return cn(baseClass, "scale-[0.95] origin-left transition-transform");
  }
  return baseClass;
};

export const SlideCanvas: React.FC = () => {
  const { slides, activeSlideId, setElementSelection } = useSlideStore();
  const slide = slides.find(s => s.id === activeSlideId);

  if (!slide) {
    return (
      <div className="w-full aspect-video bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center text-zinc-500 italic">
        ?щ씪?대뱶瑜??좏깮?섏꽭??
      </div>
    );
  }

  const { theme, content, layout_type } = slide;

  return (
    <div 
      className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-700"
      style={{ 
        background: theme.bg_color,
        color: theme.text_color,
        fontFamily: theme.font_family
      }}
      onClick={() => setElementSelection(null)}
    >
      {/* Top Gradient Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500 opacity-80" />

      <div className="w-full h-full p-6 sm:p-10 md:p-[8%] flex flex-col relative z-10">
        <EditableText
          slideId={slide.id}
          path="content.title"
          value={content.title}
          tagName="h1"
          className={getAutoFitClass(content.title, "text-5xl font-extrabold tracking-tight mb-4", 30)}
        />

        {content.subtitle && (
          <EditableText
            slideId={slide.id}
            path="content.subtitle"
            value={content.subtitle}
            tagName="p"
            className={getAutoFitClass(content.subtitle, "text-xl text-zinc-400 font-light mb-8", 50)}
          />
        )}

        <div className="flex-1 overflow-hidden">
          {layout_type === 'content' && (
            <ul className="space-y-4">
              {content.body.map((item, idx) => (
                <li key={idx} className="flex gap-4 items-start group">
                  <span className="text-indigo-500 mt-1.5 shrink-0">??/span>
                  <EditableText
                    slideId={slide.id}
                    path={`content.body[${idx}]`}
                    value={item}
                    className={getAutoFitClass(item, "text-xl leading-relaxed", 50)}
                  />
                </li>
              ))}
            </ul>
          )}

          {layout_type === 'two_column' && (
            <div className="grid grid-cols-2 gap-12 h-full">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 overflow-hidden">
                <EditableText
                  slideId={slide.id}
                  path="content.left_column.title"
                  value={content.left_column?.title || ''}
                  tagName="h3"
                  className={getAutoFitClass(content.left_column?.title || '', "text-xl font-bold text-indigo-400 mb-4", 25)}
                />
                <ul className="space-y-2">
                  {content.left_column?.items.map((item, idx) => (
                    <li key={idx}>
                      <EditableText
                        slideId={slide.id}
                        path={`content.left_column.items[${idx}]`}
                        value={item}
                        className={getAutoFitClass(item, "text-sm text-zinc-300", 40)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 overflow-hidden">
                <EditableText
                  slideId={slide.id}
                  path="content.right_column.title"
                  value={content.right_column?.title || ''}
                  tagName="h3"
                  className={getAutoFitClass(content.right_column?.title || '', "text-xl font-bold text-indigo-400 mb-4", 25)}
                />
                <ul className="space-y-2">
                  {content.right_column?.items.map((item, idx) => (
                    <li key={idx}>
                      <EditableText
                        slideId={slide.id}
                        path={`content.right_column.items[${idx}]`}
                        value={item}
                        className={getAutoFitClass(item, "text-sm text-zinc-300", 40)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div className="mt-auto flex items-center justify-between opacity-30 text-xs uppercase tracking-widest font-bold">
          <span>InsightSpark AI</span>
          <span className="w-12 h-px bg-current" />
          <span>Page 0{slides.indexOf(slide) + 1}</span>
        </div>
      </div>
    </div>
  );
};
