import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Filter, Maximize2, Minimize2, Download
} from 'recharts';
import { Button } from '@/components/ui/button';
import { 
  Filter as FilterIcon, Maximize2 as MaximizeIcon, 
  Minimize2 as MinimizeIcon, Download as DownloadIcon,
  ArrowUpDown, Eye, EyeOff
} from 'lucide-react';

interface InteractiveChartProps {
  data: any[];
  type: string;
  colors?: string[];
  title?: string;
  onExport?: () => void;
}

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#312e81', '#1e1b4b'];

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ 
  data, type, colors = COLORS, title, onExport 
}) => {
  const [sortBy, setSortBy] = useState<'none' | 'asc' | 'desc'>('none');
  const [hiddenItems, setHiddenItems] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const chartData = useMemo(() => {
    let processed = data.map(item => ({
      name: item.label || item.name || '항목',
      value: Number(item.value) || 0,
      original: item
    }));

    // 정렬
    if (sortBy === 'asc') {
      processed = [...processed].sort((a, b) => a.value - b.value);
    } else if (sortBy === 'desc') {
      processed = [...processed].sort((a, b) => b.value - a.value);
    }

    return processed;
  }, [data, sortBy]);

  const visibleData = useMemo(() => {
    return chartData.filter((_, index) => !hiddenItems.has(index));
  }, [chartData, hiddenItems]);

  const toggleItemVisibility = (index: number) => {
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const cycleSortBy = () => {
    setSortBy(prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // CSV 다운로드
      const csvContent = chartData.map(item => `${item.name},${item.value}`).join('\n');
      const blob = new Blob([`항목,값\n${csvContent}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="font-bold text-lg">시각화 데이터가 없습니다.</p>
        <p className="text-sm">메시지 수정을 통해 데이터를 추가해 보세요.</p>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar_chart':
      case 'bar':
        return (
          <BarChart data={visibleData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 600 }}
              cursor={{ fill: '#f1f5f9', radius: 8 }}
              formatter={(value: number) => [value.toLocaleString(), '값']}
            />
            <Bar 
              dataKey="value" 
              fill={colors[0]} 
              radius={[8, 8, 0, 0]} 
              barSize={40}
              onClick={(data) => setSelectedItem(data)}
              cursor="pointer"
            />
          </BarChart>
        );
      case 'line_chart':
      case 'line':
        return (
          <LineChart data={visibleData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 600 }} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={colors[0]} 
              strokeWidth={4} 
              dot={{ r: 6, fill: colors[0], strokeWidth: 3, stroke: '#fff' }} 
              activeDot={{ r: 8, strokeWidth: 0, onClick: (data) => setSelectedItem(data) }}
            />
          </LineChart>
        );
      case 'pie_chart':
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={visibleData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={8}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              onClick={(data) => setSelectedItem(data)}
              cursor="pointer"
            >
              {visibleData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 600 }} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 600, fontSize: '12px', color: '#64748b' }} />
          </PieChart>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-3xl p-8">
            <p className="font-bold">지원되지 않는 차트 유형: {type}</p>
          </div>
        );
    }
  };

  return (
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-8' : 'min-h-[300px]'}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{title || '데이터 차트'}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={cycleSortBy} className="gap-1">
            <ArrowUpDown className="w-3 h-3" />
            {sortBy === 'none' ? '정렬' : sortBy === 'asc' ? '오름차순' : '내림차순'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport} className="gap-1">
            <DownloadIcon className="w-3 h-3" />
            CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <MinimizeIcon className="w-3 h-3" /> : <MaximizeIcon className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* 차트 */}
      <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[300px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* 데이터 항목 토글 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((item, index) => (
          <button
            key={index}
            onClick={() => toggleItemVisibility(index)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              hiddenItems.has(index) 
                ? 'bg-slate-100 text-slate-400 line-through' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: hiddenItems.has(index) ? '#cbd5e1' : colors[index % colors.length] }}
            />
            {item.name}
          </button>
        ))}
      </div>

      {/* 선택된 항목 상세 */}
      {selectedItem && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold">{selectedItem.name}</h4>
            <Button size="sm" variant="ghost" onClick={() => setSelectedItem(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-sm text-slate-600">
            값: <span className="font-bold">{selectedItem.value?.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );
};
