import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Label } from 'recharts';
import { SlideChartData } from '@/types/presentation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X } from 'lucide-react'; // 💡 X 아이콘 import 추가됨!

interface ChartEditorProps {
  chartData?: SlideChartData;
  onChange: (data: SlideChartData | undefined) => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export function ChartEditor({ chartData, onChange }: ChartEditorProps) {
  if (!chartData) {
    return (
      <Button
        variant="outline"
        className="w-full h-32 border-dashed flex flex-col gap-2"
        onClick={() => onChange({
          chartType: 'bar',
          title: '새 차트',
          data: [{ name: '항목 1', value: 100 }],
          xAxisLabel: '구분',
          yAxisLabel: '수치 (단위)',
        })}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm font-medium">차트 추가하기</span>
      </Button>
    );
  }

  // 차트 여백 대폭 증가 (왼쪽, 아래쪽 확보)
  const chartMargin = { top: 30, right: 30, left: 50, bottom: 40 };

  const renderChart = () => {
    switch (chartData.chartType) {
      case 'line':
        return (
          <LineChart data={chartData.data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={10}>
              {chartData.xAxisLabel && (
                <Label value={chartData.xAxisLabel} offset={-20} position="insideBottom" style={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </XAxis>
            <YAxis width={80} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={5}>
              {chartData.yAxisLabel && (
                <Label value={chartData.yAxisLabel} angle={-90} position="insideLeft" offset={-25} style={{ textAnchor: 'middle', fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {chartData.showLegend && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
            <Line type="monotone" dataKey="value" name={chartData.series1Label || 'Value'} stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            {chartData.data.some(d => d.value2 !== undefined) && (
              <Line type="monotone" dataKey="value2" name={chartData.series2Label || 'Value 2'} stroke={COLORS[1]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            {chartData.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            <Pie
              data={chartData.data}
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            >
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData.data} margin={chartMargin}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={10}>
              {chartData.xAxisLabel && (
                <Label value={chartData.xAxisLabel} offset={-20} position="insideBottom" style={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </XAxis>
            <YAxis width={80} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={5}>
              {chartData.yAxisLabel && (
                <Label value={chartData.yAxisLabel} angle={-90} position="insideLeft" offset={-25} style={{ textAnchor: 'middle', fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            />
            {chartData.showLegend && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
            <Area type="monotone" dataKey="value" name={chartData.series1Label || 'Value'} stroke={COLORS[0]} fillOpacity={1} fill="url(#colorUv)" strokeWidth={2} />
            {chartData.data.some(d => d.value2 !== undefined) && (
              <Area type="monotone" dataKey="value2" name={chartData.series2Label || 'Value 2'} stroke={COLORS[1]} fillOpacity={0.3} fill={COLORS[1]} strokeWidth={2} />
            )}
          </AreaChart>
        );
      default: // bar
        return (
          <BarChart data={chartData.data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={10}>
              {chartData.xAxisLabel && (
                <Label value={chartData.xAxisLabel} offset={-20} position="insideBottom" style={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </XAxis>
            <YAxis width={80} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickMargin={5}>
              {chartData.yAxisLabel && (
                <Label value={chartData.yAxisLabel} angle={-90} position="insideLeft" offset={-25} style={{ textAnchor: 'middle', fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 600 }} />
              )}
            </YAxis>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
            />
            {chartData.showLegend && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
            <Bar dataKey="value" name={chartData.series1Label || 'Value'} fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={60} />
            {chartData.data.some(d => d.value2 !== undefined) && (
              <Bar dataKey="value2" name={chartData.series2Label || 'Value 2'} fill={COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={60} />
            )}
          </BarChart>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 차트 미리보기 */}
      <div className="p-4 rounded-xl border border-border bg-card/50">
        <h4 className="text-center font-bold text-lg mb-4 text-foreground">{chartData.title}</h4>
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 차트 편집 폼 */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">데이터 편집</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)} className="h-7 text-xs text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> 차트 삭제
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">차트 종류</label>
            <Select
              value={chartData.chartType}
              onValueChange={(v) => onChange({ ...chartData, chartType: v as any })}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">막대 차트 (Bar)</SelectItem>
                <SelectItem value="line">선 차트 (Line)</SelectItem>
                <SelectItem value="area">영역 차트 (Area)</SelectItem>
                <SelectItem value="pie">파이 차트 (Pie)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">차트 제목</label>
            <Input
              value={chartData.title}
              onChange={(e) => onChange({ ...chartData, title: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          {chartData.chartType !== 'pie' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">X축 라벨</label>
                <Input
                  value={chartData.xAxisLabel || ''}
                  onChange={(e) => onChange({ ...chartData, xAxisLabel: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Y축 라벨</label>
                <Input
                  value={chartData.yAxisLabel || ''}
                  onChange={(e) => onChange({ ...chartData, yAxisLabel: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">데이터 항목</span>
            <Button
              size="sm" variant="outline"
              onClick={() => onChange({ ...chartData, data: [...chartData.data, { name: '새 항목', value: 0 }] })}
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="w-3 h-3 mr-1" /> 항목 추가
            </Button>
          </div>
          
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
            {chartData.data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const newData = [...chartData.data];
                    newData[index] = { ...item, name: e.target.value };
                    onChange({ ...chartData, data: newData });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder="항목명"
                />
                <Input
                  type="number"
                  value={item.value}
                  onChange={(e) => {
                    const newData = [...chartData.data];
                    newData[index] = { ...item, value: Number(e.target.value) };
                    onChange({ ...chartData, data: newData });
                  }}
                  className="h-8 text-sm w-24"
                  placeholder="값 1"
                />
                {item.value2 !== undefined && (
                  <Input
                    type="number"
                    value={item.value2}
                    onChange={(e) => {
                      const newData = [...chartData.data];
                      newData[index] = { ...item, value2: Number(e.target.value) };
                      onChange({ ...chartData, data: newData });
                    }}
                    className="h-8 text-sm w-24"
                    placeholder="값 2"
                  />
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={() => {
                    const newData = chartData.data.filter((_, i) => i !== index);
                    onChange({ ...chartData, data: newData });
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
