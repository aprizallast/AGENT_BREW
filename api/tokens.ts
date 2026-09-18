const BREW_SHARED_API = 'https://brew.family/api/shared/launches';

export default async function handler(req: any, res: any) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_KEY.startsWith('replace_') && !SUPABASE_KEY.startsWith('sb_publishable_')) {
      try {
        const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/brew_tokens?select=*&order=launched_at.desc&limit=1000`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });

        if (supaRes.ok) {
          const rows = await supaRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const creatorCounts = rows.reduce((acc: Record<string, number>, r: any) => {
              const c = String(r.creator || '').toLowerCase();
              if (c) acc[c] = (acc[c] || 0) + 1;
              return acc;
            }, {});

            const tokens = rows.map((r: any, idx: number) => {
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

            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
            return res.status(200).json({
              totalLaunches: tokens.length,
              factory: '0xeea6c3bfb29fd9a35380438956bae7b109c63d85',
              updatedAt: Date.now(),
              stats: {
                totalTrackedVol: 0,
                totalTrackedMcap: 0,
                activePairs: 0,
                multiTokenDevs: Object.values(creatorCounts).filter((c: any) => c > 1).length
              },
              tokens
            });
          }
        }
      } catch (err) {
        console.error('Supabase query error:', err);
      }
    }

    // Direct fallback to upstream brew.family launches
    const brewRes = await fetch(BREW_SHARED_API);
    if (!brewRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch from upstream launchpad' });
    }
    const brewData = await brewRes.json();
    const launches = Array.isArray(brewData) ? brewData : (brewData?.tokens || brewData?.launches || []);

    const creatorCounts = launches.reduce((acc: Record<string, number>, l: any) => {
      const c = String(l.creator || '').toLowerCase().trim();
      if (c) acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    const tokens = launches.map((l: any, idx: number) => {
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

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({
      totalLaunches: tokens.length,
      factory: '0xeea6c3bfb29fd9a35380438956bae7b109c63d85',
      updatedAt: Date.now(),
      stats: {
        totalTrackedVol: 0,
        totalTrackedMcap: 0,
        activePairs: 0,
        multiTokenDevs: Object.values(creatorCounts).filter((c: any) => c > 1).length
      },
      tokens
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
