import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  runFullSync,
  searchTokens,
  inspectContract,
  fetchArtworks,
  requestJson,
  SUPABASE_URL,
  SERVICE_KEY
} from './scripts/script.ts';
import { registerVisitorRoutes } from './server/visitorTracker.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Register Realtime Visitor Tracker & Supabase Ingestion Routes
registerVisitorRoutes(app);

// In-memory cache for fast response
let cachedSnapshot: any = null;
let lastSyncTime = 0;
const artworkBufferCache = new Map<string, { mime: string; buf: Buffer }>();

// Helper to enrich tokens with live DexScreener prices and 24h change
async function enrichTokensWithDexScreener(tokens: any[]) {
  const pending = tokens.slice(0, 90);
  const chunks: any[][] = [];
  for (let i = 0; i < pending.length; i += 30) {
    chunks.push(pending.slice(i, i + 30));
  }

  await Promise.allSettled(
    chunks.map(async chunk => {
      try {
        const addrs = chunk.map(t => t.address).filter(Boolean).join(',');
        if (!addrs) return;
        const res = await requestJson(`https://api.dexscreener.com/tokens/v1/bsc/${addrs}`);
        if (!Array.isArray(res)) return;

        const bestPairs: Record<string, any> = {};
        for (const pair of res) {
          const baseAddr = (pair.baseToken?.address || '').toLowerCase();
          if (!baseAddr) continue;
          if (!bestPairs[baseAddr] || (pair.liquidity?.usd || 0) > (bestPairs[baseAddr].liquidity?.usd || 0)) {
            bestPairs[baseAddr] = pair;
          }
        }

        for (const token of chunk) {
          const p = bestPairs[token.address.toLowerCase()];
          if (p) {
            token.priceUsd = parseFloat(p.priceUsd) || token.priceUsd;
            token.priceChange24h = p.priceChange?.h24 != null ? Number(p.priceChange.h24) : token.priceChange24h;
            token.volume24h = p.volume?.h24 != null ? Number(p.volume.h24) : token.volume24h;
            token.liquidityUsd = p.liquidity?.usd != null ? Number(p.liquidity.usd) : token.liquidityUsd;
            token.marketCap = Number(p.marketCap || p.fdv || token.marketCap);
            if (p.info?.imageUrl) {
              token.logoUrl = p.info.imageUrl;
            }
            token.buys24h = Number(p.txns?.h24?.buys || token.buys24h);
            token.sells24h = Number(p.txns?.h24?.sells || token.sells24h);
            token.buyRatio = token.sells24h > 0 ? Math.round((token.buys24h / token.sells24h) * 100) / 100 : token.buyRatio;
            token.pool = p.pairAddress || token.pool;
            token.dexUrl = p.url || token.dexUrl;
          }
        }
      } catch (err) {
        // silent fallback
      }
    })
  );

  // Compute implied bonding curve prices for tokens without DEX trading yet
  for (const t of tokens) {
    if ((!t.priceUsd || t.priceUsd === 0) && t.marketCap > 0) {
      t.priceUsd = t.marketCap / 1000000000;
    }
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cached: !!cachedSnapshot,
    lastSyncTime,
    timestamp: Date.now()
  });
});

// 2. Tokens endpoint
app.get('/api/tokens', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    if (!force && cachedSnapshot && Date.now() - lastSyncTime < 120000) {
      return res.json(cachedSnapshot);
    }

    // Try reading from Supabase
    const anonKey = process.env.SUPABASE_ANON_KEY || SERVICE_KEY || '';
    if (anonKey) {
      try {
        const rows: any[] = [];
        const pageSize = 500;
        for (let offset = 0; offset < 2500; offset += pageSize) {
          const page = await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens?select=*&order=launched_at.desc&limit=${pageSize}&offset=${offset}`, {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            }
          });
          if (!Array.isArray(page) || page.length === 0) break;
          rows.push(...page);
          if (page.length < pageSize) break;
        }

        if (rows.length > 0) {
          const creatorCounts = rows.reduce((acc: Record<string, number>, r: any) => {
            const c = String(r.creator || '').toLowerCase();
            if (c) acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {});

          const tokens = rows.map((r, idx) => {
            const rawImg = r.image_url || '';
            let artContract = '';
            let logoUrl = '';
            if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
              artContract = rawImg.replace('onchain://56/', '').toLowerCase();
              logoUrl = `/api/artwork/${artContract}`;
            } else if (typeof rawImg === 'string' && rawImg.startsWith('http')) {
              logoUrl = rawImg;
            }

            const cAddr = String(r.creator || '').toLowerCase().trim();
            const launchCount = creatorCounts[cAddr] || Number(r.creator_launch_count) || 1;

            return {
              index: idx + 1,
              address: r.address,
              pool: r.pool || r.pair_address || '',
              creator: r.creator || '',
              creatorLaunchCount: launchCount,
              name: r.name || 'Brew Token',
              symbol: r.symbol || 'BREW',
              quoteSymbol: r.quote_symbol || 'WBNB',
              quoteAddress: r.quote_address || '',
              launchedAt: r.launched_at || 0,
              blockNumber: r.block_number || 0,
              txHash: r.transaction_hash || '',
              logoUrl,
              fallbackLogoUrl: `https://dd.dexscreener.com/ds-data/tokens/bsc/${r.address}.png`,
              onchainArtworkContract: artContract,
              description: r.description || '',
              twitterUrl: r.twitter_url || '',
              websiteUrl: r.website_url || '',
              telegramUrl: r.telegram_url || '',
              priceUsd: Number(r.price_usd || 0),
              priceChange24h: Number(r.price_change_24h || 0),
              volume24h: Number(r.volume_24h_usd || 0),
              liquidityUsd: Number(r.liquidity_usd || 0),
              marketCap: Number(r.market_cap_usd || 0),
              buys24h: Number(r.buys_24h || 0),
              sells24h: Number(r.sells_24h || 0),
              buyRatio: Number(r.buy_ratio || 1),
              agentScore: Number(r.agent_score || 40),
              agentVerdict: r.agent_verdict || 'NETRAL',
              agentSignals: Array.isArray(r.agent_signals) ? r.agent_signals : [],
              dexUrl: r.dex_url || `https://dexscreener.com/bsc/${r.pool || r.address}`,
              brewUrl: `https://brew.family/token/${r.address}`,
              bubblemapsUrl: `https://bubblemaps.io/bsc/token/${r.address}`,
              bscscanTokenUrl: `https://bscscan.com/token/${r.address}`,
              bscscanCreatorUrl: r.creator ? `https://bscscan.com/address/${r.creator}` : '',
              bscscanTxUrl: r.transaction_hash ? `https://bscscan.com/tx/${r.transaction_hash}` : ''
            };
          });

          // Enrich top tokens with live DexScreener price and 24h change
          await enrichTokensWithDexScreener(tokens);

          let totalVol = 0;
          let totalMcap = 0;
          let activePairs = 0;
          tokens.forEach(t => {
            if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
              activePairs++;
              totalVol += t.volume24h;
              totalMcap += t.marketCap;
            }
          });

          cachedSnapshot = {
            totalLaunches: rows.length,
            factory: '0xeea6c3bfb29fd9a35380438956bae7b109c63d85',
            updatedAt: Date.now(),
            stats: {
              totalTrackedVol: Math.round(totalVol * 100) / 100,
              totalTrackedMcap: Math.round(totalMcap * 100) / 100,
              activePairs,
              multiTokenDevs: Object.values(creatorCounts).filter((c: number) => c > 1).length
            },
            tokens
          };
          lastSyncTime = Date.now();
          return res.json(cachedSnapshot);
        }
      } catch (e) {
        console.error('Supabase read error:', e);
      }
    }

    // Fallback directly to brew.family launches
    const brewData = await requestJson('https://brew.family/api/shared/launches');
    const launches = Array.isArray(brewData) ? brewData : (brewData?.tokens || brewData?.launches || []);

    // Accurately compute creator launch counts across all launches
    const creatorCounts = launches.reduce((acc: Record<string, number>, l: any) => {
      const c = String(l.creator || '').toLowerCase().trim();
      if (c) acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    const multiTokenDevsCount = Object.values(creatorCounts).filter((cnt: any) => cnt > 1).length;

    const tokens = launches.map((l: any, idx: number) => {
      const rawImg = l.imageUrl || '';
      let artContract = '';
      let logoUrl = '';
      if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
        artContract = rawImg.replace('onchain://56/', '').toLowerCase();
        logoUrl = `/api/artwork/${artContract}`;
      } else if (typeof rawImg === 'string' && rawImg.startsWith('http')) {
        logoUrl = rawImg;
      }

      const cAddr = String(l.creator || '').toLowerCase().trim();
      const launchCount = creatorCounts[cAddr] || 1;

      return {
        index: idx + 1,
        address: l.address,
        pool: l.pool || '',
        creator: l.creator || '',
        creatorLaunchCount: launchCount,
        name: l.name || 'Brew Token',
        symbol: l.symbol || 'BREW',
        quoteSymbol: l.quoteSymbol || 'WBNB',
        quoteAddress: l.quoteAddress || '',
        launchedAt: l.launchedAt || Date.now(),
        blockNumber: l.blockNumber || 0,
        txHash: l.transactionHash || '',
        logoUrl,
        fallbackLogoUrl: `https://dd.dexscreener.com/ds-data/tokens/bsc/${l.address}.png`,
        onchainArtworkContract: artContract,
        description: l.description || '',
        twitterUrl: l.twitter || '',
        websiteUrl: l.website || '',
        priceUsd: l.priceUsd || (l.marketCapUsd ? l.marketCapUsd / 1000000000 : 0),
        priceChange24h: 0,
        volume24h: l.volume24hUsd || 0,
        liquidityUsd: 0,
        marketCap: l.marketCapUsd || 0,
        buys24h: 0,
        sells24h: 0,
        buyRatio: 1,
        agentScore: 45,
        agentVerdict: 'NETRAL',
        agentSignals: ['Data Launchpad Standar'],
        dexUrl: `https://dexscreener.com/bsc/${l.pool || l.address}`,
        brewUrl: `https://brew.family/token/${l.address}`,
        bubblemapsUrl: `https://bubblemaps.io/bsc/token/${l.address}`,
        bscscanTokenUrl: `https://bscscan.com/token/${l.address}`,
        bscscanCreatorUrl: l.creator ? `https://bscscan.com/address/${l.creator}` : '',
        bscscanTxUrl: l.transactionHash ? `https://bscscan.com/tx/${l.transactionHash}` : ''
      };
    });

    await enrichTokensWithDexScreener(tokens);

    let totalVol = 0;
    let totalMcap = 0;
    let activePairs = 0;
    tokens.forEach((t: any) => {
      if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
        activePairs++;
        totalVol += t.volume24h;
        totalMcap += t.marketCap;
      }
    });

    cachedSnapshot = {
      totalLaunches: tokens.length,
      factory: '0xeea6c3bfb29fd9a35380438956bae7b109c63d85',
      updatedAt: Date.now(),
      stats: {
        totalTrackedVol: Math.round(totalVol * 100) / 100,
        totalTrackedMcap: Math.round(totalMcap * 100) / 100,
        activePairs,
        multiTokenDevs: multiTokenDevsCount
      },
      tokens
    };
    lastSyncTime = Date.now();
    res.json(cachedSnapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// 3. Trigger full sync
app.post('/api/sync', async (req, res) => {
  try {
    const payload = await runFullSync();
    cachedSnapshot = payload;
    lastSyncTime = Date.now();
    res.json({ success: true, count: payload.tokens.length, updatedAt: payload.updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// 4. Live search
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ tokens: [], count: 0 });
    const result = await searchTokens(q);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// 5. Inspect single contract
app.get('/api/inspect', async (req, res) => {
  try {
    const address = String(req.query.address || '').trim();
    if (!address) return res.status(400).json({ error: 'Missing address parameter' });
    const result = await inspectContract(address);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Inspection failed' });
  }
});

// 6. Batch artwork decoder proxy
app.get('/api/artworks', async (req, res) => {
  try {
    const addresses = String(req.query.addresses || '').split(',').map(a => a.trim()).filter(Boolean);
    if (!addresses.length) return res.json({ artworks: {} });
    const artworks = await fetchArtworks(addresses);
    res.json({ artworks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Artwork decoding failed' });
  }
});

// 6b. Single binary artwork image endpoint with caching
app.get('/api/artwork/:address', async (req, res) => {
  const addr = (req.params.address || '').toLowerCase().trim();
  if (!addr) return res.status(404).send('Missing address');

  if (artworkBufferCache.has(addr)) {
    const cached = artworkBufferCache.get(addr)!;
    res.setHeader('Content-Type', cached.mime);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(cached.buf);
  }

  try {
    const data = await requestJson(`https://brew.family/api/shared/artwork/${addr}`);
    if (data && data.image) {
      const match = data.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buf = Buffer.from(match[2], 'base64');
        artworkBufferCache.set(addr, { mime, buf });
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return res.send(buf);
      } else if (data.image.startsWith('http')) {
        return res.redirect(data.image);
      }
    }
    return res.status(404).send('Artwork not found');
  } catch (err: any) {
    return res.status(404).send('Artwork load failed');
  }
});

// 7. Tactical Copilot chat (Manual Rule & Intelligence Engine - No GenAI)
app.post('/api/copilot', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Tactical deterministic manual intelligence engine
    const p = String(prompt).toLowerCase().trim();
    const tokens: any[] = cachedSnapshot?.tokens || [];
    let reply = '';
    let matchedTokens: any[] = [];

    if (p.includes('top') || p.includes('pick') || p.includes('rekomendasi') || p.includes('best') || p.includes('bagus')) {
      const best = [...tokens].filter(t => t.volume24h > 0 || t.liquidityUsd > 100).sort((a, b) => (b.agentScore || 0) - (a.agentScore || 0)).slice(0, 3);
      matchedTokens = best;
      if (best.length > 0) {
        reply = `🎯 **AGENT BREW TOP CONVICTION PICKS (MANUAL ENGINE):**\n\n` +
          best.map((tok, i) => `**#${i+1} ${tok.symbol} (${tok.name})**\n• Score: **${tok.agentScore}/100** [${tok.agentVerdict}]\n• MCap: $${Number(tok.marketCap || 0).toLocaleString()} | Liq: $${Number(tok.liquidityUsd || 0).toLocaleString()} | 24h Vol: $${Number(tok.volume24h || 0).toLocaleString()}\n• Signals: ${(tok.agentSignals || []).join(' • ')}`).join('\n\n') +
          `\n\n*Tactical playbook: Position size 0.05 - 0.15 BNB with tight -25% stop loss.*`;
      } else {
        reply = `🎯 **AGENT BREW TACTICAL PICKS:**\n\n1. **Liquid Pools**: Filter tokens with >$1,000 liquidity to reduce slippage.\n2. **Single-Dev Deployers**: Devs with 1 contract show higher commitment.\n3. **Order Flow**: Buy ratio >1.5x signals continuous accumulation.`;
      }
    } else if (p.includes('serial') || p.includes('risk') || p.includes('rug') || p.includes('bahaya') || p.includes('scam')) {
      const serials = tokens.filter(t => t.creatorLaunchCount >= 4);
      matchedTokens = serials.slice(0, 3);
      reply = `🚨 **SERIAL DEV CLUSTER RISK REPORT:**\n\nIdentified **${serials.length} tokens** launched by repeat deployers (≥4 contracts on factory 0xeea6...3d85).\nSerial deployers have high liquidity abandonment rates. Always inspect GoPlus honeypot status and BubbleMaps wallet clustering.`;
    } else if (p.includes('safe') || p.includes('aman') || p.includes('single') || p.includes('gem')) {
      const singles = tokens.filter(t => t.creatorLaunchCount === 1 && (t.liquidityUsd > 500 || t.agentScore >= 65)).sort((a, b) => (b.agentScore || 0) - (a.agentScore || 0)).slice(0, 3);
      matchedTokens = singles;
      reply = `🛡️ **SINGLE-DEV LIQUID GEMS (MANUAL AUDIT):**\n\nFound **${singles.length} tokens** with dedicated single-contract deployers and active pool depth. Single-project devs carry significantly lower rug likelihood.`;
    } else if (p.includes('volume') || p.includes('vol') || p.includes('rame')) {
      const vols = [...tokens].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0)).slice(0, 3);
      matchedTokens = vols;
      reply = `⚡ **TOP 24H TRADING VOLUME LEADERS:**\n\n` +
        vols.map((v, i) => `**#${i+1} ${v.symbol}**: $${Number(v.volume24h || 0).toLocaleString()} 24h vol | Liq: $${Number(v.liquidityUsd || 0).toLocaleString()}`).join('\n');
    } else if (p.includes('fresh') || p.includes('new') || p.includes('baru')) {
      const fresh = [...tokens].sort((a, b) => (b.launchedAt || 0) - (a.launchedAt || 0)).slice(0, 3);
      matchedTokens = fresh;
      reply = `🆕 **FRESHEST LAUNCHES ON BREW FACTORY:**\n\n` +
        fresh.map((f, i) => `**#${i+1} ${f.symbol}**: ${f.name} (Launched ${new Date(f.launchedAt).toLocaleDateString()})`).join('\n');
    } else {
      const direct = tokens.find(t =>
        t.symbol?.toLowerCase() === p ||
        t.name?.toLowerCase() === p ||
        t.address?.toLowerCase() === p
      );
      if (direct) {
        matchedTokens = [direct];
        reply = `📊 **TACTICAL AUDIT: ${direct.symbol} (${direct.name})**\n\n• Price: $${direct.priceUsd || 0} (${direct.priceChange24h > 0 ? '+' : ''}${Number(direct.priceChange24h || 0).toFixed(2)}%)\n• Market Cap: $${Number(direct.marketCap || 0).toLocaleString()} | Liquidity: $${Number(direct.liquidityUsd || 0).toLocaleString()}\n• 24h Volume: $${Number(direct.volume24h || 0).toLocaleString()} | Score: ${direct.agentScore}/100 [${direct.agentVerdict}]\n• Dev History: ${direct.creatorLaunchCount} contract(s) deployed.\n• Signals: ${(direct.agentSignals || []).join(' • ')}`;
      } else {
        reply = `🤖 **AGENT BREW TACTICAL ENGINE (MANUAL MODE)**\n\nSystem running deterministic on-chain analysis. Factory: \`0xeea6c3bfb29fd9a35380438956bae7b109c63d85\`.\n\nType any token symbol (e.g. *BREW*), contract address (\`0x...\`), or quick commands (*top picks*, *single dev*, *serial dev*, *volume*, *fresh*).`;
      }
    }

    res.json({ reply, tokensMatch: matchedTokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Copilot query failed' });
  }
});

// Vite middleware / static fallback
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Agent BREW server running on http://0.0.0.0:${PORT}`);
    // Periodic background refresh for cached snapshot tokens
    setInterval(async () => {
      if (cachedSnapshot && Array.isArray(cachedSnapshot.tokens)) {
        try {
          await enrichTokensWithDexScreener(cachedSnapshot.tokens);
          let totalVol = 0;
          let totalMcap = 0;
          let activePairs = 0;
          cachedSnapshot.tokens.forEach((t: any) => {
            if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
              activePairs++;
              totalVol += t.volume24h;
              totalMcap += t.marketCap;
            }
          });
          cachedSnapshot.stats = {
            ...cachedSnapshot.stats,
            totalTrackedVol: Math.round(totalVol * 100) / 100,
            totalTrackedMcap: Math.round(totalMcap * 100) / 100,
            activePairs
          };
          cachedSnapshot.updatedAt = Date.now();
          lastSyncTime = Date.now();
        } catch {}
      }
    }, 45000);
  });
}

startServer();
