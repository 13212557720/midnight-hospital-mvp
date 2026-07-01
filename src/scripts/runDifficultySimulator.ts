import { simulateDifficulty } from '../engine/difficultySimulator';

function parseRuns(): number {
  const arg = process.argv.find((item) => item.startsWith('--runs='));
  if (!arg) {
    return 10000;
  }
  const value = Number(arg.split('=')[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10000;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const metrics = simulateDifficulty(parseRuns());

console.log(`Runs: ${metrics.runs}`);
console.log(`Win rate: ${pct(metrics.winRate)}`);
console.log(`Perfect win rate: ${pct(metrics.perfectWinRate)}`);
console.log(`Near miss rate: ${pct(metrics.nearMissRate)}`);
console.log(`Missing one fragment: ${pct(metrics.missingOneFragmentRate)}`);
console.log(`Death before final: ${pct(metrics.deathBeforeFinalRate)}`);
console.log(`Pollution overload: ${pct(metrics.pollutionOverloadRate)}`);
console.log(`Final check failed: ${pct(metrics.finalCheckFailedRate)}`);
console.log(`Average duration nodes: ${metrics.averageDurationNodes.toFixed(1)}`);
console.log('Career win rates:');
for (const [careerId, winRate] of Object.entries(metrics.careerWinRates)) {
  console.log(`- ${careerId}: ${pct(winRate)}`);
}
