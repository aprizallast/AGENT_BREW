import { runFullSync } from '../scripts/script.ts';

// Vercel Serverless Function handler for /api/sync
export default async function handler(req: any, res: any) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    const payload = await runFullSync();
    return res.status(200).json({
      success: true,
      message: 'Token synchronization with Supabase completed successfully',
      count: payload.tokens?.length || 0,
      updatedAt: payload.updatedAt || Date.now()
    });
  } catch (err: any) {
    console.error('API /api/sync execution error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Sync execution failed'
    });
  }
}
