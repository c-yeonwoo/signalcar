export function Sparkline({
  values,
  color = "#2e6bff",
  width = 120,
  height = 40,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${pts.join(" L")}`;
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const lastX = (values.length - 1) * stepX;
  const lastY = height - ((values[values.length - 1] - min) / range) * height;
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
      <circle cx={lastX} cy={lastY} r="6" fill={color} fillOpacity="0.2" />
    </svg>
  );
}