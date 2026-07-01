import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { eventsById, midnightHospitalInstance } from '../content/packs/midnight-hospital';
import { continueAfterResolution, enterInstance, initialGameState, resetToCareerSelect, restartRun, startRun } from '../engine/gameMachine';
import { getCurrentNode, resolveCurrentNode } from '../engine/resolutionEngine';
import type { CareerId, GameState, ResolveOptions } from '../engine/types';
import { getUnlockedMemoryCards, loadSaveData, recordRunResult, type SaveData } from '../services/save/saveService';
import { trackTelemetry } from '../services/telemetry/telemetry';

interface GameStoreValue {
  state: GameState;
  save: SaveData;
  currentNode: ReturnType<typeof getCurrentNode>;
  actions: ReturnType<typeof getCurrentNode>['actions'];
  startCareerRun: (careerId: CareerId) => void;
  enterCurrentInstance: () => void;
  playCardForAction: (actionId: string, cardInstanceId: string, options?: ResolveOptions) => void;
  continueRun: () => void;
  restartCurrentRun: () => void;
  backToCareerSelect: () => void;
}

const GameStoreContext = createContext<GameStoreValue | null>(null);

function withMemoryCards(state: GameState, save: SaveData): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      memoryCards: getUnlockedMemoryCards(save),
    },
  };
}

export function GameProvider({ children }: PropsWithChildren) {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [state, setState] = useState<GameState>(() => withMemoryCards(initialGameState, loadSaveData()));

  const currentNode = useMemo(() => {
    if (state.run.phase === 'CAREER_SELECT' || state.run.phase === 'INSTANCE_INTRO' || state.run.phase === 'RUN_RESULT') {
      return eventsById[midnightHospitalInstance.nodeIds[0]];
    }
    return getCurrentNode(state);
  }, [state]);

  const value = useMemo<GameStoreValue>(
    () => ({
      state,
      save,
      currentNode,
      actions: currentNode.actions,
      startCareerRun: (careerId) => {
        const next = withMemoryCards(startRun(careerId), save);
        trackTelemetry({ type: 'RUN_START', careerId, seed: next.run.seed });
        setState(next);
      },
      enterCurrentInstance: () => {
        setState((prev) => {
          const next = enterInstance(prev);
          const nodeId = midnightHospitalInstance.nodeIds[0];
          trackTelemetry({
            type: 'NODE_ENTER',
            nodeId,
            hp: next.player.hp,
            sanity: next.player.sanity,
            pollution: next.player.pollution,
            fragments: next.player.fragments,
          });
          return next;
        });
      },
      playCardForAction: (actionId, cardInstanceId, options = {}) => {
        setState((prev) => {
          const node = getCurrentNode(prev);
          trackTelemetry({ type: 'ACTION_SELECT', nodeId: node.id, actionId });
          const next = resolveCurrentNode(prev, actionId, cardInstanceId, options);
          if (next.run.lastResolution) {
            trackTelemetry({
              type: 'CARD_PLAY',
              cardId: next.run.lastResolution.cardId,
              checkValue: next.run.lastResolution.checkValue,
              difficulty: next.run.lastResolution.difficulty,
              outcome: next.run.lastResolution.outcome,
            });
          }
          if (next.run.phase === 'RUN_RESULT' && next.run.result) {
            trackTelemetry({
              type: 'RUN_END',
              status: next.run.result.status,
              failureReason: next.run.result.failureReason,
              fragments: next.run.result.fragments,
              pollution: next.run.result.pollution,
            });
            setSave(recordRunResult(next.run.result));
          }
          return next;
        });
      },
      continueRun: () => {
        setState((prev) => {
          const next = continueAfterResolution(prev);
          if (next.run.phase === 'RUN_RESULT' && next.run.result) {
            trackTelemetry({
              type: 'RUN_END',
              status: next.run.result.status,
              failureReason: next.run.result.failureReason,
              fragments: next.run.result.fragments,
              pollution: next.run.result.pollution,
            });
            setSave(recordRunResult(next.run.result));
          } else if (next.run.phase === 'NODE_STORY' || next.run.phase === 'FINAL_ESCAPE') {
            const node = getCurrentNode(next);
            trackTelemetry({
              type: 'NODE_ENTER',
              nodeId: node.id,
              hp: next.player.hp,
              sanity: next.player.sanity,
              pollution: next.player.pollution,
              fragments: next.player.fragments,
            });
          }
          return next;
        });
      },
      restartCurrentRun: () => {
        setState((prev) => withMemoryCards(restartRun(prev), save));
      },
      backToCareerSelect: () => {
        setState(withMemoryCards(resetToCareerSelect(), save));
      },
    }),
    [currentNode, save, state],
  );

  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore(): GameStoreValue {
  const value = useContext(GameStoreContext);
  if (!value) {
    throw new Error('useGameStore must be used within GameProvider');
  }
  return value;
}
