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
  style?: React.CSSProperties;
  onUpdate?: (value: string) => void;
}

export const EditableText: React.FC<EditableTextProps> = ({
  slideId,
  path,
  value,
  className,
  tagName: Tag = 'div',
  placeholder = '텍스트 입력...',
  style,
  onUpdate,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const updateElement = useSlideStore((state) => state.updateElement);
  const setSelectedElementId = useSlideStore((state) => state.setSelectedElementId);
  const selectedElementId = useSlideStore((state) => state.selectedElementId);
  const currentSlideIndex = useSlideStore((state) => state.currentSlideIndex);

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
        updateElement(slideId, path, { content: newValue });
        onUpdate?.(newValue);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(`${slideId}:${path}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // 스페이스바나 방향키가 슬라이드 등 외부 동작에 영향을 주지 않도록 차단
    if (e.key === 'Enter' && !e.shiftKey) {
      ref.current?.blur();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // 디자이너 화면 드래그 이벤트 등의 충돌 차단
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      className={cn(
        'outline-none transition-all duration-200 cursor-text',
        'hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-sm px-1 -mx-1',
        'focus:ring-2 focus:ring-blue-500/50 focus:bg-blue-500/5 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        isSelected && 'ring-2 ring-indigo-500/50 bg-indigo-500/10',
        !value && 'after:content-[attr(data-placeholder)] after:opacity-50',
        className
      )}
      style={style}
      data-placeholder={placeholder}
    />
  );
};
