import { inspectContract } from '../scripts/script.ts';

export default async function handler(req: any, res: any) {
  try {
    const address = String(req.query?.address || req.body?.address || '').trim();
    if (!address) {
      return res.status(400).json({ error: 'Missing address parameter' });
    }

    const result = await inspectContract(address);
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('API /api/inspect error:', err);
    return res.status(500).json({ error: err.message || 'Inspection failed' });
  }
}
