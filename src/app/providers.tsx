import type { PropsWithChildren } from 'react';
import { GameProvider } from './gameStore';

export function AppProviders({ children }: PropsWithChildren) {
  return <GameProvider>{children}</GameProvider>;
}
