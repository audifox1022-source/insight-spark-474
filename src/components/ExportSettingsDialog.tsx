import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Palette, Building2 } from 'lucide-react';
import { BrandSettings, DEFAULT_BRAND } from '@/lib/export-presentation';

interface ExportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // ✅ onExport 함수 시그니처 수정: 'pptx-image' 타입 추가
  onExport: (format: 'pptx' | 'pptx-image' | 'pdf', brand: BrandSettings) => void;
  isExporting: boolean;
}

const PRESET_PALETTES = [
  { name: '딥 네이비', primary: '1B3A5C', accent: '0D8ECF' },
  { name: '차콜 블랙', primary: '2D2D2D', accent: 'E85D04' },
  { name: '포레스트', primary: '1B4332', accent: '40916C' },
  { name: '버건디', primary: '6A040F', accent: 'D00000' },
  { name: '슬레이트', primary: '334155', accent: '6366F1' },
];

export function ExportSettingsDialog({ open, onOpenChange, onExport, isExporting }: ExportSettingsDialogProps) {
  const [brand, setBrand] = useState<BrandSettings>({ ...DEFAULT_BRAND });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBrand((prev) => ({ ...prev, logoDataUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setBrand((prev) => ({ ...prev, logoDataUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectPalette = (primary: string, accent: string) => {
    setBrand((prev) => ({ ...prev, primaryColor: primary, accentColor: accent }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-accent" />
            내보내기 설정
          </DialogTitle>
          <DialogDescription>
            회사 로고와 브랜드 컬러를 설정하여 발표 자료를 커스터마이징합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Company Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4" />
              회사/팀 이름
            </Label>
            <Input
              value={brand.companyName}
              onChange={(e) => setBrand((prev) => ({ ...prev, companyName: e.target.value }))}
              placeholder="가스원단위 절감 TFT"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">회사 로고</Label>
            {brand.logoDataUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                <img
                  src={brand.logoDataUrl}
                  alt="로고 미리보기"
                  className="w-16 h-12 object-contain rounded bg-card"
                />
                <div className="flex-1 text-sm text-muted-foreground">로고가 업로드되었습니다</div>
                <Button variant="ghost" size="sm" onClick={removeLogo}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border bg-muted/50 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-4 h-4" />
                로고 이미지 업로드 (PNG, JPG)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">브랜드 컬러 프리셋</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => selectPalette(p.primary, p.accent)}
                  className={`
                    flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all text-xs
                    ${brand.primaryColor === p.primary && brand.accentColor === p.accent
                      ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
                      : 'border-border hover:border-muted-foreground'
                    }
                  `}
                >
                  <div className="flex gap-0.5">
                    <div
                      className="w-5 h-5 rounded-l"
                      style={{ backgroundColor: `#${p.primary}` }}
                    />
                    <div
                      className="w-5 h-5 rounded-r"
                      style={{ backgroundColor: `#${p.accent}` }}
                    />
                  </div>
                  <span className="text-muted-foreground leading-tight">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">메인 컬러</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={`#${brand.primaryColor}`}
                  onChange={(e) => setBrand((prev) => ({ ...prev, primaryColor: e.target.value.replace('#', '') }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={`#${brand.primaryColor}`}
                  onChange={(e) => {
                    const v = e.target.value.replace('#', '');
                    if (/^[0-9a-fA-F]{0,6}$/.test(v)) {
                      setBrand((prev) => ({ ...prev, primaryColor: v }));
                    }
                  }}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">강조 컬러</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={`#${brand.accentColor}`}
                  onChange={(e) => setBrand((prev) => ({ ...prev, accentColor: e.target.value.replace('#', '') }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={`#${brand.accentColor}`}
                  onChange={(e) => {
                    const v = e.target.value.replace('#', '');
                    if (/^[0-9a-fA-F]{0,6}$/.test(v)) {
                      setBrand((prev) => ({ ...prev, accentColor: v }));
                    }
                  }}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Preview strip */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">미리보기</Label>
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="h-10 flex items-center px-4 gap-3" style={{ backgroundColor: `#${brand.primaryColor}` }}>
                {brand.logoDataUrl && (
                  <img src={brand.logoDataUrl} alt="" className="h-6 w-auto object-contain" />
                )}
                <span className="text-white text-sm font-medium">{brand.companyName || '발표 제목'}</span>
              </div>
              <div className="h-1" style={{ backgroundColor: `#${brand.accentColor}` }} />
              <div className="p-4 bg-card flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${brand.accentColor}` }} />
                <span className="text-sm text-muted-foreground">슬라이드 내용 예시</span>
              </div>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {/* ✅ 버튼 레이아웃 수정 및 고화질 PPT 버튼 추가 */}
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90"
              onClick={() => onExport('pptx', brand)}
              disabled={isExporting}
            >
              PPT 내보내기 (텍스트/차트 수정 가능)
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-primary/20 text-primary hover:bg-primary/5"
              onClick={() => onExport('pptx-image', brand)}
              disabled={isExporting}
            >
              고화질 이미지 PPT (디자인 100% 동일)
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onExport('pdf', brand)}
              disabled={isExporting}
            >
              PDF 내보내기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
