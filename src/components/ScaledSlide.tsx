import React from 'react';
import { Slide } from '@/types/presentation';
import { ArrowRight, RefreshCw, Layers, Grid } from 'lucide-react';

interface ScaledSlideProps {
  slide: Slide & { infographicType?: string }; // 인포그래픽 타입 확장
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({ slide, containerClassName, logoUrl, watermark }) => {
  // ✨ 데이터 누락 방지: content가 없으면 points나 items에서라도 가져옴
  const content = slide.content || (slide as any).points || (slide as any).items || [];

  // 인포그래픽 레이아웃 렌더링 함수
  const renderInfographic = () => {
    switch (slide.infographicType) {
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full gap-4">
            {content.map((item, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center p-4 text-center text-sm font-bold bg-white shadow-lg">
                  {item}
                </div>
                {i < content.length - 1 && <ArrowRight className="absolute -right-8 top-1/2 -translate-y-1/2 text-primary w-8 h-8" />}
              </div>
            ))}
          </div>
        );
      case 'process':
        return (
          <div className="space-y-4">
            {content.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold">{i + 1}</div>
                <div className="flex-1 p-4 bg-muted/50 rounded-xl border border-border font-medium">{item}</div>
              </div>
            ))}
          </div>
        );
      default:
        // 일반 불렛 포인트 리스트
        return (
          <ul className="space-y-6">
            {content.map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-2xl leading-snug text-gray-800">
                <span className="mt-2.5 w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
      {/* 워터마크 */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-9xl font-black select-none">
          {watermark}
        </div>
      )}

      {/* 로고 */}
      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div className="p-16 h-full flex flex-col">
        {/* 제목 */}
        <h2 className="text-5xl font-black mb-12 text-gray-900 tracking-tight border-l-[12px] border-primary pl-6">
          {slide.title || "제목 없음"}
        </h2>

        {/* 본문 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden">
          {content.length > 0 ? (
            renderInfographic()
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
              <Layers className="w-16 h-16 opacity-20" />
              <p className="text-xl font-medium">슬라이드 내용을 구성 중입니다...</p>
            </div>
          )}
        </div>

        {/* 하단 페이지 번호 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm font-mono text-gray-400">
          {slide.slideNumber}
        </div>
      </div>
    </div>
  );
};
