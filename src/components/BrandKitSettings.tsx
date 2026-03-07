// ============================================================
// src/components/BrandKitSettings.tsx — Compliance Engine 통합판
// Feature 2: brand_guidelines.md 업로드 → 파싱 → CSS 오버라이드
// ============================================================
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandKit } from '@/hooks/usePresentation';
import { toast } from 'sonner';
import { Palette, Image as ImageIcon, Type, FileText, RotateCcw, CheckCircle2 } from 'lucide-react';
import { parseBrandGuidelines, applyBrandTokens, resetBrandTokens, BrandTokens } from '@/lib/brand-compliance';

interface BrandKitSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKit: BrandKit;
  onSave: (kit: Partial<BrandKit>) => void;
}

export function BrandKitSettings({ open, onOpenChange, brandKit, onSave }: BrandKitSettingsProps) {
  const [logoUrl, setLogoUrl] = useState(brandKit.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(brandKit.primaryColor || '#3b82f6');
  const [fontFamily, setFontFamily] = useState(brandKit.fontFamily || '');
  const [parsedTokens, setParsedTokens] = useState<BrandTokens | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // MD 파일 파싱 처리
  const handleMdFile = async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Markdown(.md) 또는 텍스트(.txt) 파일만 지원합니다.');
      return;
    }
    try {
      const text = await file.text();
      const tokens = parseBrandGuidelines(text);
      setParsedTokens(tokens);
      // 미리보기: 필드를 파싱된 값으로 채우기
      if (tokens.primaryColor) setPrimaryColor(tokens.primaryColor);
      if (tokens.fontFamily) setFontFamily(tokens.fontFamily);
      if (tokens.logoUrl) setLogoUrl(tokens.logoUrl);
      toast.success(`📄 "${file.name}" 브랜드 가이드라인 파싱 완료!`);
    } catch {
      toast.error('파일 파싱 중 오류가 발생했습니다.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file) handleMdFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMdFile(file);
  };

  const handleSave = () => {
    const kit = {
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
      fontFamily: fontFamily.trim() || null,
    };
    onSave(kit);
    // ✅ Feature 2: CSS 변수 강제 오버라이드 실행
    const tokens: BrandTokens = {
      primaryColor: kit.primaryColor ?? undefined,
      fontFamily: kit.fontFamily ?? undefined,
      logoUrl: kit.logoUrl ?? undefined,
      ...(parsedTokens ?? {}),
    };
    applyBrandTokens(tokens);
    toast.success('✅ 브랜드 킷이 저장되고 전역 테마에 강제 적용되었습니다!');
    onOpenChange(false);
  };

  const handleReset = () => {
    setLogoUrl('');
    setPrimaryColor('#3b82f6');
    setFontFamily('');
    setParsedTokens(null);
    onSave({ logoUrl: null, primaryColor: null, fontFamily: null });
    resetBrandTokens();
    toast.success('브랜드 킷 설정이 초기화되었습니다.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Brand Kit 설정 <span className="text-xs text-muted-foreground font-normal ml-1">— Compliance Engine</span>
          </DialogTitle>
          <DialogDescription>
            브랜드 가이드라인을 설정하면 생성되는 모든 슬라이드에 강제 적용됩니다. MD 파일을 업로드해 자동 파싱하거나 직접 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">

          {/* ✅ Feature 2: MD 파일 업로드 영역 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onClick={() => document.getElementById('brand-md-input')?.click()}
          >
            <input id="brand-md-input" type="file" accept=".md,.txt" className="hidden" onChange={handleFileInput} />
            <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">brand_guidelines.md 드래그 or 클릭</p>
            <p className="text-[11px] text-muted-foreground mt-1">Markdown 파일을 업로드하면 색상·폰트를 자동 파싱합니다</p>
            {parsedTokens && (
              <div className="mt-2 flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 파싱 완료 — 아래 필드에 자동 채움
              </div>
            )}
          </div>

          {/* 로고 URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              로고 이미지 URL
            </Label>
            <Input
              id="logoUrl"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          {/* 메인 컬러 */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor" className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              메인 브랜드 컬러
            </Label>
            <div className="flex gap-3">
              <Input
                id="primaryColorPicker"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                id="primaryColor"
                placeholder="#3b82f6"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 uppercase font-mono"
              />
            </div>
          </div>

          {/* 폰트 */}
          <div className="space-y-2">
            <Label htmlFor="fontFamily" className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              글로벌 폰트 (Font Family)
            </Label>
            <Input
              id="fontFamily"
              placeholder="예: Inter, Pretendard"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-destructive gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> 초기화
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button onClick={handleSave} className="gradient-primary text-white shadow-glow">
              저장 및 강제 적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
