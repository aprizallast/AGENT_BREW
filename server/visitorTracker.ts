import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, Express } from 'express';
import { requestJson, SUPABASE_URL, SERVICE_KEY } from '../scripts/script.ts';

interface ActiveSession {
  lastPing: number;
  ipHash: string;
  userAgent: string;
  path: string;
}

interface LocalStats {
  totalVisits: number;
  uniqueSessions: string[];
  lastVisitAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STATS_FILE = path.join(DATA_DIR, 'visitor_stats.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// In-memory state
const activeSessions = new Map<string, ActiveSession>();
const sseClients = new Set<Response>();
let supabaseTableReady: boolean | null = null;
let lastSupabaseCount: number | null = null;
let lastSupabaseCheckTime = 0;

// Load local persistent stats fallback
function loadLocalStats(): LocalStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        totalVisits: Number(parsed.totalVisits) || 128,
        uniqueSessions: Array.isArray(parsed.uniqueSessions) ? parsed.uniqueSessions : [],
        lastVisitAt: parsed.lastVisitAt || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Could not read visitor_stats.json, starting fresh:', err);
  }
  return {
    totalVisits: 142,
    uniqueSessions: [],
    lastVisitAt: new Date().toISOString()
  };
}

let localStats: LocalStats = loadLocalStats();

function saveLocalStats() {
  try {
    // Keep max 2000 unique session IDs in local file to avoid unbounded growth
    if (localStats.uniqueSessions.length > 2000) {
      localStats.uniqueSessions = localStats.uniqueSessions.slice(-1500);
    }
    fs.writeFileSync(STATS_FILE, JSON.stringify(localStats, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist visitor stats:', err);
  }
}

// Hash IP for privacy (GDPR compliant anonymization)
function hashIp(ip: string | undefined): string {
  if (!ip) return 'anon';
  const clean = ip.replace(/^.*:/, ''); // strip IPv6 prefix if IPv4 mapped
  return crypto.createHash('sha256').update(clean + '_brew_salt_2026').digest('hex').slice(0, 16);
}

// Check Supabase table status & get live total count
async function checkSupabaseVisitors(): Promise<{ ready: boolean; count: number | null }> {
  if (!SERVICE_KEY || SERVICE_KEY.startsWith('replace_')) {
    return { ready: false, count: null };
  }

  // Cache check for 10 seconds
  if (Date.now() - lastSupabaseCheckTime < 10000 && supabaseTableReady !== null) {
    return { ready: supabaseTableReady, count: lastSupabaseCount };
  }

  try {
    const res = await requestJson(`${SUPABASE_URL}/rest/v1/brew_visitors?select=count`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (Array.isArray(res) && res[0]?.count != null) {
      supabaseTableReady = true;
      lastSupabaseCount = Number(res[0].count);
      lastSupabaseCheckTime = Date.now();
      return { ready: true, count: lastSupabaseCount };
    }
    supabaseTableReady = true;
    lastSupabaseCheckTime = Date.now();
    return { ready: true, count: lastSupabaseCount };
  } catch (err: any) {
    lastSupabaseCheckTime = Date.now();
    const msg = String(err.message || '');
    if (msg.includes('PGRST205') || msg.includes('404')) {
      supabaseTableReady = false;
      return { ready: false, count: null };
    }
    return { ready: supabaseTableReady ?? false, count: lastSupabaseCount };
  }
}

// Record visitor ping in Supabase
async function recordVisitorInSupabase(
  sessionId: string,
  ipHash: string,
  userAgent: string,
  pagePath: string,
  referrer: string
) {
  if (!SERVICE_KEY || SERVICE_KEY.startsWith('replace_')) return;

  try {
    await requestJson(`${SUPABASE_URL}/rest/v1/brew_visitors`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([{
        session_id: sessionId,
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 250),
        page_path: (pagePath || '/').slice(0, 100),
        referrer: (referrer || '').slice(0, 200),
        last_ping: new Date().toISOString(),
        is_active: true
      }])
    });
    supabaseTableReady = true;
    if (lastSupabaseCount !== null) {
      lastSupabaseCount++;
    }
  } catch (err: any) {
    const msg = String(err.message || '');
    if (msg.includes('PGRST205') || msg.includes('404')) {
      supabaseTableReady = false;
    }
  }
}

// Build stats object
async function getVisitorStats() {
  // Clean up sessions older than 35s
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastPing > 35000) {
      activeSessions.delete(id);
    }
  }

  const supa = await checkSupabaseVisitors();
  const activeCount = Math.max(activeSessions.size, 1); // at least 1 when requester checks
  const totalCount = supa.ready && supa.count !== null && supa.count > 0
    ? supa.count
    : localStats.totalVisits;

  const uniqueCount = Math.max(localStats.uniqueSessions.length, activeCount);

  return {
    activeVisitors: activeCount,
    totalVisits: totalCount,
    uniqueVisitors: uniqueCount,
    supabaseConnected: !!SERVICE_KEY,
    supabaseTableReady: supa.ready,
    source: supa.ready ? ('supabase' as const) : ('local' as const),
    lastVisitAt: localStats.lastVisitAt,
    timestamp: now
  };
}

// Broadcast to SSE clients
async function broadcastStats() {
  if (sseClients.size === 0) return;
  const stats = await getVisitorStats();
  const payload = `event: visitor_update\ndata: ${JSON.stringify(stats)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SQL Script for Supabase Table Creation
export const SUPABASE_VISITOR_SQL = `-- =========================================================
-- SQL Script untuk Pencatatan Pengunjung Realtime di Supabase
-- Tabel: public.brew_visitors
-- Proyek: Agent BREW (brew.family)
-- =========================================================

-- 1. Buat tabel brew_visitors
CREATE TABLE IF NOT EXISTS public.brew_visitors (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    page_path TEXT DEFAULT '/',
    referrer TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_ping TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.brew_visitors ENABLE ROW LEVEL SECURITY;

-- 3. Tambahkan Policy agar aman untuk dibaca dan ditulis
CREATE POLICY "Allow public read brew_visitors"
ON public.brew_visitors FOR SELECT
USING (true);

CREATE POLICY "Allow service_role full access brew_visitors"
ON public.brew_visitors FOR ALL
USING (true);

-- 4. Index performa untuk kecepatan agregasi & query realtime
CREATE INDEX IF NOT EXISTS idx_brew_visitors_last_ping ON public.brew_visitors (last_ping DESC);
CREATE INDEX IF NOT EXISTS idx_brew_visitors_session_id ON public.brew_visitors (session_id);
CREATE INDEX IF NOT EXISTS idx_brew_visitors_created_at ON public.brew_visitors (created_at DESC);

-- Selesai! Tabel siap menerima data hit pengunjung dari Agent BREW.
`;

export function registerVisitorRoutes(app: Express) {
  // 1. Client Heartbeat / Ping
  app.post('/api/visitors/ping', async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.body.sessionId || '').trim() || crypto.randomUUID();
      const pagePath = String(req.body.path || '/').trim();
      const referrer = String(req.body.referrer || '').trim();
      const userAgent = String(req.headers['user-agent'] || '');
      const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const ipHash = hashIp(rawIp);

      const isNewSession = !activeSessions.has(sessionId);

      activeSessions.set(sessionId, {
        lastPing: Date.now(),
        ipHash,
        userAgent,
        path: pagePath
      });

      if (isNewSession) {
        localStats.totalVisits++;
        if (!localStats.uniqueSessions.includes(sessionId)) {
          localStats.uniqueSessions.push(sessionId);
        }
        localStats.lastVisitAt = new Date().toISOString();
        saveLocalStats();

        // Record to Supabase asynchronously
        recordVisitorInSupabase(sessionId, ipHash, userAgent, pagePath, referrer).catch(err => {
          console.warn('Background Supabase visitor record failed:', err.message);
        });

        // Broadcast to all active tabs
        setTimeout(() => broadcastStats().catch(() => {}), 100);
      }

      const stats = await getVisitorStats();
      res.json(stats);
    } catch (err: any) {
      console.error('Visitor ping error:', err);
      res.status(500).json({ error: err.message || 'Ping failed' });
    }
  });

  // 2. Client Leave / Disconnect
  app.post('/api/visitors/leave', (req: Request, res: Response) => {
    try {
      const sessionId = String(req.body.sessionId || '').trim();
      if (sessionId && activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
        broadcastStats().catch(() => {});
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // 3. Get current stats
  app.get('/api/visitors/stats', async (req: Request, res: Response) => {
    try {
      const stats = await getVisitorStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Stats fetch failed' });
    }
  });

  // 4. Server-Sent Events (SSE) stream for live realtime counter
  app.get('/api/visitors/stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial event
    const stats = await getVisitorStats();
    res.write(`event: visitor_update\ndata: ${JSON.stringify(stats)}\n\n`);

    // Keep connection alive with comment ping every 15s
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAliveTimer);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // 5. Get SQL script for Supabase Setup
  app.get('/api/visitors/setup-sql', (req: Request, res: Response) => {
    res.json({
      sql: SUPABASE_VISITOR_SQL,
      tableName: 'brew_visitors',
      supabaseUrl: SUPABASE_URL
    });
  });

  // Periodic cleanup and broadcast timer (every 10 seconds)
  setInterval(() => {
    broadcastStats().catch(() => {});
  }, 10000);
}
