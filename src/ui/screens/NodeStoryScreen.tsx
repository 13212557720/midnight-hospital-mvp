import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../app/gameStore';
import { getVisibleActions } from '../../engine/resolutionEngine';
import { ActionButtons } from '../components/ActionButtons';
import { CardHand } from '../components/CardHand';
import { CardResolutionModal } from '../components/CardResolutionModal';
import { ProgressPips } from '../components/ProgressPips';
import { SceneImage } from '../components/SceneImage';
import { StoryPanel } from '../components/StoryPanel';
import { AnomalySpottingGame } from '../minigames/AnomalySpottingGame';
import { GameShell } from '../layout/GameShell';
import { useNodeStoryText, useResolutionStoryText } from '../hooks/useStoryText';

function bonusFromHits(hits: number): number {
  if (hits >= 2) return 2;
  if (hits === 1) return 1;
  return 0;
}

export function NodeStoryScreen() {
  const { state, currentNode, playCardForAction, continueRun } = useGameStore();
  const [selectedActionId, setSelectedActionId] = useState<string>();
  const [minigameHits, setMinigameHits] = useState<number | null>(null);
  const [useRitualBoost, setUseRitualBoost] = useState(false);

  useEffect(() => {
    setSelectedActionId(undefined);
    setMinigameHits(null);
    setUseRitualBoost(false);
  }, [currentNode.id]);

  const actions = useMemo(() => getVisibleActions(currentNode, state), [currentNode, state]);
  const actionLabels = useMemo(() => actions.map((action) => action.label), [actions]);
  const nodeStory = useNodeStoryText(state, currentNode, actionLabels);
  const resolutionStory = useResolutionStoryText(state.run.lastResolution);
  const minigameRequired = Boolean(currentNode.minigameId);
  const minigameDone = !minigameRequired || minigameHits !== null;
  const selectedAction = actions.find((action) => action.id === selectedActionId);
  const cardDisabledReason = !selectedActionId
    ? '先选择一个行动。'
    : !minigameDone
      ? '先完成或跳过异常点识别，之后才能出牌。'
      : undefined;
  const minigameStatus = currentNode.minigameId
    ? minigameHits === null
      ? '未完成。需要完成或跳过异常点识别后才能出牌。'
      : `已完成，命中 ${minigameHits}/3，判定 +${bonusFromHits(minigameHits)}。`
    : undefined;

  function handlePlay(cardInstanceId: string) {
    if (!selectedActionId || !minigameDone) {
      return;
    }
    playCardForAction(selectedActionId, cardInstanceId, {
      minigameBonus: minigameHits === null ? 0 : bonusFromHits(minigameHits),
      minigameHits: minigameHits ?? 0,
      useRitualBoost,
    });
  }

  return (
    <GameShell
      assistantRuntime={{
        selectedActionLabel: selectedAction?.label,
        minigameStatus,
        cannotPlayReason: cardDisabledReason,
      }}
      rightSlot={
        <div className="stack">
          <ProgressPips current={state.run.resolvedNodeIds.length} total={6} />
        </div>
      }
    >
      <div className="scene-wrap">
        <SceneImage assetId={currentNode.imageAssetId} />
      </div>
      <section className="screen screen-grid">
        <div className="stack">
          <StoryPanel node={currentNode} storyText={nodeStory.text} loading={nodeStory.status === 'loading'} source={nodeStory.source} />
          {currentNode.minigameId ? (
            <AnomalySpottingGame imageAssetId={currentNode.imageAssetId} onComplete={(hits) => setMinigameHits(hits)} />
          ) : null}
          <ActionButtons actions={actions} selectedActionId={selectedActionId} onSelect={setSelectedActionId} />
        </div>
        <aside className="stack">
          {state.player.careerId === 'ritualist' ? (
            <label className="panel panel-pad button-row">
              <input type="checkbox" checked={useRitualBoost} onChange={(event) => setUseRitualBoost(event.target.checked)} />
              <span>污染 +1，本次判定 +2</span>
            </label>
          ) : null}
          {currentNode.minigameId ? (
            <div className="panel panel-pad">
              <h3 className="section-title">手术室加成</h3>
              <p className="muted">{minigameHits === null ? '未完成' : `命中 ${minigameHits}/3，判定 +${bonusFromHits(minigameHits)}`}</p>
            </div>
          ) : null}
          <CardHand
            hand={state.player.hand}
            energy={state.player.energy}
            disabled={!selectedActionId || !minigameDone}
            disabledReason={cardDisabledReason}
            onPlay={handlePlay}
          />
        </aside>
      </section>
      {state.run.phase === 'RESOLUTION' && state.run.lastResolution ? (
        <CardResolutionModal
          result={state.run.lastResolution}
          narrativeText={resolutionStory.text}
          narrativeLoading={resolutionStory.status === 'loading'}
          onContinue={continueRun}
        />
      ) : null}
    </GameShell>
  );
}
