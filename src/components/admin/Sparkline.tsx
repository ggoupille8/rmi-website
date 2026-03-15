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
  // Filter out NaN/undefined values
  const clean = data.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;

  const padding = 1;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const centerY = padding + h / 2;

  // Single data point: render a flat line with an end dot
  if (clean.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="inline-block align-middle"
        aria-hidden="true"
      >
        <line
          x1={padding}
          y1={centerY}
          x2={width - padding}
          y2={centerY}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.4}
        />
        <circle cx={width - padding} cy={centerY} r={2} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min;

  // Map data points to SVG coordinates
  // When all values are equal, draw a flat line at center height
  const points = clean.map((val, i) => ({
    x: padding + (i / (clean.length - 1)) * w,
    y: range === 0
      ? centerY
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
