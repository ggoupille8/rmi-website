/**
 * Tiny inline SVG sparkline for KPI cards.
 * No external dependencies — pure SVG path rendering.
 */

interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** SVG width in pixels */
  width?: number;
  /** SVG height in pixels */
  height?: number;
  /** Stroke color (CSS color string) */
  color?: string;
  /** Whether to show a subtle fill under the line */
  fill?: boolean;
}

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#60a5fa",
  fill = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 1;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // Map data points to SVG coordinates
  // When all values are equal, draw a flat line at center height
  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * w,
    y: range === 0
      ? padding + h / 2
      : padding + h - ((val - min) / range) * h,
  }));

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Fill path (closes to bottom)
  const fillPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle"
      aria-hidden="true"
    >
      {fill && (
        <path
          d={fillPath}
          fill={color}
          opacity={0.1}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={color}
      />
    </svg>
  );
}
