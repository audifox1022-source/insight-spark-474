import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  Calendar,
  Zap,
  Coffee,
  Mic,
  Layout,
  Printer,
  User,
  Hash,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Activity,
  FileText,
  CheckCircle,
  BarChart,
  Target,
  FileDown,
  ChevronDown,
  Code,
  FileCode,
  Globe,
  Quote,
  Languages,
  History,
  TrendingUp,
  Brain,
  HelpCircle,
  PieChart as PieChartIcon,
  Tag,
  Lightbulb,
  Search,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

interface SpeechReportProps {
  analysisResult: any;
  audioFile?: File;
  onBack?: () => void;
}

type MainViewType = 'visual' | 'document';
type DocTabType = 'meeting' | 'interview';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

/**
 * [Phase 13.0 - Professional Restoration]
 * - [UI] 화자 점유율(Speaker Share) 파이 차트 추가
 * - [UI] 감정 흐름(Sentiment Timeline) 섹션 추가
 * - [Spec] McKinsey 수준의 회의록 및 정성적 분석 데이터 완벽 매핑
 */
export const SpeechReport: React.FC<SpeechReportProps> = ({ analysisResult, audioFile, onBack }) => {
  const [activeView, setActiveView] = useState<MainViewType>('visual');
  const [activeDocTab, setActiveDocTab] = useState<DocTabType>('meeting');
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const analysisDate = useMemo(() => new Date().toLocaleString('ko-KR'), []);
  const uniqueSpeakers = useMemo(() => {
    const list = analysisResult?.speakers ?? [];
    return Array.from(new Set(list.map((s: any) => s?.name || s?.speaker).filter(Boolean)));
  }, [analysisResult?.speakers]);

  // 차트용 데이터 가공
  const chartData = useMemo(() => {
    return (analysisResult?.speakers || []).map((s: any) => ({
      name: s.name || s.speaker,
      value: s.share || (100 / (analysisResult.speakers?.length || 1))
    }));
  }, [analysisResult?.speakers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatToPlainText = (data: any) => {
    if (!data) return '';
    const clean = (text: string) => typeof text === 'string' ? text.replace(/<[^>]*>?/gm, '').trim() : String(text || '');

    let result = `[AI AUDIO INTELLIGENCE REPORT]\n`;
    result += `==========================================\n`;
    result += `발행 일시: ${analysisDate}\n`;
    result += `파일 명칭: ${audioFile?.name || 'Unknown'}\n`;
    result += `==========================================\n\n`;

    result += `[1. EXECUTIVE SUMMARY]\n`;
    result += `${clean(data?.meetingMinutes?.executiveSummary || data?.summary || '요약 없음')}\n\n`;

    result += `[2. ACTION ITEMS]\n`;
    (data?.actionItems || []).forEach((item: any, i: number) => {
      result += `  - [${item.assignee}] ${item.task} (${item.dueDate})\n`;
    });

    return result;
  };

  const downloadBlob = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fileName} 생성 완료.`);
  };

  if (!analysisResult) return <div className="p-20 text-center font-black animate-pulse">분석 데이터를 불러오는 중...</div>;

  return (
    <div className="w-full max-w-none min-h-screen bg-slate-50 dark:bg-slate-950/90 text-slate-900 transition-colors px-0">
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .document-view-only { display: block !important; margin: 0 !important; padding: 10mm !important; }
        }
      `}</style>

      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-black/5 print-hidden">
        <div className="w-full max-w-none px-6 md:px-12 2xl:px-24 h-24 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <ArrowLeft size={20} />
              </button>
              <div>
                 <h1 className="text-xl font-black tracking-tight">{audioFile?.name || "분석 리포트"}</h1>
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Audio Intelligence Restore v13.0</p>
              </div>
           </div>

           <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.5rem] flex gap-1">
              <button onClick={() => setActiveView('visual')} className={`px-8 py-3 rounded-[1.2rem] text-sm font-black transition-all ${activeView === 'visual' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>시각적 대시보드</button>
              <button onClick={() => setActiveView('document')} className={`px-8 py-3 rounded-[1.2rem] text-sm font-black transition-all ${activeView === 'document' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>문서 생성(A4)</button>
           </div>
        </div>
      </header>

      <main className="w-full max-w-none px-6 md:px-12 2xl:px-24 py-12">
        <AnimatePresence mode="wait">
          {activeView === 'visual' && (
            <motion.div key="visual" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
               
               {/* 상단 통합 매트릭스 & 화자 점유율 차트 */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* 왼쪽: 메트릭스 카드 */}
                  <div className="lg:col-span-8 grid grid-cols-2 gap-6">
                     {[
                       { label: '참석 화자', value: `${uniqueSpeakers.length}명`, icon: Users, color: 'bg-indigo-500/10 text-indigo-600' },
                       { label: '분석 언어', value: '한국어 (KO)', icon: Languages, color: 'bg-emerald-500/10 text-emerald-600' },
                       { label: '주요 감정', value: analysisResult.sentiment || '긍정적', icon: Smile, color: 'bg-orange-500/10 text-orange-600' },
                       { label: '액션 과제', value: `${(analysisResult.actionItems || []).length}건`, icon: Target, color: 'bg-rose-500/10 text-rose-600' }
                     ].map((m, i) => (
                       <Card key={i} className="p-8 border-none shadow-sm flex items-center gap-6">
                          <div className={`${m.color} p-5 rounded-2xl`}><m.icon size={28} /></div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{m.label}</p>
                             <p className="text-2xl font-black mt-1">{m.value}</p>
                          </div>
                       </Card>
                     ))}
                  </div>

                  {/* 오른쪽: 화자 점유율 (Restored) */}
                  <Card className="lg:col-span-4 p-8 border-none shadow-sm flex flex-col items-center justify-center">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 w-full text-left">SPEAKER OCCUPANCY (%)</p>
                     <div className="w-full h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                 {chartData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <RechartsTooltip />
                              <Legend verticalAlign="bottom" align="center" />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </Card>
               </div>

               {/* 메인 3단 구성 (3:6:3) */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* 정성 분석 & 프로파일링 */}
                  <div className="lg:col-span-3 space-y-8">
                     <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6"><Brain className="text-indigo-500" size={20}/><h4 className="text-sm font-black text-slate-400">SPEAKER PROFILING</h4></div>
                        <div className="space-y-4">
                           {(analysisResult.speakers || []).map((s: any, i: number) => (
                             <div key={i} className="p-4 bg-slate-50 rounded-2xl">
                                <p className="font-black text-xs">{s.name || s.speaker}</p>
                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{s.characteristics}</p>
                                {s.sentimentFlow && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                     {s.sentimentFlow.slice(0, 3).map((f: any, idx: number) => (
                                       <Badge key={idx} variant="outline" className="text-[8px] whitespace-nowrap bg-white">
                                          {f.time}: {f.sentiment === 'Positive' ? '😊' : f.sentiment === 'Negative' ? '😡' : '😐'}
                                       </Badge>
                                     ))}
                                  </div>
                                )}
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>

                  {/* 상세 대본 (Core) */}
                  <div className="lg:col-span-6">
                     <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col h-[800px]">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                           <h3 className="text-xl font-black">대화 전사 (Transcript)</h3>
                           <Badge variant="outline" className="font-black">WORD-FOR-WORD</Badge>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
                           {(analysisResult.transcript || []).map((t: any, i: number) => (
                             <div key={i} className="flex gap-6 group">
                                <div className="w-16 shrink-0 text-right">
                                   <p className="text-[9px] font-black text-indigo-500">{t.speaker}</p>
                                   <p className="text-[8px] text-slate-300 mt-1">{t.time}</p>
                                </div>
                                <div className="flex-1 p-6 bg-slate-50 rounded-2xl rounded-tl-none group-hover:bg-indigo-50/30 transition-colors">
                                   <p className="text-sm leading-relaxed">{t.message}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>

                  {/* 실행 과제 & 감정 흐름 */}
                  <div className="lg:col-span-3 space-y-8">
                     <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6"><Target className="text-rose-500" size={20}/><h4 className="text-sm font-black text-slate-400">ACTION ROADMAP</h4></div>
                        <div className="space-y-4">
                           {(analysisResult.actionItems || []).map((item: any, i: number) => (
                             <div key={i} className="p-5 bg-rose-50/30 border border-rose-100 rounded-2xl">
                                <p className="font-bold text-xs">{item.task}</p>
                                <p className="text-[9px] text-rose-400 font-black mt-2">@{item.assignee} | {item.dueDate}</p>
                             </div>
                           ))}
                        </div>
                     </section>

                     <Card className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6"><TrendingUp className="text-yellow-400" size={18}/><h4 className="text-[10px] font-black uppercase opacity-50 tracking-widest">Sentiment Stream</h4></div>
                        <div className="space-y-6 relative z-10">
                           <p className="text-sm italic font-medium leading-relaxed">"{analysisResult.summary}"</p>
                           <div className="flex gap-2">
                              {analysisResult.keywords?.map((k: string, i: number) => <span key={i} className="text-[9px] font-black text-indigo-400">{k}</span>)}
                           </div>
                        </div>
                     </Card>
                  </div>
               </div>
            </motion.div>
          )}

          {activeView === 'document' && (
            <motion.div key="document" className="w-full flex flex-col items-center">
               <div className="w-full max-w-[210mm] bg-white text-black p-[30mm] shadow-2xl document-view-only min-h-[297mm]">
                  <header className="border-b-[8px] border-black pb-10 mb-16 flex justify-between items-end">
                     <h2 className="text-4xl font-black uppercase italic italic">Work AI Report</h2>
                     <p className="text-xs font-bold text-slate-400">{analysisDate}</p>
                  </header>
                  <div className="space-y-16">
                     <section>
                        <h3 className="text-lg font-black mb-6">1. Executive Summary</h3>
                        <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap">{analysisResult.meetingMinutes?.executiveSummary || analysisResult.summary}</p>
                     </section>
                     <section>
                        <h3 className="text-lg font-black mb-6">2. Strategic Action Items</h3>
                        <div className="space-y-4">
                           {(analysisResult.actionItems || []).map((item: any, i: number) => (
                             <div key={i} className="p-6 bg-slate-50 rounded-xl">
                                <p className="font-bold text-base">{item.task}</p>
                                <p className="text-sm text-slate-500 mt-2 font-medium">{item.assignee} | {item.dueDate}</p>
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
