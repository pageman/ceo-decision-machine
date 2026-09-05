/**
 * Sobol sensitivity engine — Saltelli (2010) sampling scheme (paper ref [12]).
 * Model (seat-ladder core): Y = N × A × (1 − c).
 * Other geometry families reuse the same 3-factor structure as an approximation:
 * N is the volume driver, A the monetization driver, C the loss driver.
 */
import type { Company, GeometryFamily, SobolIndexEstimate, SobolResult } from '../types';
import { defaultRng, type Rng } from './rng';
import { sampleBeta, sampleLogNormal, sampleTruncatedNormal } from './distributions';

const MODEL_VERSION = 'mvp-0.1';
const PARAM_NAMES = ['N', 'A', 'C'] as const;

interface Priors {
  muN: number;
  sigmaN: number;
  muA: number;
  sigmaA: number;
  minA: number;
  maxA: number;
  alphaC: number;
  betaC: number;
}

function priorsFromCompany(company: Company): Priors {
  const seats = Math.max(company.seatCount, 1);
  const arpu = Math.max(company.arpuCents, 1);
  const tierPrices = company.pricingTiers
    .map((t) => t.priceCents)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const minA = tierPrices.length > 0 ? tierPrices[0] : 0.5 * arpu;
  const maxA = tierPrices.length > 0 ? tierPrices[tierPrices.length - 1] : 2 * arpu;
  // sigma_N = 0.45: log-scale growth volatility typical for early-stage SaaS.
  const meanC = Math.min(0.5, Math.max(0.005, company.churnRate));
  const k = 50;
  return {
    muN: Math.log(seats),
    sigmaN: 0.45,
    muA: arpu,
    sigmaA: 0.15 * arpu,
    minA,
    maxA: Math.max(maxA, minA + 1),
    alphaC: meanC * k,
    betaC: (1 - meanC) * k,
  };
}

function sampleInputs(rng: Rng, p: Priors): [number, number, number] {
  return [
    sampleLogNormal(rng, p.muN, p.sigmaN),
    sampleTruncatedNormal(rng, p.muA, p.sigmaA, p.minA, p.maxA),
    sampleBeta(rng, p.alphaC, p.betaC),
  ];
}

const model = (n: number, a: number, c: number): number => n * a * (1 - c);

function variance(xs: Float64Array): number {
  const n = xs.length;
  if (n < 2) return 0;
  let mean = 0;
  for (const x of xs) mean += x;
  mean /= n;
  let v = 0;
  for (const x of xs) v += (x - mean) * (x - mean);
  return v / n;
}

function firstOrderAt(
  idx: Int32Array,
  yA: Float64Array,
  yB: Float64Array,
  yCi: Float64Array,
  varY: number,
): number {
  let acc = 0;
  const n = idx.length;
  for (let j = 0; j < n; j++) {
    const r = idx[j];
    acc += yB[r] * (yCi[r] - yA[r]);
  }
  return varY > 0 ? acc / n / varY : 0;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Computes first- and total-order Sobol indices with bootstrap 95% CIs.
 * Deterministic for a fixed seed.
 */
export function computeSobol(
  company: Company,
  geometry: GeometryFamily,
  seed?: number,
  baseSampleSize = 4096,
): SobolResult {
  const rng = defaultRng(seed);
  const priors = priorsFromCompany(company);
  const k = 3;
  const n = Math.max(256, baseSampleSize);

  const yA = new Float64Array(n);
  const yB = new Float64Array(n);
  const yC: Float64Array[] = Array.from({ length: k }, () => new Float64Array(n));

  for (let j = 0; j < n; j++) {
    const xA = sampleInputs(rng, priors);
    const xB = sampleInputs(rng, priors);
    yA[j] = model(...xA);
    yB[j] = model(...xB);
    for (let i = 0; i < k; i++) {
      const xCi: [number, number, number] = [...xA];
      xCi[i] = xB[i];
      yC[i][j] = model(...xCi);
    }
  }

  const varY = variance(yA);

  // Point estimates (Saltelli 2010 estimators).
  const allIdx = new Int32Array(n);
  for (let j = 0; j < n; j++) allIdx[j] = j;

  const sFirst: number[] = [];
  const sTotal: number[] = [];
  for (let i = 0; i < k; i++) {
    sFirst.push(firstOrderAt(allIdx, yA, yB, yC[i], varY));
    let acc = 0;
    for (let j = 0; j < n; j++) acc += (yA[j] - yC[i][j]) * (yA[j] - yC[i][j]);
    sTotal.push(varY > 0 ? acc / n / (2 * varY) : 0);
  }

  // Bootstrap 95% CIs for first-order indices.
  const bootReps = 200;
  const bootSize = Math.min(1024, n);
  const boots: number[][] = Array.from({ length: k }, () => []);
  const resampleIdx = new Int32Array(bootSize);
  for (let b = 0; b < bootReps; b++) {
    for (let j = 0; j < bootSize; j++) resampleIdx[j] = Math.floor(rng() * n);
    for (let i = 0; i < k; i++) {
      boots[i].push(firstOrderAt(resampleIdx, yA, yB, yC[i], varY));
    }
  }
  for (const arr of boots) arr.sort((a, b) => a - b);
  const pct = (arr: number[], p: number): number =>
    arr[Math.min(arr.length - 1, Math.max(0, Math.floor(p * arr.length)))];

  const indices: SobolIndexEstimate[] = PARAM_NAMES.map((name, i) => ({
    name,
    firstOrder: clamp01(sFirst[i]),
    totalOrder: clamp01(sTotal[i]),
    firstOrderCI: [clamp01(pct(boots[i], 0.025)), clamp01(pct(boots[i], 0.975))],
  }));

  const idxN = indices[0];
  return {
    geometry,
    indices,
    sN: idxN.firstOrder,
    sA: indices[1].firstOrder,
    sC: indices[2].firstOrder,
    sNConfidenceInterval: idxN.firstOrderCI,
    interactionDetected: indices.some((ix) => ix.totalOrder - ix.firstOrder > 0.1),
    sampleSize: n,
    modelVersion: MODEL_VERSION,
  };
}
