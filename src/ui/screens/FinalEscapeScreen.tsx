import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../app/gameStore';
import { getVisibleActions } from '../../engine/resolutionEngine';
import { ActionButtons } from '../components/ActionButtons';
import { CardHand } from '../components/CardHand';
import { SceneImage } from '../components/SceneImage';
import { StoryPanel } from '../components/StoryPanel';
import { GameShell } from '../layout/GameShell';
import { useNodeStoryText } from '../hooks/useStoryText';

export function FinalEscapeScreen() {
  const { state, currentNode, playCardForAction } = useGameStore();
  const [selectedActionId, setSelectedActionId] = useState<string>();
  const [useRitualBoost, setUseRitualBoost] = useState(false);
  const actions = useMemo(() => getVisibleActions(currentNode, state), [currentNode, state]);
  const actionLabels = useMemo(() => actions.map((action) => action.label), [actions]);
  const nodeStory = useNodeStoryText(state, currentNode, actionLabels);
  const selectedAction = actions.find((action) => action.id === selectedActionId);
  const cardDisabledReason = !selectedActionId ? '先选择一个最终逃生行动。' : undefined;

  useEffect(() => {
    setSelectedActionId(undefined);
    setUseRitualBoost(false);
  }, [currentNode.id]);

  function handlePlay(cardInstanceId: string) {
    if (!selectedActionId) {
      return;
    }
    playCardForAction(selectedActionId, cardInstanceId, { useRitualBoost });
  }

  return (
    <GameShell
      assistantRuntime={{
        selectedActionLabel: selectedAction?.label,
        cannotPlayReason: cardDisabledReason,
      }}
    >
      <div className="scene-wrap">
        <SceneImage assetId={currentNode.imageAssetId} />
      </div>
      <section className="screen screen-grid">
        <div className="stack">
          <StoryPanel node={currentNode} storyText={nodeStory.text} loading={nodeStory.status === 'loading'} source={nodeStory.source} />
          <ActionButtons actions={actions} selectedActionId={selectedActionId} onSelect={setSelectedActionId} />
        </div>
        <aside className="stack">
          {state.player.careerId === 'ritualist' ? (
            <label className="panel panel-pad button-row">
              <input type="checkbox" checked={useRitualBoost} onChange={(event) => setUseRitualBoost(event.target.checked)} />
              <span>污染 +1，本次判定 +2</span>
            </label>
          ) : null}
          <CardHand hand={state.player.hand} energy={state.player.energy} disabled={!selectedActionId} disabledReason={cardDisabledReason} onPlay={handlePlay} />
        </aside>
      </section>
    </GameShell>
  );
}
