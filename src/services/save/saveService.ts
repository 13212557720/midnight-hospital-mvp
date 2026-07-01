import { midnightHospitalMemoryCards } from '../../content/packs/midnight-hospital';
import type { MemoryCard, RunResult } from '../../engine/types';

export interface RunHistoryItem {
  finishedAt: string;
  status: RunResult['status'];
  failureReason?: RunResult['failureReason'];
  fragments: number;
  pollution: number;
  timeLeftSeconds: number;
}

export interface SaveData {
  version: number;
  unlockedMemoryCards: string[];
  runHistory: RunHistoryItem[];
  settings: {
    reduceMotion: boolean;
    textSpeed: 'instant' | 'fast' | 'normal';
  };
}

const SAVE_KEY = 'midnight-hospital-save';

export const defaultSaveData: SaveData = {
  version: 1,
  unlockedMemoryCards: [],
  runHistory: [],
  settings: {
    reduceMotion: false,
    textSpeed: 'normal',
  },
};

export function loadSaveData(): SaveData {
  if (typeof localStorage === 'undefined') {
    return defaultSaveData;
  }

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return defaultSaveData;
    }
    const parsed = JSON.parse(raw) as SaveData;
    return {
      ...defaultSaveData,
      ...parsed,
      settings: { ...defaultSaveData.settings, ...parsed.settings },
    };
  } catch {
    return defaultSaveData;
  }
}

export function saveData(data: SaveData): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Saving is best-effort; a blocked or full localStorage must not stop the run.
  }
}

export function getUnlockedMemoryCards(save: SaveData): MemoryCard[] {
  return midnightHospitalMemoryCards.filter((card) => save.unlockedMemoryCards.includes(card.id));
}

export function recordRunResult(result: RunResult): SaveData {
  const save = loadSaveData();
  const unlocked = new Set(save.unlockedMemoryCards);
  if (result.memoryCardReward) {
    unlocked.add(result.memoryCardReward.id);
  }

  const next: SaveData = {
    ...save,
    unlockedMemoryCards: [...unlocked],
    runHistory: [
      {
        finishedAt: new Date().toISOString(),
        status: result.status,
        failureReason: result.failureReason,
        fragments: result.fragments,
        pollution: result.pollution,
        timeLeftSeconds: result.timeLeftSeconds,
      },
      ...save.runHistory,
    ].slice(0, 30),
  };
  saveData(next);
  return next;
}
