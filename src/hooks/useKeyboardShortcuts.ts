import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, deps: any[] = []) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInputFocused = e.target instanceof HTMLInputElement || 
                           e.target instanceof HTMLTextAreaElement ||
                           e.target instanceof HTMLSelectElement;
    
    if (isInputFocused && !e.ctrlKey && !e.metaKey) return;

    const key = [
      e.ctrlKey && 'ctrl',
      e.shiftKey && 'shift',
      e.altKey && 'alt',
      e.metaKey && 'meta',
      e.key.toLowerCase()
    ].filter(Boolean).join('+');
    
    if (shortcutsRef.current[key]) {
      e.preventDefault();
      shortcutsRef.current[key](e);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, ...deps]);
}

export const globalShortcuts: ShortcutMap = {
  'ctrl+z': (e) => {
    window.dispatchEvent(new CustomEvent('app:undo'));
  },
  'ctrl+shift+z': (e) => {
    window.dispatchEvent(new CustomEvent('app:redo'));
  },
  'ctrl+s': (e) => {
    window.dispatchEvent(new CustomEvent('app:save'));
  },
  'escape': (e) => {
    window.dispatchEvent(new CustomEvent('app:escape'));
  },
  'f1': (e) => {
    window.dispatchEvent(new CustomEvent('app:help'));
  },
};

export const designerShortcuts: ShortcutMap = {
  'v': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'select' }));
  },
  'm': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'move-object' }));
  },
  'h': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'pan' }));
  },
  't': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'text' }));
  },
  'r': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'shape' }));
  },
  'e': (e) => {
    window.dispatchEvent(new CustomEvent('designer:tool', { detail: 'eraser' }));
  },
  'delete': (e) => {
    window.dispatchEvent(new CustomEvent('designer:delete'));
  },
  'backspace': (e) => {
    window.dispatchEvent(new CustomEvent('designer:delete'));
  },
  'ctrl+d': (e) => {
    window.dispatchEvent(new CustomEvent('designer:duplicate'));
  },
};

export const presentationShortcuts: ShortcutMap = {
  'arrowright': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:next'));
  },
  'arrowleft': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:prev'));
  },
  'home': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:first'));
  },
  'end': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:last'));
  },
  'f': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:fullscreen'));
  },
  'b': (e) => {
    window.dispatchEvent(new CustomEvent('presentation:black'));
  },
};
