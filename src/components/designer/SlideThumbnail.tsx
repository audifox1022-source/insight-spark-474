import React from 'react';
import { motion } from 'framer-motion';

interface SlideThumbnailProps {
  index: number;
  isActive: boolean;
  onClick: () => void;
  renderContent: () => React.ReactNode;
}

export const SlideThumbnail: React.FC<SlideThumbnailProps> = ({ 
  index, 
  isActive, 
  onClick, 
  renderContent 
}) => {
  return (
    <div className="flex flex-col gap-2 w-full group">
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className={`text-[11px] font-black tabular-nums transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        {isActive && (
          <motion.div 
            layoutId="active-dot"
            className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" 
          />
        )}
      </div>
      
      <div 
        onClick={onClick}
        className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 bg-white ${
          isActive 
            ? 'border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50/50' 
            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        {/* The Magic: CSS Scaling of the real component */}
        <div 
          className="absolute top-0 left-0 origin-top-left pointer-events-none select-none overflow-hidden bg-white"
          style={{ 
            width: '1280px', 
            height: '720px', 
            transform: 'scale(0.18)', // Adjusting scale to fit modern sidebar widths
          }}
        >
          {renderContent()}
        </div>
        
        {/* Overlay to prevent interaction inside the thumbnail */}
        <div className="absolute inset-0 z-10 bg-transparent" />
        
        {/* Hover Effect Details */}
        {!isActive && (
           <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
        )}
      </div>
    </div>
  );
};
