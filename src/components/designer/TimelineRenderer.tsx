import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Circle } from 'lucide-react';

interface TimelineItem {
  date: string;
  event: string;
  description?: string;
}

interface TimelineProps {
  data: TimelineItem[];
}

export const TimelineRenderer: React.FC<TimelineProps> = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="font-bold text-lg">타이밍 데이터가 없습니다.</p>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar-premium">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="relative border-l-4 border-indigo-100 ml-8 pl-12 py-4 space-y-12"
      >
        {data.map((item, idx) => (
          <motion.div 
            key={idx} 
            variants={itemAnim}
            className="relative"
          >
            {/* Dot & Icon */}
            <div className="absolute -left-[70px] top-0 w-12 h-12 bg-white rounded-2xl border-4 border-indigo-50 shadow-xl flex items-center justify-center z-10">
               <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            
            {/* Connector Dot */}
            <div className="absolute -left-[54px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] z-20" />

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl shadow-slate-100 group hover:border-indigo-200 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-black rounded-full tracking-wider uppercase">
                  {item.date}
                </span>
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {item.event}
                </h3>
              </div>
              {item.description && (
                <p className="text-lg text-slate-500 font-medium leading-relaxed break-keep">
                  {item.description}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
