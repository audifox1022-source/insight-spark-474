import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SortableItemProps {
  id: string;
  item: string;
  index: number;
  onUpdate: (index: number, val: string) => void;
  onRemove?: (index: number) => void;
  isRemovable: boolean;
}

function SortableItem({ id, item, index, onUpdate, onRemove, isRemovable }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group relative bg-background rounded-lg border border-transparent hover:border-border/50 transition-colors p-1 -mx-1">
      {/* 드래그 핸들 */}
      <div 
        {...attributes} 
        {...listeners}
        className="pt-3 cursor-grab text-muted-foreground/30 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <Textarea
        value={item}
        onChange={(e) => onUpdate(index, e.target.value)}
        className="flex-1 min-h-[60px] text-[13px] leading-relaxed resize-y focus-visible:ring-1 focus-visible:ring-primary/40 bg-transparent"
        placeholder={`항목 ${index + 1}`}
      />
      
      {isRemovable && onRemove && (
        <Button 
          size="icon" 
          variant="ghost"
          className="h-7 w-7 absolute -right-1 -top-1 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-all z-10"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

interface SortableContentListProps {
  items: string[];
  onChange: (newItems: string[]) => void;
  onRemoveItem?: (index: number) => void;
}

export function SortableContentList({ items, onChange, onRemoveItem }: SortableContentListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px 이상 드래그해야 시작 (클릭과 구분)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 고유 ID 생성을 위해 인덱스와 내용을 결합한 일종의 키 배열 생성
  // (실제 프로덕션에서는 항목마다 UUID가 있는 것이 가장 좋음)
  const itemIds = React.useMemo(() => items.map((_, i) => `item-${i}`), [items.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      onChange(newItems);
    }
  };

  const handleUpdate = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = val;
    onChange(newItems);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <SortableItem
              key={itemIds[index]}
              id={itemIds[index]}
              item={item}
              index={index}
              onUpdate={handleUpdate}
              onRemove={onRemoveItem}
              isRemovable={items.length > 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
