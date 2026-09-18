import { fetchArtworks } from '../scripts/script.ts';

export default async function handler(req: any, res: any) {
  try {
    const raw = String(req.query?.addresses || req.body?.addresses || '');
    const addresses = raw.split(',').map((a: string) => a.trim()).filter(Boolean);
    if (!addresses.length) {
      return res.status(200).json({ artworks: {} });
    }

    const artworks = await fetchArtworks(addresses);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ artworks });
  } catch (err: any) {
    console.error('API /api/artworks error:', err);
    return res.status(500).json({ error: err.message || 'Artwork decoding failed', artworks: {} });
  }
}
