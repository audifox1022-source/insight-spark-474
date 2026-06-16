import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface ChartProps {
  data: any[];
  type: string;
  colors?: string[];
}

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#312e81', '#1e1b4b'];

export const ChartRenderer: React.FC<ChartProps> = ({ data, type, colors = COLORS }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="font-bold text-lg">시각화 데이터가 없습니다.</p>
        <p className="text-sm">메시지 수정을 통해 데이터를 추가해 보세요.</p>
      </div>
    );
  }

  // 데이터 정규화 (label/name과 value가 있는지 확인)
  const chartData = data.map(item => {
    const rawValue = item.value ?? item.amount ?? item.count ?? item.score ?? item.result ?? item.total ?? 0;
    const numValue = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/,/g, ''));
    return {
      name: item.label || item.name || '항목',
      value: Number.isFinite(numValue) ? numValue : 0
    };
  });

  const renderChart = () => {
    switch (type) {
      case 'bar_chart':
      case 'bar':
        return (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 600 }}
              cursor={{ fill: '#f1f5f9', radius: 8 }}
            />
            <Bar dataKey="value" fill={colors[0]} radius={[8, 8, 0, 0]} barSize={40} />
          </BarChart>
        );
      case 'line_chart':
      case 'line':
        return (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
              activeDot={{ r: 8, strokeWidth: 0 }} 
            />
          </LineChart>
        );
      case 'pie_chart':
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={8}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((_entry, index) => (
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
    <div className="w-full h-full min-h-[300px] animate-in fade-in zoom-in-95 duration-700">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
