import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import Collapsible from './Collapsible';
import PresetManager from './PresetManager';
import { Palette, Type, Home, Layout, Image as ImageIcon, ExternalLink, Rainbow } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';

interface SettingsSectionProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ settings, setSettings }) => {
  const handleSettingChange = (key: keyof Settings, value: string | boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  useEffect(() => {
    const start = settings.enableGradient ? settings.gradientStart : settings.primaryColor;
    const end = settings.enableGradient ? settings.gradientEnd : settings.primaryColor;
    const preview = document.getElementById('gradientPreview');
    if (preview) {
      preview.style.background = `linear-gradient(135deg, ${start}, ${end})`;
    }
  }, [settings.primaryColor, settings.gradientStart, settings.gradientEnd, settings.enableGradient]);

  const UrlInput = ({ id, label, value, placeholder, info }: {
    id: keyof Settings,
    label: string,
    value: string,
    placeholder?: string,
    info?: string
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</Label>
      {info && <p className="text-[10px] text-slate-500 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-2 mb-2">{info}</p>}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          id={id}
          value={value}
          onChange={(e) => handleSettingChange(id, e.target.value)}
          placeholder={placeholder}
          className="h-10 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => value && window.open(value, '_blank')}
          disabled={!value}
          className="h-10 w-10 flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">디자인 상세 설정</h3>
          <p className="text-xs text-slate-500">슬라이드의 비주얼 테마를 세밀하게 조정합니다.</p>
        </div>
      </div>

      <PresetManager currentSettings={settings} onPresetApply={setSettings} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">기본 색상</Label>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <input
                type="color"
                value={settings.primaryColor || '#3b82f6'}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
              />
            </div>
            <Input
              type="text"
              value={settings.primaryColor || ''}
              onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
              className="h-12 font-mono text-xs uppercase"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">대표 글꼴</Label>
          <Select
            value={settings.fontFamily}
            onValueChange={(v) => handleSettingChange('fontFamily', v)}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pretendard">Pretendard (권장)</SelectItem>
              <SelectItem value="Noto Sans KR">Noto Sans KR</SelectItem>
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="M PLUS 1p">M PLUS 1p</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">바닥글(Footer) 텍스트</Label>
          <Input
            value={settings.footerText}
            onChange={(e) => handleSettingChange('footerText', e.target.value)}
            placeholder="회사명 또는 발표자 정보를 입력하세요."
            className="h-11 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2">
        <Collapsible title="상세 꾸미기 및 그라데이션">
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'showTitleUnderline', label: '제목 아래 밑줄 표시' },
                { id: 'showBottomBar', label: '하단 바닥글 바 표시' },
                { id: 'showDateColumn', label: '제목 슬라이드 날짜 표시' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings[opt.id as keyof Settings] as boolean}
                    onChange={(e) => handleSettingChange(opt.id as keyof Settings, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-3 mb-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.enableGradient}
                  onChange={(e) => handleSettingChange('enableGradient', e.target.checked)}
                  className="h-6 w-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <Rainbow className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">고급 그라데이션 적용</span>
                </div>
              </label>

              {settings.enableGradient && (
                <div className="bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">시작 색상</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                          <input type="color" value={settings.gradientStart || '#3b82f6'} onChange={(e) => handleSettingChange('gradientStart', e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" />
                        </div>
                        <Input type="text" value={settings.gradientStart || ''} onChange={(e) => handleSettingChange('gradientStart', e.target.value)} className="h-10 text-xs font-mono uppercase" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">종료 색상</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                          <input type="color" value={settings.gradientEnd || '#8b5cf6'} onChange={(e) => handleSettingChange('gradientEnd', e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" />
                        </div>
                        <Input type="text" value={settings.gradientEnd || ''} onChange={(e) => handleSettingChange('gradientEnd', e.target.value)} className="h-10 text-xs font-mono uppercase" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">미리보기</Label>
                    <div id="gradientPreview" className="h-20 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-lg backdrop-blur-sm border border-white/20">
                      GRADIENT PREVIEW
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapsible>

        <Collapsible title="로고 및 브랜드 자산">
          <div className="grid grid-cols-1 gap-6 py-2">
            <UrlInput id="headerLogoUrl" label="상단 레이아웃 로고" value={settings.headerLogoUrl} info="발표 슬라이드 상단에 표시될 브랜드 로고 URL입니다." />
            <UrlInput id="closingLogoUrl" label="클로징 슬라이드 로고" value={settings.closingLogoUrl} />
          </div>
        </Collapsible>

        <Collapsible title="슬라이드 배경 테마 (이미지)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
            <UrlInput id="titleBgUrl" label="제목 슬라이드 배경" value={settings.titleBgUrl} info="표지 슬라이드의 배경 이미지입니다." />
            <UrlInput id="sectionBgUrl" label="중간 섹션 배경" value={settings.sectionBgUrl} />
            <UrlInput id="mainBgUrl" label="일반 본문 배경" value={settings.mainBgUrl} />
            <UrlInput id="closingBgUrl" label="마지막 슬라이드 배경" value={settings.closingBgUrl} />
          </div>
        </Collapsible>

        <div className="pt-4">
          <UrlInput id="driveFolderUrl" label="결과물 저장 경로 (Google Drive)" value={settings.driveFolderUrl} placeholder="https://drive.google.com/drive/folders/..." />
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
