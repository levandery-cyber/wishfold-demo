import { SYMBOL_ART, starArt } from '@/lib/art/symbols';
import { coinArt, craneArt, koiArt, lanternArt } from '@/lib/art/specials';

const uri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export default function Lab() {
  const tiers = [
    ['kraft', ['boat', 'plane', 'sakura']],
    ['washi', ['duck', 'frog']],
    ['gilt', ['butterfly', 'kabuto']],
    ['holo', ['fox', 'panda', 'wild']],
  ];
  const extra = [
    ['lantern', lanternArt()],
    ['koi', koiArt('kohaku')],
    ['orange', koiArt('orange')],
    ['ogon', koiArt('ogon')],
    ['moon', koiArt('moon')],
    ['crane', craneArt(null)],
    ['crane2', craneArt(190)],
    ['crane3', craneArt(330)],
    ['coin', coinArt()],
  ];
  return (
    <div className="lab">
      <div className="lab__row">
        {tiers.map(([tier, ids]) =>
          ids.map((id) => (
            <div key={tier + id} className={`tile tile--${tier}`}>
              <div className="tile__card" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uri(SYMBOL_ART[id]())} alt={id} />
            </div>
          )),
        )}
      </div>
      <h2>specials</h2>
      <div className="lab__row">
        {extra.map(([id, svg]) => (
          <div key={id} className="tile tile--washi">
            <div className="tile__card" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uri(svg)} alt={id} />
          </div>
        ))}
      </div>
      <h2>small (real board size)</h2>
      <div className="lab__row" style={{ '--t': '72px' }}>
        {tiers.map(([tier, ids]) =>
          ids.map((id) => (
            <div key={tier + id} className={`tile tile--${tier}`}>
              <div className="tile__card" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uri(SYMBOL_ART[id]())} alt={id} />
            </div>
          )),
        )}
      </div>
      <h2>stars</h2>
      <div className="lab__row">
        {[
          [335, '×2'],
          [28, '×3'],
          [48, '×5'],
          [160, '×10'],
          [220, '×25'],
          [275, '×100'],
        ].map(([h, v]) => (
          <div key={v} className="stick">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uri(starArt(h))} alt="" />
            <b>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
