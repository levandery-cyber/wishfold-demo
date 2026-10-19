'use client';

import { useState } from 'react';
import Overlays from '@/components/Overlays';
import { useGame } from '@/components/Providers';
import Stage from '@/components/Stage';
import { bigTier } from '@/lib/presenter';

const noop = () => {};

const SAMPLES = {
  free: { type: 'banner', kind: 'free', title: 'Lantern Night', big: '10', sub: 'free spins', ms: 60000, done: noop },
  retrigger: { type: 'banner', kind: 'retrigger', title: 'More free spins', big: '+5', sub: 'lanterns lit again', ms: 60000, done: noop },
  pond: { type: 'banner', kind: 'pond', title: 'Koi Pond', big: '3', sub: 'respins', ms: 60000, done: noop },
  total: { type: 'banner', kind: 'total', title: 'Free spins total', big: '362.80', sub: '24 spins', ms: 60000, done: noop },
  max: { type: 'banner', kind: 'max', title: 'Max win', big: '500,000.00', sub: '5,000x the bet', ms: 60000, done: noop },
  pick: { type: 'pick', pick: { rewards: ['plus', 'wilds', 'spins'], decoys: ['double', 'plus'] }, done: noop },
  big0: { type: 'big', tier: bigTier(12), amount: 1250, mult: 12.5, done: noop },
  big3: { type: 'big', tier: bigTier(210), amount: 21000, mult: 210, done: noop },
  big4: { type: 'big', tier: bigTier(2100), amount: 210000, mult: 2100, done: noop },
  wish: { type: 'dialog', name: 'wish' },
  buy: { type: 'dialog', name: 'buy' },
  auto: { type: 'dialog', name: 'auto' },
  info: { type: 'dialog', name: 'info' },
  menu: { type: 'dialog', name: 'menu' },
};

export default function UiLab() {
  const [game, s] = useGame();
  const [key, setKey] = useState('free');
  const [scene, setScene] = useState('dawn');
  return (
    <>
      <div style={{ position: 'fixed', left: 6, top: 6, zIndex: 999, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 700 }}>
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} onClick={() => setKey(k)} style={{ padding: '2px 6px', background: k === key ? '#ffd45e' : '#fff', borderRadius: 4, fontSize: 11 }}>
            {k}
          </button>
        ))}
        {['dawn', 'night', 'pond'].map((k) => (
          <button key={k} onClick={() => setScene(k)} style={{ padding: '2px 6px', background: '#cde', borderRadius: 4, fontSize: 11 }}>
            {k}
          </button>
        ))}
      </div>
      <Stage scene={scene} overlays={<Overlays overlay={SAMPLES[key]} close={() => {}} game={game} s={s} onBuy={noop} onAuto={noop} />}>
        <div className="logo" aria-hidden="true">
          <h1 className="logo__word">Wishfold</h1>
        </div>
      </Stage>
    </>
  );
}
