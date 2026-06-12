import { useEffect, useRef, useCallback, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  delay?: number;
  minChanges?: number;
  onSave: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave(
  data: any,
  options: AutoSaveOptions
) {
  const { delay = 30000, minChanges = 10, onSave, enabled = true } = options;
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const lastSavedRef = useRef<string>('');
  const changeCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef(data);
  dataRef.current = data;

  const save = useCallback(async () => {
    if (status === 'saving') return;
    
    setStatus('saving');
    try {
      await onSave();
      lastSavedRef.current = JSON.stringify(dataRef.current);
      changeCountRef.current = 0;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [onSave, status]);

  useEffect(() => {
    if (!enabled) return;
    
    changeCountRef.current++;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (changeCountRef.current >= minChanges) {
        save();
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delay, minChanges, enabled, save]);

  useEffect(() => {
    if (!enabled) return;
    
    const handleBeforeUnload = () => {
      if (changeCountRef.current > 0) {
        navigator.sendBeacon('/api/save', JSON.stringify(dataRef.current));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  const forceSave = useCallback(() => {
    changeCountRef.current = minChanges;
    save();
  }, [minChanges, save]);

  return { status, forceSave };
}
