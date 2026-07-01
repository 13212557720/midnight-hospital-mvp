export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function nextRngState(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

export function randomFloat(state: number): { value: number; state: number } {
  const next = nextRngState(state);
  return { value: next / 4294967296, state: next };
}

export function randomInt(state: number, maxExclusive: number): { value: number; state: number } {
  const result = randomFloat(state);
  return { value: Math.floor(result.value * maxExclusive), state: result.state };
}

export function weightedPerturbation(state: number): { value: -1 | 0 | 1; state: number } {
  const result = randomFloat(state);
  if (result.value < 0.2) {
    return { value: -1, state: result.state };
  }
  if (result.value > 0.8) {
    return { value: 1, state: result.state };
  }
  return { value: 0, state: result.state };
}

export function makeRunSeed(prefix = 'gate-1073'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
