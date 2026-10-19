'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { sfx } from '@/lib/audio';
import { Game } from '@/lib/game';

const Ctx = createContext(null);

// One Game for the whole app. It is created empty (so server and client render the same thing) and loads the save after mount.
export default function Providers({ children }) {
  const [game] = useState(() => new Game());
  useEffect(() => {
    game.storage = window.localStorage;
    game.init();
    if (process.env.NODE_ENV !== 'production') {
      window.__wishfold = game;
      window.__sfx = sfx;
    }
  }, [game]);
  return <Ctx.Provider value={game}>{children}</Ctx.Provider>;
}

export function useGame() {
  const game = useContext(Ctx);
  const s = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  return [game, s];
}
