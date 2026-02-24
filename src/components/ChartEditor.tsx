import { useState } from 'react';
import { SlideChartData, ChartType, ChartDataPoint } from '@/types/presentation';
import { SlideChart, getDefaultChartData } from '@/components/SlideChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, X, BarChart3, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon } from 'lucide-react';

interface ChartEditorProps {
  chartData?: SlideChartData;
  onChange: (chartData: SlideChartData | undefined) => void;
}

const chartTypeOptions: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'bar', label: '막대', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'line', label: '라인', icon: <LineIcon className="w-4 h-4" /> },
  { value: 'area', label: '영역', icon: <AreaIcon className="w-4 h-4" /> },
  { value: 'pie', label: '파이', icon: <PieIcon className="w-4 h-4" /> },
];

export function ChartEditor({ chartData, onChange }: ChartEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!chartData);

  const handleAddChart = () => {
    onChange(getDefaultChartData('bar'));
    setIsExpanded(true);
  };

  const handleRemoveChart = () => {
    onChange(undefined);
    setIsExpanded(false);
  };

  const update = (updates: Partial<SlideChartData>) => {
    if (!chartData) return;
    onChange({ ...chartData, ...updates });
  };

  const updateDataPoint = (index: number, updates: Partial<ChartDataPoint>) => {
    if (!chartData) return;
    const newData = [...chartData.data];
    newData[index] = { ...newData[index], ...updates };
    onChange({ ...chartData, data: newData });
  };

  const addDataPoint = () => {
    if (!chartData) return;
    onChange({
      ...chartData,
      data: [...chartData.data, { name: `항목 ${chartData.data.length + 1}`, value: 0 }],
    });
  };

  const removeDataPoint = (index: number) => {
    if (!chartData) return;
    onChange({ ...chartData, data: chartData.data.filter((_, i) => i !== index) });
  };

  if (!chartData) {
    return (
      <button
        onClick={handleAddChart}
        className="w-full rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-8"
      >
        <BarChart3 className="w-4 h-4" /> 차트 추가
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart type selector & controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {chartTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ chartType: opt.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chartData.chartType === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="chart-legend" className="text-xs text-muted-foreground">범례</Label>
          <Switch
            id="chart-legend"
            checked={chartData.showLegend ?? true}
            onCheckedChange={(v) => update({ showLegend: v })}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleRemoveChart} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs">
          <X className="w-3 h-3 mr-1" /> 차트 제거
        </Button>
      </div>

      {/* Series labels */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">시리즈 1 라벨</label>
          <Input
            value={chartData.series1Label || ''}
            onChange={(e) => update({ series1Label: e.target.value })}
            placeholder="값"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">시리즈 2 라벨 (선택)</label>
          <Input
            value={chartData.series2Label || ''}
            onChange={(e) => update({ series2Label: e.target.value })}
            placeholder="비교값"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Data points */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">데이터 항목</span>
          <Button size="sm" variant="ghost" onClick={addDataPoint} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
            <Plus className="w-3 h-3" /> 추가
          </Button>
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {chartData.data.map((point, i) => (
            <div key={i} className="flex items-center gap-2 group/row rounded-lg px-2 py-1 hover:bg-muted/40 transition-colors">
              <span className="text-[10px] text-muted-foreground w-5 text-center font-mono">{i + 1}</span>
              <Input
                value={point.name}
                onChange={(e) => updateDataPoint(i, { name: e.target.value })}
                placeholder="이름"
                className="h-7 text-xs flex-1 min-w-0"
              />
              <Input
                type="number"
                value={point.value}
                onChange={(e) => updateDataPoint(i, { value: parseFloat(e.target.value) || 0 })}
                placeholder="값"
                className="h-7 text-xs w-20"
              />
              <Input
                type="number"
                value={point.value2 ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  updateDataPoint(i, { value2: v === '' ? undefined : parseFloat(v) || 0 });
                }}
                placeholder="값2"
                className="h-7 text-xs w-20"
              />
              <button
                onClick={() => removeDataPoint(i)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-all flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-muted/30 p-4" style={{ height: 250 }}>
        <SlideChart chartData={chartData} isSlideView={false} />
      </div>
    </div>
  );
}
