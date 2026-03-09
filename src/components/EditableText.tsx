'use client';

import React, { useRef, useEffect } from 'react';
import { useSlideStore } from '@/store/useSlideStore';
import { cn } from '@/lib/utils';

interface EditableTextProps {
  slideId: string;
  path: string;
  value: string;
  className?: string;
  tagName?: any;
  placeholder?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  slideId,
  path,
  value,
  className,
  tagName: Tag = 'div',
  placeholder = '텍스트 입력...',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const updateElement = useSlideStore((state) => state.updateElement);
  const setElementSelection = useSlideStore((state) => state.setElementSelection);
  const selectedElementId = useSlideStore((state) => state.selectedElementId);

  const isSelected = selectedElementId === `${slideId}:${path}`;

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (ref.current) {
      const newValue = ref.current.innerText;
      if (newValue !== value) {
        updateElement(slideId, path, newValue);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setElementSelection(`${slideId}:${path}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent newline if needed, or just let it blur
      // ref.current?.blur();
    }
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'outline-none transition-all duration-200 cursor-text',
        'hover:bg-white/5 focus:bg-white/10 rounded-sm px-1 -mx-1',
        isSelected && 'ring-2 ring-indigo-500/50 bg-indigo-500/10',
        !value && 'after:content-[attr(data-placeholder)] after:opacity-50',
        className
      )}
      data-placeholder={placeholder}
    />
  );
};
