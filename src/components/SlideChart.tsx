import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList,
  ResponsiveContainer,
} from 'recharts';
import { SlideChartData } from '@/types/presentation';

function getThemeChartColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return Array.from({ length: 8 }, (_, i) => {
    const raw = style.getPropertyValue(`--chart-${i + 1}`).trim();
    return raw ? `hsl(${raw})` : `hsl(${200 + i * 25}, 60%, 50%)`;
  });
}

interface SlideChartProps {
  chartData: SlideChartData;
  /** true = inside 1920x1080 ScaledSlide (large text), false = editor preview */
  isSlideView?: boolean;
}

export function SlideChart({ chartData, isSlideView = false }: SlideChartProps) {
  const { chartType, data, title, xAxisLabel, yAxisLabel, series1Label, series2Label, showLegend } = chartData;

  const fontSize = isSlideView ? 22 : 12; 
  const titleSize = isSlideView ? 36 : 16;
  const hasSeries2 = data.some((d) => d.value2 !== undefined && d.value2 !== null);

  const CHART_COLORS = useMemo(() => getThemeChartColors(), []);

  const coloredData = useMemo(
    () => data.map((d, i) => ({ ...d, fill: d.color || CHART_COLORS[i % CHART_COLORS.length] })),
    [data, CHART_COLORS],
  );

  // ✨ [핵심 수정] 글자가 흰색 배경에 묻히지 않도록 진한 회색(#334155)으로 고정!
  const TEXT_COLOR = '#334155';
  const GRID_COLOR = '#e2e8f0';

  const commonAxisProps = {
    tick: { fontSize, fill: TEXT_COLOR, fontWeight: 600 },
    axisLine: { stroke: '#cbd5e1' },
    tickLine: false,
  };

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: GRID_COLOR,
    vertical: false, // 가로선만 렌더링해서 더 깔끔하게
  };

  const tooltipStyle = {
    contentStyle: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #cbd5e1',
      borderRadius: 12,
      fontSize: isSlideView ? 24 : 12,
      color: TEXT_COLOR,
      fontWeight: 'bold',
      padding: isSlideView ? '16px 24px' : '8px 12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    itemStyle: { color: TEXT_COLOR }
  };

  const legendProps = {
    wrapperStyle: { fontSize: isSlideView ? 22 : 12, fontWeight: 'bold', color: TEXT_COLOR, paddingTop: '10px' },
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={coloredData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...commonAxisProps} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fontSize, fill: TEXT_COLOR } : undefined} />
            <YAxis {...commonAxisProps} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize, fill: TEXT_COLOR } : undefined} />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
            <Bar dataKey="value" name={series1Label || '값'} radius={[6, 6, 0, 0]} barSize={isSlideView ? 60 : 30}>
              {coloredData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              {/* ✨ 막대 위에 수치 표시 추가 */}
              <LabelList dataKey="value" position="top" fill={TEXT_COLOR} fontSize={fontSize} fontWeight="bold" />
            </Bar>
            {hasSeries2 && (
              <Bar dataKey="value2" name={series2Label || '비교값'} radius={[6, 6, 0, 0]} barSize={isSlideView ? 60 : 30} fill="hsl(152, 60%, 45%)">
                <LabelList dataKey="value2" position="top" fill={TEXT_COLOR} fontSize={fontSize} fontWeight="bold" />
              </Bar>
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={coloredData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend {...legendProps} />}
            <Line type="monotone" dataKey="value" name={series1Label || '값'} stroke={CHART_COLORS[0]} strokeWidth={isSlideView ? 5 : 2} dot={{ r: isSlideView ? 8 : 4 }}>
               <LabelList dataKey="value" position="top" fill={TEXT_COLOR} fontSize={fontSize} fontWeight="bold" offset={15} />
            </Line>
            {hasSeries2 && (
              <Line type="monotone" dataKey="value2" name={series2Label || '비교값'} stroke={CHART_COLORS[1]} strokeWidth={isSlideView ? 5 : 2} dot={{ r: isSlideView ? 8 : 4 }}>
                 <LabelList dataKey="value2" position="top" fill={TEXT_COLOR} fontSize={fontSize} fontWeight="bold" offset={15} />
              </Line>
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={coloredData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
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
              labelLine={{ stroke: '#94a3b8' }}
              fontSize={fontSize}
              fontWeight="bold"
              fill={TEXT_COLOR}
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
        <div className="text-center font-bold mb-4"
          style={{ fontSize: titleSize, color: TEXT_COLOR }}>
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
