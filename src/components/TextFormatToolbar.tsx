// ============================================================
// src/components/TextFormatToolbar.tsx
// 슬라이드 텍스트 서식 도구 모음 컴포넌트
// 기능: 굵게/기울임/밑줄, 정렬(좌/중/우), 텍스트 색상, 폰트 크기
// ============================================================
import React from 'react';
import {
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Palette,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────
export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

interface TextFormatToolbarProps {
  label: string;                        // "제목 서식" | "본문 서식"
  style: TextStyle;
  fontPt?: number;                     // 폰트 크기 (pt)
  onStyleChange: (updated: TextStyle) => void;
  onFontPtChange?: (pt: number) => void;
}

// ──────────────────────────────────────────────────────────
// 추천 텍스트 색상 팔레트 (16종)
// ──────────────────────────────────────────────────────────
const COLOR_SWATCHES = [
  // 기본
  '#1A1A2E', '#FFFFFF', '#0D5C63', '#2EC4B6',
  // 비즈니스
  '#2563EB', '#7C3AED', '#DB2777', '#D97706',
  // 중간 톤
  '#374151', '#6B7280', '#059669', '#DC2626',
  // 파스텔
  '#93C5FD', '#A5F3FC', '#BBF7D0', '#FDE68A',
];

// ──────────────────────────────────────────────────────────
// ToggleBtn — 활성/비활성 토글 버튼
// ──────────────────────────────────────────────────────────
const ToggleBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={[
      'w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    ].join(' ')}
  >
    {children}
  </button>
);

// ──────────────────────────────────────────────────────────
// AlignBtn — 정렬 버튼
// ──────────────────────────────────────────────────────────
const AlignBtn: React.FC<{
  value: 'left' | 'center' | 'right';
  current?: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ value, current, onClick, children }) => (
  <button
    type="button"
    title={`${value === 'left' ? '왼쪽' : value === 'center' ? '가운데' : '오른쪽'} 정렬`}
    onClick={onClick}
    className={[
      'w-7 h-7 flex items-center justify-center rounded-md transition-all',
      current === value
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    ].join(' ')}
  >
    {children}
  </button>
);

// ──────────────────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────────────────
export function TextFormatToolbar({
  label, style, fontPt, onStyleChange, onFontPtChange,
}: TextFormatToolbarProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const toggle = (key: keyof TextStyle) => {
    onStyleChange({ ...style, [key]: !style[key as 'bold' | 'italic' | 'underline'] });
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    onStyleChange({ ...style, align: style.align === align ? 'left' : align });
  };

  const setColor = (color: string) => {
    onStyleChange({ ...style, color });
    setShowColorPicker(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {/* 현재 색상 프리뷰 */}
        {style.color && (
          <div
            className="w-3 h-3 rounded-full border border-border shadow-sm"
            style={{ background: style.color }}
          />
        )}
      </div>

      {/* ─────────── 툴바 행 ─────────── */}
      <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1.5 border border-border/60 flex-wrap">

        {/* 굵게 / 기울임 / 밑줄 */}
        <div className="flex items-center gap-0.5">
          <ToggleBtn active={!!style.bold} onClick={() => toggle('bold')} title="굵게 (Bold)">
            <Bold className="w-3.5 h-3.5" />
          </ToggleBtn>
          <ToggleBtn active={!!style.italic} onClick={() => toggle('italic')} title="기울임 (Italic)">
            <Italic className="w-3.5 h-3.5" />
          </ToggleBtn>
          <ToggleBtn active={!!style.underline} onClick={() => toggle('underline')} title="밑줄 (Underline)">
            <Underline className="w-3.5 h-3.5" />
          </ToggleBtn>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-border/60" />

        {/* 정렬 */}
        <div className="flex items-center gap-0.5">
          <AlignBtn value="left" current={style.align || 'left'} onClick={() => setAlign('left')}>
            <AlignLeft className="w-3.5 h-3.5" />
          </AlignBtn>
          <AlignBtn value="center" current={style.align || 'left'} onClick={() => setAlign('center')}>
            <AlignCenter className="w-3.5 h-3.5" />
          </AlignBtn>
          <AlignBtn value="right" current={style.align || 'left'} onClick={() => setAlign('right')}>
            <AlignRight className="w-3.5 h-3.5" />
          </AlignBtn>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-border/60" />

        {/* 텍스트 색상 */}
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden border border-border/80 hover:border-primary transition-all cursor-pointer shadow-sm group" title="텍스트 색상 변경">
          <input
            type="color"
            value={style.color || '#000000'}
            onChange={(e) => onStyleChange({ ...style, color: e.target.value })}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] cursor-pointer bg-transparent border-0 p-0"
          />
          <div className="pointer-events-none z-10 w-full h-full flex items-center justify-center bg-white/20 backdrop-blur-[1px] group-hover:bg-transparent transition-colors">
            <Palette className="w-3.5 h-3.5 mix-blend-difference text-white" />
          </div>
        </div>

        {/* 구분선 */}
        {onFontPtChange && <div className="w-px h-4 bg-border/60" />}

        {/* 폰트 크기 */}
        {onFontPtChange && fontPt !== undefined && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => onFontPtChange(Math.max(10, fontPt - 2))}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-all text-sm font-bold"
            >
              −
            </button>
            <span className="text-[11px] font-mono font-bold text-foreground min-w-[28px] text-center">
              {fontPt}pt
            </span>
            <button
              type="button"
              onClick={() => onFontPtChange(Math.min(72, fontPt + 2))}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-all text-sm font-bold"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* 현재 적용된 서식 미리보기 */}
      {(style.bold || style.italic || style.underline || style.color || (style.align && style.align !== 'left')) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {style.bold && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">굵게</span>}
          {style.italic && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">기울임</span>}
          {style.underline && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">밑줄</span>}
          {style.align && style.align !== 'left' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
              {style.align === 'center' ? '가운데 정렬' : '오른쪽 정렬'}
            </span>
          )}
          {style.color && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: style.color }}>
              색상 적용
            </span>
          )}
          <button
            type="button"
            onClick={() => onStyleChange({})}
            className="text-[9px] text-muted-foreground hover:text-destructive transition-colors ml-auto"
          >
            전체 초기화
          </button>
        </div>
      )}
    </div>
  );
}
