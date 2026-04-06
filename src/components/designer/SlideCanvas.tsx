// ============================================================
// src/components/designer/SlideCanvas.tsx
// [Phase 21] 로딩 상태 안내 연동 및 무한 로딩 방어 UI 보강 (PREMIUM POLISHED)
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
  loadingMessage?: string 
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({ 
  scale, 
  presentation, 
  currentSlideIndex,
  onElementUpdate,
  loadingMessage
}) => {
  // 데이터 동기화 대기 중 (무한 로딩 방어 화면 - 시각적 몰입감 강화)
  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    return (
      <div 
        className="bg-white dark:bg-slate-900 shadow-2xl flex items-center justify-center overflow-hidden rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-indigo-100/30 dark:shadow-none"
        style={{ width: 1280 * scale, height: 720 * scale }}
      >
        <div className="flex flex-col items-center gap-8 text-center px-12 animate-in fade-in zoom-in duration-700">
           <div className="relative">
              <div className="w-24 h-24 rounded-[32px] bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-100 dark:border-indigo-800 flex items-center justify-center">
                 <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-amber-300 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-xs">✨</span>
              </motion.div>
           </div>
           
           <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic leading-none">Intelligence Engine Syncing</p>
              <h2 className="text-indigo-600 dark:text-indigo-400 font-black text-2xl animate-pulse max-w-md mx-auto leading-tight tracking-tight">
                  {loadingMessage || '전략적 슬라이드 레이아웃을\n설계하고 있습니다...'}
              </h2>
              <div className="flex items-center justify-center gap-2 pt-2">
                 {[0, 1, 2].map((i) => (
                   <motion.div 
                     key={i}
                     animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                     transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                     className="w-2 h-2 rounded-full bg-indigo-400" 
                   />
                 ))}
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
      className="relative shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] dark:shadow-none overflow-hidden select-none transition-all duration-1000 ease-in-out border border-white/10 rounded-[4px]"
      style={{ 
        width: 1280 * scale, 
        height: 720 * scale,
        backgroundColor: isDarkBase ? '#0f172a' : '#ffffff',
        // 텍스트 렌더링 최적화
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
           key={currentSlide.id}
           initial={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
           animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
           exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
           transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
           className="absolute inset-0 w-full h-full"
        >
          {/* 엘리먼트 렌더링 루프 */}
          {(currentSlide.elements || [])
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((el) => (
              <div
                key={el.id}
                className="absolute transition-all duration-500 pointer-events-none"
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
                      lineHeight: 1.3,
                      width: '100%',
                      fontFamily: "'Inter', 'Pretendard', sans-serif",
                      letterSpacing: '-0.03em',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textShadow: el.color === '#f8fafc' || el.color === '#ffffff' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
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
                    {/* 카드 하이라이트/그라데이션 디테일 */}
                    {el.id.includes('bullet') && (
                       <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
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
                      borderRadius: (el.borderRadius || 12) * scale,
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                  />
                ) : null}
              </div>
            ))}
            
            {/* 하이엔드 앰비언트 글로우 (Decorative UX) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07]">
               <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-cyan-400 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />
            </div>
        </motion.div>
      </AnimatePresence>
      
      {/* 워너마크 및 출처 정보 (Glassmorphism & Micro-detail) */}
      <div className="absolute bottom-10 left-10 z-[100] flex flex-col gap-3">
         {currentSlide.citation_url && (
            <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-2.5 p-2 px-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-700/50 rounded-full shadow-lg"
            >
               <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">REF.DATA</span>
               <a 
                 href={currentSlide.citation_url} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors underline-offset-2 decoration-indigo-500/30 truncate max-w-[250px]"
               >
                 {currentSlide.citation_url.replace(/^https?:\/\//, '')}
               </a>
            </motion.div>
         )}
         <div className="flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-default">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Work AI • High Performance Visual Engine</span>
         </div>
      </div>
    </div>
  )
}
