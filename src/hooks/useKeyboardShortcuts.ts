import { useEffect, useCallback } from 'react';

interface ShortcutOptions {
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPresent: () => void;
  onAddSlide: () => void;
  totalSlides: number;
  currentSlide: number;
  enabled: boolean;
}

export function useKeyboardShortcuts({
  onPrev, onNext, onSave, onDuplicate,
  onDelete, onPresent, onAddSlide,
  totalSlides, currentSlide, enabled,
}: ShortcutOptions) {
  const handler = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // input/textarea에 포커스 중이면 단축키 무시 (텍스트 입력 방해 방지)
    const target = e.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

    // Ctrl/Cmd 조합 단축키는 항상 허용
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onSave();
          return;
        case 'd':
          e.preventDefault();
          onDuplicate();
          return;
        case 'enter':
          e.preventDefault();
          onPresent();
          return;
      }
    }

    // 텍스트 입력 중에는 아래 단축키 무시
    if (isTyping) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        onPrev();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        onNext();
        break;
      case 'Delete':
      case 'Backspace':
        if (totalSlides > 1) {
          e.preventDefault();
          onDelete();
        }
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        onAddSlide();
        break;
      case 'F5':
        e.preventDefault();
        onPresent();
        break;
    }
  }, [enabled, onPrev, onNext, onSave, onDuplicate, onDelete, onPresent, onAddSlide, totalSlides]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
