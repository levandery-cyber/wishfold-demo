import { ART_NAMES, renderArt } from '@/lib/art';

// Every picture is drawn by code (lib/art) and prerendered once at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return ART_NAMES.map((name) => ({ name }));
}

export async function GET(_request, { params }) {
  const { name } = await params;
  const svg = renderArt(name);
  if (!svg) return new Response('Not found', { status: 404 });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
