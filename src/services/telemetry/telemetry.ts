import type { CheckOutcome } from '../../engine/types';

export type TelemetryEvent =
  | { type: 'RUN_START'; careerId: string; seed: string }
  | { type: 'NODE_ENTER'; nodeId: string; hp: number; sanity: number; pollution: number; fragments: number }
  | { type: 'ACTION_SELECT'; nodeId: string; actionId: string }
  | { type: 'CARD_PLAY'; cardId: string; checkValue: number; difficulty: number; outcome: CheckOutcome }
  | { type: 'MINIGAME_COMPLETE'; minigameId: string; score: number }
  | { type: 'RUN_END'; status: string; failureReason?: string; fragments: number; pollution: number };

const STORAGE_KEY = 'midnight-hospital-telemetry';
const DEBUG_TELEMETRY = import.meta.env.DEV || import.meta.env.VITE_DEBUG_TELEMETRY === 'true';

export function trackTelemetry(event: TelemetryEvent): void {
  if (DEBUG_TELEMETRY) {
    console.info('[midnight-hospital]', event);
  }
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as TelemetryEvent[];
    current.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(-200)));
  } catch {
    // Telemetry must never block gameplay.
  }
}
