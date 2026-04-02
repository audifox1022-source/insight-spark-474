// ============================================================
// src/components/designer/SlideCanvas.tsx
// [Phase 21] 로딩 상태 안내 연동 및 무한 로딩 방어 UI 보강
// ============================================================
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Presentation } from '@/types/presentation'

interface SlideCanvasProps {
  scale: number
  presentation: Presentation | null
  currentSlideIndex: number
  onSetCurrentSlideIndex?: (idx: number) => void
  onElementUpdate?: (elementId: string, updates: Partial<any>) => void
  loadingMessage?: string // [Phase 21] 추가
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({ 
  scale, 
  presentation, 
  currentSlideIndex,
  onElementUpdate,
  loadingMessage
}) => {
  // 데이터 동기화 대기 중 (무한 로딩 방어 화면)
  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    return (
      <div 
        className="bg-white dark:bg-slate-900 shadow-2xl flex items-center justify-center overflow-hidden rounded-[32px] border border-slate-100 shadow-indigo-100/50"
        style={{ width: 1280 * scale, height: 720 * scale }}
      >
        <div className="flex flex-col items-center gap-6 text-center px-12 animate-in fade-in zoom-in duration-500">
           <div className="w-20 h-20 rounded-[32px] bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center relative">
              <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-[10px]">✨</span>
              </div>
           </div>
           
           <div className="space-y-3">
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Syncing Engine Data...</p>
              {/* [Phase 21] 동적 로딩 메시지 출력 */}
              <p className="text-indigo-600 font-bold text-lg animate-pulse max-w-md mx-auto leading-tight">
                  {loadingMessage || 'AI가 슬라이드 전략을 구성 중입니다...'}
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              </div>
           </div>
        </div>
      </div>
    )
  }

  const currentSlide = presentation.slides[currentSlideIndex] || presentation.slides[0]
  if (!currentSlide) return null

  // 하이엔드 앰비언트 효과 (배경 무드)
  const isDarkBase = currentSlide.elements?.some(el => el.id.includes('bg') && el.backgroundColor === '#0f172a');

  return (
    <div 
      className="relative shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] dark:shadow-none overflow-hidden select-none transition-all duration-700 ease-in-out border border-white/10"
      style={{ 
        width: 1280 * scale, 
        height: 720 * scale,
        backgroundColor: isDarkBase ? '#0f172a' : '#ffffff'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
           key={currentSlide.id}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
           className="absolute inset-0 w-full h-full"
        >
          {/* 하이엔드 렌더링 루프 (zIndex 순 정렬) */}
          {(currentSlide.elements || [])
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((el) => (
              <div
                key={el.id}
                className="absolute transition-all duration-300 pointer-events-none"
                style={{
                  left: el.x * scale,
                  top: el.y * scale,
                  width: el.width * scale,
                  height: el.height * scale,
                  zIndex: el.zIndex || 1,
                  display: 'flex',
                  alignItems: el.type === 'text' ? 'flex-start' : 'center',
                  justifyContent: el.textAlign || 'flex-start'
                }}
              >
                {el.type === 'text' ? (
                  <p
                    style={{
                      fontSize: (el.fontSize || 16) * scale,
                      color: el.color || '#000000',
                      textAlign: (el.textAlign as any) || 'left',
                      fontWeight: el.fontWeight || 'normal',
                      lineHeight: 1.2,
                      width: '100%',
                      fontFamily: "'Inter', 'NanumSquare', sans-serif",
                      letterSpacing: '-0.02em',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textShadow: el.color === '#f8fafc' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    {el.content}
                  </p>
                ) : el.type === 'shape' ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: el.backgroundColor || '#000000',
                      borderRadius: (el.borderRadius || 0) * scale,
                      opacity: el.opacity ?? 1,
                      border: el.border || 'none',
                      boxShadow: el.boxShadow || 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 카드 하이라이트 디테일 (Cyan 불릿 전용 등) */}
                    {el.id.includes('bullet') && (
                       <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    )}
                  </div>
                ) : el.type === 'image' ? (
                  <img
                    src={el.content}
                    alt="Slide Element"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: (el.borderRadius || 8) * scale,
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                    }}
                  />
                ) : null}
              </div>
            ))}
            
            {/* 하이엔드 테마 가이드 오버레이 (Decorative) */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
            </div>
        </motion.div>
      </AnimatePresence>
      
      {/* 화면 보호 워터마크 (Premium Feel) */}
      <div className="absolute bottom-8 left-8 z-[100] flex flex-col gap-2">
         {currentSlide.citation_url && (
            <div className="flex items-center gap-2 p-1.5 px-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full shadow-sm animate-in slide-in-from-left-4">
               <span className="text-[10px] font-bold text-indigo-600">SOURCE</span>
               <a 
                 href={currentSlide.citation_url} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="text-[10px] font-medium text-slate-500 hover:text-indigo-500 underline truncate max-w-[200px]"
               >
                 {currentSlide.citation_url}
               </a>
            </div>
         )}
         <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Work AI • High Performance Presentation Engine</span>
         </div>
      </div>
    </div>
  )
}
