import type { PropsWithChildren, ReactNode } from 'react';
import { UI_CONFIG } from '../../config/ui';
import { useGameStore } from '../../app/gameStore';
import { StatusBar } from '../components/StatusBar';
import { getAsset } from '../../services/assets/assetLoader';
import { AssistantPanel } from '../components/AssistantPanel';
import type { AssistantRuntimeContext } from '../../services/story/assistantAdvisor';

interface GameShellProps extends PropsWithChildren {
  rightSlot?: ReactNode;
  hideStatus?: boolean;
  assistantRuntime?: AssistantRuntimeContext;
}

export function GameShell({ children, rightSlot, hideStatus = false, assistantRuntime }: GameShellProps) {
  const { state } = useGameStore();
  const terminalOverlay = getAsset('ui_terminal_noise_overlay');

  return (
    <main className="app-shell">
      <section className="game-frame">
        <img className="terminal-overlay" src={terminalOverlay.src} alt="" aria-hidden="true" />
        <header className="top-bar">
          <div className="brand">
            <h1 className="brand-title">
              {UI_CONFIG.appTitle} / {UI_CONFIG.instanceTitle}
            </h1>
            <span className="brand-subtitle">{UI_CONFIG.subtitle}</span>
          </div>
          {rightSlot ?? (!hideStatus ? <StatusBar player={state.player} /> : null)}
        </header>
        <div className="game-body-with-assistant">
          <div className="game-body-main">{children}</div>
          <AssistantPanel runtime={assistantRuntime} />
        </div>
      </section>
    </main>
  );
}
