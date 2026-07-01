import { AppProviders } from './app/providers';
import { useGameStore } from './app/gameStore';
import { CareerSelectScreen } from './ui/screens/CareerSelectScreen';
import { FinalEscapeScreen } from './ui/screens/FinalEscapeScreen';
import { InstanceIntroScreen } from './ui/screens/InstanceIntroScreen';
import { NodeStoryScreen } from './ui/screens/NodeStoryScreen';
import { RunResultScreen } from './ui/screens/RunResultScreen';
import { AppErrorBoundary } from './ui/components/AppErrorBoundary';

function GameRouter() {
  const { state } = useGameStore();
  const phase = state.run.phase;

  if (phase === 'CAREER_SELECT') {
    return <CareerSelectScreen />;
  }

  if (phase === 'INSTANCE_INTRO') {
    return <InstanceIntroScreen />;
  }

  if (phase === 'FINAL_ESCAPE') {
    return <FinalEscapeScreen />;
  }

  if (phase === 'RUN_RESULT') {
    return <RunResultScreen />;
  }

  return <NodeStoryScreen />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <GameRouter />
      </AppProviders>
    </AppErrorBoundary>
  );
}
