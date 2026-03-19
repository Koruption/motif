<script lang="ts">
  import { LineChart } from "layerchart";
  import { curveLinearClosed } from "d3-shape";
  import { scaleBand } from "d3-scale";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import type { RadarChartProps } from "./types";

  let { chartProps } = $props<{ chartProps: RadarChartProps }>();
</script>

<section>
  <Chart.Container
    config={Object.fromEntries(
      chartProps.series.map((series: RadarChartProps["series"][number]) => [
        series.key,
        { label: series.label, color: series.color },
      ]),
    ) satisfies Chart.ChartConfig}
    class="mx-auto aspect-square max-h-[250px]"
  >
    <LineChart
      data={chartProps.chartData}
      series={[...chartProps.series]}
      radial
      x="label"
      xScale={scaleBand()}
      points={{ r: 4 }}
      padding={12}
      props={{
        spline: {
          curve: curveLinearClosed,
          fill: `var(--color-${chartProps.series[0]?.key ?? "value"})`,
          fillOpacity: 0.6,
          stroke: `var(--color-${chartProps.series[0]?.key ?? "value"})`,
          motion: "tween",
        },
        xAxis: {
          tickLength: 0,
        },
        yAxis: {
          format: () => "",
        },
        grid: {
          radialY: "linear",
        },
        tooltip: {
          context: {
            mode: "voronoi",
          },
        },
        highlight: {
          lines: false,
          points: false,
        },
      }}
    >
      {#snippet tooltip()}
        <Chart.Tooltip />
      {/snippet}
    </LineChart>
  </Chart.Container>
</section>
