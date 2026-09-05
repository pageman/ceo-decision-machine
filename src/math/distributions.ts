/** Distribution samplers for the Monte Carlo layers. All take an Rng (see rng.ts). */
import type { Rng } from './rng';

export function sampleUniform(rng: Rng, low: number, high: number): number {
  return low + (high - low) * rng();
}

/** Box-Muller standard normal. */
export function sampleStandardNormal(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export function sampleLogNormal(rng: Rng, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * sampleStandardNormal(rng));
}

/** Rejection-sampled truncated normal; falls back to the clamped mean after 1000 misses. */
export function sampleTruncatedNormal(
  rng: Rng,
  mu: number,
  sigma: number,
  min: number,
  max: number,
): number {
  for (let i = 0; i < 1000; i++) {
    const x = mu + sigma * sampleStandardNormal(rng);
    if (x >= min && x <= max) return x;
  }
  return Math.min(max, Math.max(min, mu));
}

/** Marsaglia & Tsang gamma sampler (shape > 0, scale 1). */
function sampleGamma(rng: Rng, shape: number): number {
  if (shape < 1) {
    return sampleGamma(rng, shape + 1) * Math.pow(rng(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = sampleStandardNormal(rng);
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(rng: Rng, alpha: number, beta: number): number {
  const x = sampleGamma(rng, alpha);
  const y = sampleGamma(rng, beta);
  return x + y === 0 ? 0.5 : x / (x + y);
}

export function sampleTriangular(rng: Rng, low: number, mode: number, high: number): number {
  if (high <= low) return low;
  const clampedMode = Math.min(high, Math.max(low, mode));
  const u = rng();
  const fc = (clampedMode - low) / (high - low);
  if (u < fc) return low + Math.sqrt(u * (high - low) * (clampedMode - low));
  return high - Math.sqrt((1 - u) * (high - low) * (high - clampedMode));
}
