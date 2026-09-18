const BREW_SHARED_API = 'https://brew.family/api/shared/launches';

export default async function handler(req: any, res: any) {
  try {
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
      const rawImg = l.imageUrl || '';
      let artContract = '';
      let logoUrl = '';
      if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
        artContract = rawImg.replace('onchain://56/', '').toLowerCase();
        logoUrl = `https://brew.family/api/shared/artwork/${artContract}`;
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
