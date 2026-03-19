export type RadarChartData = {
  label: string;
} & Record<string, number | string>;

export type RadarChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type RadarChartProps = {
  chartData: RadarChartData[];
  series: RadarChartSeries[];
};
