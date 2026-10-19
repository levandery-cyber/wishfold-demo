export default function Phone() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 8, background: '#222', alignItems: 'flex-start' }}>
      <iframe src="/" title="portrait" style={{ width: 390, height: 780, border: '8px solid #000', borderRadius: 24, background: '#fff' }} />
      <iframe src="/" title="small" style={{ width: 360, height: 640, border: '8px solid #000', borderRadius: 24, background: '#fff' }} />
    </div>
  );
}
