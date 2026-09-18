const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://cqgocwsqhsqdkyphfvvy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZ29jd3NxaHNxZGt5cGhmdnZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MjczMSwiZXhwIjoyMDg4MTE4NzMxfQ.25G6wE90KevLhB_47uI4c1o5Q_wR7qWj4_vF_1z_3_4';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const prompt = String(body?.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Load top tokens from Supabase or direct upstream
    let tokens: any[] = [];
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_KEY.startsWith('replace_') && !SUPABASE_KEY.startsWith('sb_publishable_')) {
      try {
        const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/brew_tokens?select=*&order=volume_24h_usd.desc&limit=100`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (supaRes.ok) {
          tokens = await supaRes.json();
        }
      } catch {}
    }

    if (!tokens.length) {
      try {
        const brewRes = await fetch('https://brew.family/api/shared/launches');
        if (brewRes.ok) {
          const brewData = await brewRes.json();
          tokens = Array.isArray(brewData) ? brewData : (brewData?.tokens || brewData?.launches || []);
        }
      } catch {}
    }

    const p = prompt.toLowerCase();
    let reply = '';
    let matchedTokens: any[] = [];

    if (p.includes('top') || p.includes('pick') || p.includes('rekomendasi') || p.includes('best') || p.includes('bagus')) {
      const best = [...tokens]
        .filter(t => (t.volume_24h_usd || t.volume24hUsd || t.volume24h || 0) > 0 || (t.liquidity_usd || t.liquidityUsd || 0) > 100)
        .sort((a, b) => (Number(b.agent_score || b.agentScore || 40)) - (Number(a.agent_score || a.agentScore || 40)))
        .slice(0, 3);
      matchedTokens = best;
      if (best.length > 0) {
        reply = `🎯 **AGENT BREW TOP CONVICTION PICKS:**\n\n` +
          best.map((tok, i) => `**#${i+1} ${tok.symbol} (${tok.name})**\n• Score: **${tok.agent_score || tok.agentScore || 50}/100**\n• MCap: $${Number(tok.market_cap_usd || tok.marketCap || 0).toLocaleString()} | 24h Vol: $${Number(tok.volume_24h_usd || tok.volume24hUsd || tok.volume24h || 0).toLocaleString()}`).join('\n\n') +
          `\n\n*Tactical playbook: Position size 0.05 - 0.15 BNB with tight -25% stop loss.*`;
      } else {
        reply = `🎯 **AGENT BREW TACTICAL PICKS:**\n\n1. **Liquid Pools**: Filter tokens with >$1,000 liquidity to reduce slippage.\n2. **Single-Dev Deployers**: Devs with 1 contract show higher commitment.\n3. **Order Flow**: Buy ratio >1.5x signals continuous accumulation.`;
      }
    } else if (p.includes('serial') || p.includes('risk') || p.includes('rug') || p.includes('bahaya') || p.includes('scam')) {
      const serials = tokens.filter(t => (t.creator_launch_count || t.creatorLaunchCount || 1) >= 4);
      matchedTokens = serials.slice(0, 3);
      reply = `🚨 **SERIAL DEV CLUSTER RISK REPORT:**\n\nIdentified **${serials.length} tokens** launched by repeat deployers (≥4 contracts on factory 0xeea6...3d85).\nSerial deployers have high liquidity abandonment rates. Always inspect GoPlus honeypot status and BubbleMaps wallet clustering.`;
    } else if (p.includes('safe') || p.includes('aman') || p.includes('single') || p.includes('gem')) {
      const singles = tokens.filter(t => (t.creator_launch_count || t.creatorLaunchCount || 1) === 1).slice(0, 3);
      matchedTokens = singles;
      reply = `🛡️ **SINGLE-DEV LIQUID GEMS:**\n\nFound **${singles.length} tokens** with dedicated single-contract deployers. Single-project devs carry significantly lower rug likelihood.`;
    } else if (p.includes('volume') || p.includes('vol') || p.includes('rame')) {
      const vols = [...tokens].sort((a, b) => Number(b.volume_24h_usd || b.volume24h || 0) - Number(a.volume_24h_usd || a.volume24h || 0)).slice(0, 3);
      matchedTokens = vols;
      reply = `⚡ **TOP 24H TRADING VOLUME LEADERS:**\n\n` +
        vols.map((v, i) => `**#${i+1} ${v.symbol}**: $${Number(v.volume_24h_usd || v.volume24h || 0).toLocaleString()} 24h vol`).join('\n');
    } else {
      reply = `🤖 **AGENT BREW TACTICAL COPILOT:**\n\nCommand received: "${prompt}".\n\n💡 **Suggested Commands:**\n• "Top picks token bagus"\n• "Deteksi serial deployer berisiko"\n• "Cari single-contract developer aman"\n• "Token volume transaksi tertinggi"`;
    }

    return res.status(200).json({
      reply,
      matchedTokens,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('API /api/copilot error:', err);
    return res.status(500).json({ error: err.message || 'Copilot execution failed' });
  }
}
