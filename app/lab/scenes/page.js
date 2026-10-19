export default function Scenes() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8, background: '#222' }}>
      {['dawn', 'night', 'pond', 'wish'].map((s) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s} src={`/art/scene-${s}.svg`} alt={s} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
      ))}
    </div>
  );
}
