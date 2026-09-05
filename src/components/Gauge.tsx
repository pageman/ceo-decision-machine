/** Generic SVG semicircle gauge with colored zones (payback, fragility). */
export interface GaugeZone {
  upTo: number; // zone upper bound on the value axis
  color: string;
}

export function Gauge({
  value,
  max,
  zones,
  label,
  displayValue,
}: {
  value: number;
  max: number;
  zones: GaugeZone[];
  label: string;
  displayValue: string;
}) {
  const clamped = Math.min(max, Math.max(0, value));
  const angle = (clamped / max) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 100;
  const cy = 95;
  const r = 78;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  const arcFor = (from: number, to: number, color: string, key: number) => {
    const a0 = ((180 - (from / max) * 180) * Math.PI) / 180;
    const a1 = ((180 - (to / max) * 180) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const large = to - from > max / 2 ? 1 : 0;
    return (
      <path
        key={key}
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
        stroke={color}
        strokeWidth={14}
        fill="none"
        strokeLinecap="butt"
      />
    );
  };

  let prev = 0;
  const arcs = zones.map((z, i) => {
    const arc = arcFor(prev, Math.min(z.upTo, max), z.color, i);
    prev = Math.min(z.upTo, max);
    return arc;
  });

  return (
    <svg viewBox="0 0 200 110" className="chart" role="img" aria-label={`${label}: ${displayValue}`}>
      {arcs}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="var(--text)" />
      <text x={cx} y={108} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 700 }}>
        {displayValue}
      </text>
    </svg>
  );
}
