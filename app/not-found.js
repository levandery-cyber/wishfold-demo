import Link from 'next/link';

export const metadata = { title: 'Blank sheet' };

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="page__scene" src="/art/scene-dawn.svg" alt="" draggable="false" />
      <div className="page__sheet" style={{ textAlign: 'center', maxWidth: 520 }}>
        <h1 className="page__title" style={{ transformOrigin: '50% 50%' }}>
          Blank sheet
        </h1>
        <p className="page__lead">There is nothing folded at this address. The slot is still where you left it.</p>
        <Link className="btn btn--go" href="/" style={{ display: 'inline-flex' }}>
          Back to the game
        </Link>
      </div>
    </div>
  );
}
