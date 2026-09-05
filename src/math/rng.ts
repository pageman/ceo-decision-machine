/** Seeded RNG (mulberry32) so Monte Carlo results are reproducible in tests. */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a seeded RNG; non-deterministic seed when none is supplied. */
export function defaultRng(seed?: number): Rng {
  return mulberry32((seed ?? (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0);
}
