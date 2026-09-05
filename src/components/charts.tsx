import type { LeverageResult, SobolResult } from '../types';
import { formatCents } from './Money';
import { useAppStore } from '../store';

const PARAM_LABEL: Record<string, string> = {
  N: 'Seats (N)',
  A: 'ARPU (A)',
  C: 'Churn (C)',
};

/** Horizontal bar chart of first-order Sobol indices with 95% CI whiskers. */
export function SobolBarChart({ sobol }: { sobol: SobolResult }) {
  const w = 560;
  const rowH = 52;
  const padL = 90;
  const padR = 30;
  const barMax = w - padL - padR;
  const h = sobol.indices.length * rowH + 30;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Sobol first-order indices">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={padL + t * barMax}
            y1={8}
            x2={padL + t * barMax}
            y2={h - 22}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <text x={padL + t * barMax} y={h - 8} textAnchor="middle">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      {sobol.indices.map((ix, i) => {
        const y = 14 + i * rowH;
        const bw = ix.firstOrder * barMax;
        const ciX0 = padL + ix.firstOrderCI[0] * barMax;
        const ciX1 = padL + ix.firstOrderCI[1] * barMax;
        return (
          <g key={ix.name}>
            <text x={padL - 8} y={y + 15} textAnchor="end" style={{ fill: 'var(--text)' }}>
              {PARAM_LABEL[ix.name] ?? ix.name}
            </text>
            <rect x={padL} y={y} width={Math.max(2, bw)} height={22} rx={4} fill="var(--accent)" />
            <line x1={ciX0} y1={y + 11} x2={ciX1} y2={y + 11} stroke="var(--text)" strokeWidth={2} />
            <line x1={ciX0} y1={y + 5} x2={ciX0} y2={y + 17} stroke="var(--text)" strokeWidth={2} />
            <line x1={ciX1} y1={y + 5} x2={ciX1} y2={y + 17} stroke="var(--text)" strokeWidth={2} />
            <text x={padL + bw + 8} y={y + 15} style={{ fill: 'var(--text)', fontWeight: 700 }}>
              {ix.firstOrder.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const DONUT_COLORS = ['#38bdf8', '#818cf8', '#f59e0b', '#64748b'];

/** Variance decomposition donut. */
export function VarianceDonut({ sobol }: { sobol: SobolResult }) {
  const total = sobol.indices.reduce((acc, ix) => acc + ix.firstOrder, 0) || 1;
  const cx = 80;
  const cy = 80;
  const r = 62;
  const ir = 38;
  let angle = -Math.PI / 2;
  const slices = sobol.indices.map((ix, i) => {
    const frac = ix.firstOrder / total;
    const a0 = angle;
    const a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const large = frac > 0.5 ? 1 : 0;
    const p = (rr: number, a: number) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
    return (
      <path
        key={ix.name}
        d={`M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(ir, a1)} A ${ir} ${ir} 0 ${large} 0 ${p(ir, a0)} Z`}
        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
      />
    );
  });
  return (
    <div>
      <svg viewBox="0 0 160 160" className="chart" role="img" aria-label="Variance decomposition">
        {slices}
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 13, fontWeight: 700 }}>
          Var(Y)
        </text>
      </svg>
      <div className="legend">
        {sobol.indices.map((ix, i) => (
          <span className="legend-item" key={ix.name}>
            <span className="swatch" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            {PARAM_LABEL[ix.name] ?? ix.name} {(100 * (ix.firstOrder / total)).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** First-order vs total-order grouped bars (interaction check). */
export function OrderComparisonBars({ sobol }: { sobol: SobolResult }) {
  const w = 560;
  const rowH = 56;
  const padL = 90;
  const padR = 30;
  const barMax = w - padL - padR;
  const h = sobol.indices.length * rowH + 20;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="First vs total order indices">
        {sobol.indices.map((ix, i) => {
          const y = 10 + i * rowH;
          return (
            <g key={ix.name}>
              <text x={padL - 8} y={y + 24} textAnchor="end" style={{ fill: 'var(--text)' }}>
                {PARAM_LABEL[ix.name] ?? ix.name}
              </text>
              <rect x={padL} y={y} width={Math.max(2, ix.firstOrder * barMax)} height={18} rx={3} fill="var(--accent)" />
              <rect x={padL} y={y + 22} width={Math.max(2, ix.totalOrder * barMax)} height={18} rx={3} fill="var(--amber)" />
              <text x={padL + ix.firstOrder * barMax + 6} y={y + 13}>{ix.firstOrder.toFixed(2)}</text>
              <text x={padL + ix.totalOrder * barMax + 6} y={y + 35}>{ix.totalOrder.toFixed(2)}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span className="legend-item">
          <span className="swatch" style={{ background: 'var(--accent)' }} /> First-order S_i
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: 'var(--amber)' }} /> Total-order S_Ti
        </span>
      </div>
    </div>
  );
}

/** Sensitivity surface heatmap: alpha (x) × S_N (y) → E[ΔY]. */
export function SurfaceHeatmap({ surface }: { surface: LeverageResult['surface'] }) {
  const settings = useAppStore((s) => s.settings);
  const alphas = [...new Set(surface.map((p) => p.alpha))].sort((a, b) => a - b);
  const sNs = [...new Set(surface.map((p) => p.sN))].sort((a, b) => a - b);
  const maxImpact = Math.max(1, ...surface.map((p) => p.impactCents));
  const cellW = 19;
  const cellH = 14;
  const padL = 44;
  const padB = 28;
  const w = padL + alphas.length * cellW + 10;
  const h = sNs.length * cellH + padB + 10;
  const lookup = new Map(surface.map((p) => [`${p.alpha}|${p.sN}`, p.impactCents]));
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Sensitivity surface">
        {sNs.map((sN, yi) =>
          alphas.map((alpha, xi) => {
            const impact = lookup.get(`${alpha}|${sN}`) ?? 0;
            const t = impact / maxImpact;
            return (
              <rect
                key={`${xi}-${yi}`}
                x={padL + xi * cellW}
                y={(sNs.length - 1 - yi) * cellH + 4}
                width={cellW - 1}
                height={cellH - 1}
                fill={`rgba(56, 189, 248, ${0.06 + 0.9 * t})`}
              />
            );
          }),
        )}
        <text x={padL - 6} y={16} textAnchor="end" transform={`rotate(-90 ${padL - 6} 16)`}>
          S_N →
        </text>
        {sNs.map((sN, yi) =>
          yi % 5 === 0 ? (
            <text key={sN} x={padL - 6} y={(sNs.length - 1 - yi) * cellH + 14} textAnchor="end">
              {sN.toFixed(1)}
            </text>
          ) : null,
        )}
        {alphas.map((alpha, xi) =>
          xi % 6 === 0 ? (
            <text key={alpha} x={padL + xi * cellW + cellW / 2} y={h - 12} textAnchor="middle">
              {alpha.toFixed(0)}
            </text>
          ) : null,
        )}
        <text x={padL + (alphas.length * cellW) / 2} y={h - 1} textAnchor="middle">
          α (seat multiplier) →
        </text>
      </svg>
      <div className="legend">
        <span className="legend-item">
          Peak impact: {formatCents(maxImpact, settings)} (dark → bright = low → high E[ΔY])
        </span>
      </div>
    </div>
  );
}

/** Payback distribution histogram (months). */
export function PaybackHistogram({
  bins,
}: {
  bins: { binStartMonths: number; binEndMonths: number; count: number }[];
}) {
  const w = 560;
  const h = 180;
  const padB = 24;
  const padL = 44;
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const barW = (w - padL) / bins.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Payback histogram">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line
            x1={padL}
            y1={10 + (1 - t) * (h - padB - 16)}
            x2={w - 4}
            y2={10 + (1 - t) * (h - padB - 16)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <text x={padL - 6} y={14 + (1 - t) * (h - padB - 16)} textAnchor="end">
            {Math.round(t * maxCount)}
          </text>
        </g>
      ))}
      {bins.map((b, i) => {
        const bh = (b.count / maxCount) * (h - padB - 16);
        const inGreen = b.binEndMonths <= 24;
        const inAmber = b.binEndMonths <= 36;
        return (
          <g key={i}>
            <rect
              x={padL + i * barW + 1}
              y={10 + (h - padB - 16) - bh}
              width={barW - 2}
              height={Math.max(0, bh)}
              fill={inGreen ? 'var(--green)' : inAmber ? 'var(--amber)' : 'var(--red)'}
              rx={2}
            />
            {i % 4 === 0 ? (
              <text x={padL + i * barW + barW / 2} y={h - 8} textAnchor="middle">
                {b.binStartMonths.toFixed(0)}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={padL + (w - padL) / 2} y={h - 0} textAnchor="middle" style={{ fontSize: 10 }}>
        payback months (green &lt;24, amber &lt;36)
      </text>
    </svg>
  );
}
