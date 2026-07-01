import { describe, expect, it } from 'vitest';
import { simulateDifficulty } from '../engine/difficultySimulator';

describe('difficultySimulator', () => {
  it('simulates runs and reports career win rates', () => {
    const metrics = simulateDifficulty(80);
    expect(metrics.runs).toBe(80);
    expect(metrics.averageDurationNodes).toBeGreaterThan(0);
    expect(Object.keys(metrics.careerWinRates)).toEqual(['investigator', 'cleaner', 'physician', 'ritualist']);
  });
});
