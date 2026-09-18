const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://cqgocwsqhsqdkyphfvvy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZ29jd3NxaHNxZGt5cGhmdnZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MjczMSwiZXhwIjoyMDg4MTE4NzMxfQ.25G6wE90KevLhB_47uI4c1o5Q_wR7qWj4_vF_1z_3_4';

export default async function handler(req: any, res: any) {
  let sessionId = '';
  try {
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      sessionId = parsed.sessionId || '';
    } else if (req.body && req.body.sessionId) {
      sessionId = req.body.sessionId;
    }
  } catch {}

  if (!sessionId && req.query?.sessionId) {
    sessionId = String(req.query.sessionId);
  }

  if (sessionId && SUPABASE_URL && SUPABASE_KEY && !SUPABASE_KEY.startsWith('replace_') && !SUPABASE_KEY.startsWith('sb_publishable_')) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/brew_visitors?session_id=eq.${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          is_active: false
        })
      });
    } catch {}
  }

  return res.status(200).json({ ok: true });
}
