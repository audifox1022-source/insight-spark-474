import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Edit3, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentEditorToolbarProps {
  onCommand: (command: string, value?: string) => void;
  isEditMode: boolean;
  onToggleMode: (mode: boolean) => void;
}

export const DocumentEditorToolbar: React.FC<DocumentEditorToolbarProps> = ({
  onCommand,
  isEditMode,
  onToggleMode
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 transition-colors">
      <div className="flex items-center gap-1">
        {/* Mode Toggle */}
        <div className="flex bg-muted/60 rounded-lg p-1 mr-4 border border-border/50">
          <Button
            variant="ghost" size="sm"
            onClick={() => onToggleMode(true)}
            className={cn('h-7 px-3 text-xs font-semibold rounded-md', isEditMode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground')}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> 편집 모드
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => onToggleMode(false)}
            className={cn('h-7 px-3 text-xs font-semibold rounded-md', !isEditMode ? 'bg-background shadow-sm text-emerald-600' : 'text-muted-foreground')}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" /> 완성 미리보기
          </Button>
        </div>

        {/* Format Toolbar (Only in edit mode) */}
        {isEditMode && (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center">
              <ToolbarButton icon={<Bold />} onClick={() => onCommand('bold')} title="굵게" />
              <ToolbarButton icon={<Italic />} onClick={() => onCommand('italic')} title="기울임꼴" />
              <ToolbarButton icon={<Underline />} onClick={() => onCommand('underline')} title="밑줄" />
              <ToolbarButton icon={<Strikethrough />} onClick={() => onCommand('strikeThrough')} title="취소선" />
            </div>
            
            <div className="w-px h-5 bg-border mx-1" />
            
            <div className="flex items-center">
              <ToolbarButton icon={<AlignLeft />} onClick={() => onCommand('justifyLeft')} title="왼쪽 정렬" />
              <ToolbarButton icon={<AlignCenter />} onClick={() => onCommand('justifyCenter')} title="가운데 정렬" />
              <ToolbarButton icon={<AlignRight />} onClick={() => onCommand('justifyRight')} title="오른쪽 정렬" />
              <ToolbarButton icon={<AlignJustify />} onClick={() => onCommand('justifyFull')} title="양쪽 정렬" />
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="flex items-center">
              <ToolbarButton icon={<List />} onClick={() => onCommand('insertUnorderedList')} title="글머리 기호" />
              <ToolbarButton icon={<ListOrdered />} onClick={() => onCommand('insertOrderedList')} title="번호 매기기" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    title={title}
    className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
  </Button>
);
