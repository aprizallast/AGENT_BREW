import { searchTokens } from '../scripts/script.ts';

export default async function handler(req: any, res: any) {
  try {
    const q = String(req.query?.q || req.body?.q || '').trim();
    if (!q) {
      return res.status(200).json({ tokens: [], count: 0, searchQuery: '' });
    }

    const result = await searchTokens(q);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('API /api/search error:', err);
    return res.status(500).json({ error: err.message || 'Search failed', tokens: [], count: 0 });
  }
}
