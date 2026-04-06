// ============================================================
// src/components/ScaledSlide.tsx (Work AI 슬라이드 렌더러)
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useSlideStore } from '@/store/useSlideStore';
import { SlideElement } from '@/types/presentation';
import { cn } from '@/lib/utils';

interface ScaledSlideProps {
  slideId: string;
  elements: SlideElement[];
  width: number;
  height: number;
  scale: number;
  preview?: boolean;
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slideId,
  elements,
  width,
  height,
  scale,
  preview = false,
}) => {
  const { 
    selectedElementId, 
    setSelectedElementId, 
    updateElement, 
    pushHistory 
  } = useSlideStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);

  // 전역 클릭 시 선택 해제 (빈 공간 클릭)
  const handleContentClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElementId(null);
      setEditingId(null);
    }
  };

  return (
    <div
      className="relative bg-white shadow-2xl overflow-hidden select-none"
      style={{
        width: width * scale,
        height: height * scale,
        minWidth: width * scale,
        minHeight: height * scale,
      }}
      onClick={handleContentClick}
    >
      {/* 슬라이드 캔버스 (Scale 적용을 위한 Inner Wrapper) */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ transform: `scale(${scale})`, width, height }}
      >
        {elements
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => (
            <SlideComponent
              key={el.id}
              element={el}
              slideId={slideId}
              isSelected={selectedElementId === el.id}
              isEditing={editingId === el.id}
              onSelect={() => setSelectedElementId(el.id)}
              onStartEdit={() => setEditingId(el.id)}
              onUpdate={(updates) => updateElement(slideId, el.id, updates)}
              onFinishUpdate={() => pushHistory()}
              preview={preview}
            />
          ))}
      </div>
    </div>
  );
};

// ── 개별 요소 컴포넌트 (Rnd 래퍼) ──────────────────────────────
interface SlideComponentProps {
  element: SlideElement;
  slideId: string;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onUpdate: (updates: Partial<SlideElement>) => void;
  onFinishUpdate: () => void;
  preview: boolean;
}

const SlideComponent: React.FC<SlideComponentProps> = ({
  element,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onUpdate,
  onFinishUpdate,
  preview,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // 편집 모드 종료 처리
  useEffect(() => {
    if (!isEditing && contentRef.current) {
        // 편집이 끝났을 때 최종 텍스트 업데이트
        const newContent = contentRef.current.innerText;
        if (newContent !== element.content) {
            onUpdate({ content: newContent });
            onFinishUpdate();
        }
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (preview) return;
    e.stopPropagation();
    onStartEdit();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (preview) return;
    if (isEditing) {
        e.stopPropagation();
        return;
    }
    onSelect();
  };

  // Preview 모드에서는 Rnd 없이 정적 렌더링
  if (preview) {
    return (
      <div
        className="absolute"
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
          color: element.color || '#000',
          fontSize: element.fontSize || 24,
          fontFamily: element.fontFamily || 'Inter',
          textAlign: element.textAlign || 'left',
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
        }}
      >
        <div className="w-full h-full break-keep whitespace-pre-wrap leading-relaxed">
          {element.content}
        </div>
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: element.width, height: element.height }}
      position={{ x: element.x, y: element.y }}
      onDragStop={(_, d) => {
        onUpdate({ x: d.x, y: d.y });
        onFinishUpdate();
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        onUpdate({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
        onFinishUpdate();
      }}
      disableDragging={isEditing}
      enableResizing={!isEditing && isSelected}
      bounds="parent"
      className={cn(
        "group flex flex-col",
        isSelected && !isEditing ? "ring-2 ring-primary ring-offset-2 ring-offset-white shadow-xl" : "",
        isEditing ? "cursor-text" : "cursor-move"
      )}
      style={{ zIndex: element.zIndex }}
      onPointerDown={handlePointerDown}
    >
      {/* 8방향 핸들 커스텀 (선택 시에만 노출) */}
      {isSelected && !isEditing && (
          <div className="absolute inset-0 pointer-events-none ring-1 ring-primary/30" />
      )}

      {/* 실 콘텐츠 영역 */}
      <div
        ref={contentRef}
        onDoubleClick={handleDoubleClick}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          "w-full h-full outline-none break-keep whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar p-1",
          isEditing ? "bg-slate-50/50" : ""
        )}
        style={{
          color: element.color || '#000',
          fontSize: element.fontSize || 24,
          fontFamily: element.fontFamily || 'Inter',
          textAlign: element.textAlign || 'left',
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
        }}
      >
        {element.content}
      </div>
    </Rnd>
  );
};
