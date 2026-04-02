import React, { useState, useEffect, useRef } from 'react';
import { Settings } from '../types';
import { Button } from './ui/button';
import { 
  Save, 
  Trash2, 
  Download, 
  Upload, 
  Plus, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

interface PresetManagerProps {
  currentSettings: Settings;
  onPresetApply: (settings: Settings) => void;
}

const PresetManager: React.FC<PresetManagerProps> = ({ currentSettings, onPresetApply }) => {
  const [presets, setPresets] = useState<{ [key: string]: Settings }>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem('slideGeneratorPresets');
      if (storedPresets) {
        setPresets(JSON.parse(storedPresets) || {});
      }
    } catch (e) {
      console.error("Failed to load presets from localStorage", e);
    }
  }, []);

  const saveToStorage = (newPresets: { [key: string]: Settings }) => {
    setPresets(newPresets || {});
    localStorage.setItem('slideGeneratorPresets', JSON.stringify(newPresets || {}));
  };

  const handleSave = () => {
    const name = prompt('프리셋 이름을 입력하세요:');
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const newPresets = { ...(presets || {}), [trimmedName]: currentSettings };
      saveToStorage(newPresets);
      setSelectedPreset(trimmedName);
      toast.success(`프리셋 '${trimmedName}'이(가) 저장되었습니다.`);
    }
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(`프리셋 '${name}'을(를) 삭제하시겠습니까?`)) {
      const newPresets = { ...(presets || {}) };
      delete newPresets[name];
      saveToStorage(newPresets);
      if (selectedPreset === name) setSelectedPreset('');
      toast.info(`프리셋 '${name}'이(가) 삭제되었습니다.`);
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(presets || {}, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `workai-presets-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('프리셋 데이터를 내보냈습니다.');
    } catch (e) {
      toast.error('내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultStr = (event.target?.result as string) || "{}";
        const imported = JSON.parse(resultStr);
        if (typeof imported !== 'object' || imported === null) {
          throw new Error('올바른 JSON 형식이 아닙니다.');
        }
        
        const merged = { ...(presets || {}), ...imported };
        saveToStorage(merged);
        toast.success(`${Object.keys(imported).length}개의 프리셋을 가져왔습니다.`);
      } catch (err) {
        toast.error('가져오기 실패: 올바른 프리셋 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Reset
  };

  useEffect(() => {
    if (selectedPreset && presets && presets[selectedPreset]) {
      onPresetApply(presets[selectedPreset]);
      toast.info(`'${selectedPreset}' 프리셋이 적용되었습니다.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  const presetKeys = Object.keys(presets || {});

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">디자인 프리셋 관리</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleExport}
            className="h-7 px-2 text-[10px] font-bold gap-1 hover:bg-slate-100"
            title="모든 프리셋 내보내기"
          >
            <Download className="w-3 h-3" /> 내보내기
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleImportClick}
            className="h-7 px-2 text-[10px] font-bold gap-1 hover:bg-slate-100"
            title="프리셋 데이터 가져오기"
          >
            <Upload className="w-3 h-3" /> 가져오기
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer pr-10"
            >
              <option value="">저장된 프리셋 선택...</option>
              {presetKeys.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            className="h-10 px-4 rounded-xl gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> 현재 저장
          </Button>
        </div>

        {presetKeys.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {presetKeys.map(name => (
              <div 
                key={name}
                onClick={() => setSelectedPreset(name)}
                className={`group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border transition-all cursor-pointer ${
                  selectedPreset === name 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                }`}
              >
                <span className="text-xs font-bold">{name}</span>
                <button 
                  onClick={(e) => handleDelete(e, name)}
                  className={`p-1 rounded-full transition-colors ${
                    selectedPreset === name 
                      ? 'hover:bg-white/20 text-white/70 hover:text-white' 
                      : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {presetKeys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-[10px] font-medium">저장된 프리셋이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresetManager;
