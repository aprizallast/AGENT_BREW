const BREW_SHARED_API = 'https://brew.family/api/shared/launches';

let memoryTokensCache: any = null;
let memoryCacheTime = 0;

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
        const res = await fetch(`https://api.dexscreener.com/tokens/v1/bsc/${addrs}`);
        if (!res.ok) return;
        const pairs = await res.json();
        if (!Array.isArray(pairs)) return;

        const bestPairs: Record<string, any> = {};
        for (const pair of pairs) {
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
      } catch {
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

export default async function handler(req: any, res: any) {
  try {
    const isForce = req.query?.force === 'true' || req.body?.force === true;
    const now = Date.now();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!isForce && memoryTokensCache && (now - memoryCacheTime < 25000)) {
      return res.status(200).json(memoryTokensCache);
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    let tokens: any[] = [];
    let creatorCounts: Record<string, number> = {};

    // 1. Try reading all tokens from Supabase if configured
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_KEY.startsWith('replace_') && !SUPABASE_KEY.startsWith('sb_publishable_')) {
      try {
        const rows: any[] = [];
        const pageSize = 1000;
        for (let offset = 0; offset < 4000; offset += pageSize) {
          const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/brew_tokens?select=*&order=launched_at.desc&limit=${pageSize}&offset=${offset}`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });

          if (!supaRes.ok) break;
          const page = await supaRes.json();
          if (!Array.isArray(page) || page.length === 0) break;
          rows.push(...page);
          if (page.length < pageSize) break;
        }

        if (rows.length > 0) {
          creatorCounts = rows.reduce((acc: Record<string, number>, r: any) => {
            const c = String(r.creator || '').toLowerCase().trim();
            if (c) acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {});

          tokens = rows.map((r: any, idx: number) => {
            let rawImg = r.raw_data?.imageUrl || r.raw_data?.image || '';
            if (!rawImg && r.image_url && !r.image_url.includes('dd.dexscreener.com')) {
              rawImg = r.image_url;
            }
            if (!rawImg) {
              rawImg = r.image_url || '';
            }

            let artContract = '';
            let logoUrl = '';

            if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
              artContract = rawImg.replace('onchain://56/', '').toLowerCase().trim();
              logoUrl = `/api/artwork/${artContract}`;
            } else if (typeof rawImg === 'string' && (rawImg.startsWith('data:image') || (rawImg.startsWith('http') && !rawImg.includes('dd.dexscreener.com')))) {
              logoUrl = rawImg;
            } else if (typeof r.image_url === 'string' && (r.image_url.startsWith('data:image') || (r.image_url.startsWith('http') && !r.image_url.includes('dd.dexscreener.com')))) {
              logoUrl = r.image_url;
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
        }
      } catch (err) {
        console.warn('Supabase query error in /api/tokens:', err);
      }
    }

    // 2. Direct Fallback to brew.family if Supabase is empty or unavailable
    if (tokens.length === 0) {
      const brewRes = await fetch(BREW_SHARED_API);
      if (!brewRes.ok) {
        return res.status(502).json({ error: 'Failed to fetch from upstream launchpad' });
      }
      const brewData = await brewRes.json();
      const launches = Array.isArray(brewData) ? brewData : (brewData?.tokens || brewData?.launches || []);

      creatorCounts = launches.reduce((acc: Record<string, number>, l: any) => {
        const c = String(l.creator || '').toLowerCase().trim();
        if (c) acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {});

      tokens = launches.map((l: any, idx: number) => {
        const rawImg = l.imageUrl || l.image || '';
        let artContract = '';
        let logoUrl = '';
        if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
          artContract = rawImg.replace('onchain://56/', '').toLowerCase().trim();
          logoUrl = `/api/artwork/${artContract}`;
        } else if (typeof rawImg === 'string' && (rawImg.startsWith('data:image') || rawImg.startsWith('http'))) {
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
          agentScore: launchCount >= 4 ? 20 : (launchCount === 1 ? 65 : 45),
          agentVerdict: launchCount >= 4 ? 'RISIKO TINGGI' : 'NETRAL',
          agentSignals: launchCount >= 4 ? [`Serial Deployer (${launchCount} tokens)`] : ['Standard Launch'],
          dexUrl: `https://dexscreener.com/bsc/${l.pool || l.address}`,
          brewUrl: `https://brew.family/token/${l.address}`,
          bubblemapsUrl: `https://bubblemaps.io/bsc/token/${l.address}`,
          bscscanTokenUrl: `https://bscscan.com/token/${l.address}`,
          bscscanCreatorUrl: l.creator ? `https://bscscan.com/address/${l.creator}` : '',
          bscscanTxUrl: l.transactionHash ? `https://bscscan.com/tx/${l.transactionHash}` : ''
        };
      });
    }

    // Enrich top tokens with live DexScreener trading metrics (Price, 24h Vol, FDV, Liquidity)
    await enrichTokensWithDexScreener(tokens);

    let totalVol = 0;
    let totalMcap = 0;
    let activePairs = 0;
    tokens.forEach(t => {
      if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
        activePairs++;
        totalVol += (t.volume24h || 0);
        totalMcap += (t.marketCap || 0);
      }
    });

    const multiTokenDevsCount = Object.values(creatorCounts).filter((c: any) => c > 1).length;

    const resultPayload = {
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

    memoryTokensCache = resultPayload;
    memoryCacheTime = Date.now();

    return res.status(200).json(resultPayload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
