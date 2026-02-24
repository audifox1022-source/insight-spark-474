import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer,
} from 'recharts';
import { SlideChartData } from '@/types/presentation';

const CHART_COLORS = [
  'hsl(200, 80%, 50%)',
  'hsl(152, 60%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 65%, 55%)',
  'hsl(270, 60%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(15, 75%, 55%)',
  'hsl(210, 50%, 60%)',
];

interface SlideChartProps {
  chartData: SlideChartData;
  /** true = inside 1920x1080 ScaledSlide (large text), false = editor preview */
  isSlideView?: boolean;
}

export function SlideChart({ chartData, isSlideView = false }: SlideChartProps) {
  const { chartType, data, title, xAxisLabel, yAxisLabel, series1Label, series2Label, showLegend } = chartData;

  const fontSize = isSlideView ? 28 : 12;
  const titleSize = isSlideView ? 36 : 16;
  const hasSeries2 = data.some((d) => d.value2 !== undefined && d.value2 !== null);

  const coloredData = useMemo(
    () => data.map((d, i) => ({ ...d, fill: d.color || CHART_COLORS[i % CHART_COLORS.length] })),
    [data],
  );

  const commonAxisProps = {
    tick: { fontSize, fill: isSlideView ? 'rgba(255,255,255,0.7)' : 'hsl(220, 10%, 46%)' },
    axisLine: { stroke: isSlideView ? 'rgba(255,255,255,0.2)' : 'hsl(220, 13%, 88%)' },
    tickLine: false,
  };

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: isSlideView ? 'rgba(255,255,255,0.1)' : 'hsl(220, 13%, 92%)',
  };

  const tooltipStyle = {
    contentStyle: {
      background: isSlideView ? 'rgba(0,0,0,0.85)' : 'white',
      border: 'none',
      borderRadius: 12,
      fontSize: isSlideView ? 24 : 12,
      color: isSlideView ? 'white' : 'black',
      padding: isSlideView ? '16px 24px' : '8px 12px',
    },
  };

  const legendProps = {
    wrapperStyle: { fontSize: isSlideView ? 26 : 12 },
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={coloredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...commonAxisProps} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fontSize } : undefined} />
            <YAxis {...commonAxisProps} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize } : undefined} />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
            <Bar dataKey="value" name={series1Label || '값'} radius={[6, 6, 0, 0]} barSize={isSlideView ? 60 : 30}>
              {coloredData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
            {hasSeries2 && (
              <Bar dataKey="value2" name={series2Label || '비교값'} radius={[6, 6, 0, 0]} barSize={isSlideView ? 60 : 30} fill="hsl(152, 60%, 45%)" />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={coloredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
            <Line type="monotone" dataKey="value" name={series1Label || '값'} stroke={CHART_COLORS[0]} strokeWidth={isSlideView ? 5 : 2} dot={{ r: isSlideView ? 8 : 4 }} />
            {hasSeries2 && (
              <Line type="monotone" dataKey="value2" name={series2Label || '비교값'} stroke={CHART_COLORS[1]} strokeWidth={isSlideView ? 5 : 2} dot={{ r: isSlideView ? 8 : 4 }} />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={coloredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
            <defs>
              <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" name={series1Label || '값'} stroke={CHART_COLORS[0]} fill="url(#areaGrad1)" strokeWidth={isSlideView ? 4 : 2} />
            {hasSeries2 && (
              <Area type="monotone" dataKey="value2" name={series2Label || '비교값'} stroke={CHART_COLORS[1]} fill="url(#areaGrad2)" strokeWidth={isSlideView ? 4 : 2} />
            )}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={coloredData}
              cx="50%"
              cy="50%"
              outerRadius={isSlideView ? 280 : 120}
              innerRadius={isSlideView ? 140 : 60}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: isSlideView ? 'rgba(255,255,255,0.5)' : 'hsl(220, 10%, 60%)' }}
              fontSize={fontSize}
            >
              {coloredData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {title && (
        <div className={`text-center font-semibold mb-2 ${isSlideView ? 'text-white/80' : 'text-foreground'}`}
          style={{ fontSize: titleSize }}>
          {title}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() || <div />}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 기본 차트 데이터 템플릿 */
export function getDefaultChartData(chartType: SlideChartData['chartType'] = 'bar'): SlideChartData {
  return {
    chartType,
    title: '',
    data: [
      { name: '항목 1', value: 40 },
      { name: '항목 2', value: 65 },
      { name: '항목 3', value: 50 },
      { name: '항목 4', value: 80 },
      { name: '항목 5', value: 55 },
    ],
    showLegend: true,
    series1Label: '값',
  };
}
