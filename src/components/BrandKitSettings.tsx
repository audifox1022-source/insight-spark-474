import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandKit } from '@/hooks/usePresentation';
import { toast } from 'sonner';
import { Palette, Image as ImageIcon, Type } from 'lucide-react';

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

  const handleSave = () => {
    onSave({
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
      fontFamily: fontFamily.trim() || null,
    });
    toast.success('브랜드 킷 설정이 저장되었습니다.');
    onOpenChange(false);
  };

  const handleReset = () => {
    setLogoUrl('');
    setPrimaryColor('#3b82f6');
    setFontFamily('');
    onSave({ logoUrl: null, primaryColor: null, fontFamily: null });
    toast.success('브랜드 킷 설정이 초기화되었습니다.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Brand Kit 설정
          </DialogTitle>
          <DialogDescription>
            사내 규정(Logo, Color, Font)을 설정하여 생성되는 모든 슬라이드에 우리 회사의 브랜드를 강제 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
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
            <p className="text-[11px] text-muted-foreground">URL 형식의 이미지를 입력하세요. 투명한 배경의 PNG를 권장합니다.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor" className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              메인 브랜드 컬러 (Hex)
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
          <div className="space-y-2">
            <Label htmlFor="fontFamily" className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              글로벌 폰트 (Font Family)
            </Label>
            <Input
              id="fontFamily"
              placeholder="예: 'Pretendard', sans-serif"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">PC에 설치되어 있거나 웹 폰트로 로드된 폰트명을 입력하세요.</p>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-destructive">
            기본값으로 초기화
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} className="gradient-primary text-white shadow-glow">
              저장 및 적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
