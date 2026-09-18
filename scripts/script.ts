/**
 * Agent BREW Launchpad Sync & Tactical Intel Engine
 * Syncs brew.family launches, on-chain artworks, DexScreener metrics, and GoPlus token security.
 */

import dotenv from 'dotenv';
dotenv.config();

export type ScriptArgs = {
  fetchArtworks?: string[];
  searchQuery?: string;
  customAddress?: string;
};

const argsPayload: ScriptArgs = (typeof process !== 'undefined' && process.argv)
  ? process.argv.slice(2).reduce<ScriptArgs>((args: ScriptArgs, value: string, index: number, values: string[]) => {
      if (value === '--search' && values[index + 1]) args.searchQuery = values[index + 1];
      if (value === '--address' && values[index + 1]) args.customAddress = values[index + 1];
      if (value === '--artworks' && values[index + 1]) args.fetchArtworks = values[index + 1].split(',');
      return args;
    }, {})
  : {};

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://cqgocwsqhsqdkyphfvvy.supabase.co';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZ29jd3NxaHNxZGt5cGhmdnZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MjczMSwiZXhwIjoyMDg4MTE4NzMxfQ.25G6wE90KevLhB_47uI4c1o5Q_wR7qWj4_vF_1z_3_4';

export async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json'
    }
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}: ${String(text).slice(0, 300)}`);
  }
  return data;
}

export async function fetchArtworks(addresses: string[]): Promise<Record<string, string>> {
  const artAddrs = addresses.slice(0, 30);
  const artworks: Record<string, string> = {};
  for (const a of artAddrs) {
    const cleanAddr = String(a).toLowerCase();
    try {
      const artRes = await requestJson(`https://brew.family/api/shared/artwork/${cleanAddr}`);
      if (artRes && artRes.image) {
        artworks[cleanAddr] = artRes.image;
      }
    } catch {}
  }
  return artworks;
}

export async function searchTokens(query: string) {
  const q = String(query).trim();
  let foundTokens: any[] = [];

  if (SERVICE_KEY && !SERVICE_KEY.startsWith('replace_')) {
    try {
      const supaSearch = await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens?or=(symbol.ilike.*${encodeURIComponent(q)}*,name.ilike.*${encodeURIComponent(q)}*,address.ilike.*${encodeURIComponent(q)}*)&limit=20`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      if (Array.isArray(supaSearch) && supaSearch.length > 0) {
        foundTokens = supaSearch;
      }
    } catch {}
  }

  if (foundTokens.length === 0) {
    try {
      const brewRes = await requestJson(`https://brew.family/api/shared/launches/search?q=${encodeURIComponent(q)}`);
      if (brewRes && Array.isArray(brewRes.tokens)) {
        foundTokens = brewRes.tokens;
      }
    } catch {}
  }

  return {
    searchQuery: q,
    count: foundTokens.length,
    tokens: foundTokens
  };
}

export async function inspectContract(address: string) {
  const addr = String(address).toLowerCase();

  let brewLaunch: any = null;
  try {
    const brewRes = await requestJson(`https://brew.family/api/shared/launches/search?q=${addr}`);
    if (brewRes && Array.isArray(brewRes.tokens) && brewRes.tokens.length > 0) {
      brewLaunch = brewRes.tokens.find((t: any) => (t.address || '').toLowerCase() === addr) || brewRes.tokens[0];
    }
  } catch {}

  let ds: any = null;
  try {
    const dsRes = await requestJson(`https://api.dexscreener.com/tokens/v1/bsc/${addr}`);
    if (Array.isArray(dsRes) && dsRes.length > 0) ds = dsRes[0];
  } catch {}

  let security: any = null;
  try {
    const secRes = await requestJson(`https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses=${addr}`);
    if (secRes && secRes.result && secRes.result[addr]) security = secRes.result[addr];
  } catch {}

  const resolvedCreator = brewLaunch?.creator || security?.creator_address || security?.owner_address || '';

  let otherDevTokens: any[] = [];
  if (resolvedCreator && SERVICE_KEY && !SERVICE_KEY.startsWith('replace_')) {
    try {
      const supaOther = await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens?creator=ilike.${encodeURIComponent(resolvedCreator)}&limit=15`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      if (Array.isArray(supaOther)) {
        otherDevTokens = supaOther.filter(x => (x.address || '').toLowerCase() !== addr);
      }
    } catch {}
  }

  // Update Supabase if we have valid real name/symbol and valid service key
  if ((brewLaunch?.name || ds?.baseToken?.name) && SERVICE_KEY && !SERVICE_KEY.startsWith('replace_')) {
    try {
      await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([{
          address: addr,
          name: (brewLaunch?.name || ds?.baseToken?.name || 'Brew Token').slice(0, 100),
          symbol: (brewLaunch?.symbol || ds?.baseToken?.symbol || 'BREW').slice(0, 50),
          creator: (resolvedCreator || '').toLowerCase(),
          pool: (brewLaunch?.pool || ds?.pairAddress || '').toLowerCase(),
          quote_symbol: brewLaunch?.quoteSymbol || ds?.quoteToken?.symbol || 'WBNB',
          price_usd: ds ? parseFloat(ds.priceUsd) || 0 : (brewLaunch?.priceUsd || 0),
          market_cap_usd: ds ? Number(ds.marketCap || ds.fdv || 0) : (brewLaunch?.marketCapUsd || 0),
          volume_24h_usd: ds?.volume?.h24 != null ? Number(ds.volume.h24) : (brewLaunch?.volume24hUsd || 0),
          liquidity_usd: ds?.liquidity?.usd != null ? Number(ds.liquidity.usd) : 0,
          image_url: brewLaunch?.imageUrl || ds?.info?.imageUrl || '',
          launched_at: brewLaunch?.launchedAt || Date.now(),
          block_number: brewLaunch?.blockNumber || 0,
          transaction_hash: brewLaunch?.transactionHash || ''
        }])
      });
    } catch {}
  }

  return {
    customResult: true,
    address: addr,
    pair: ds,
    brewLaunch,
    security,
    creator: resolvedCreator,
    otherDevTokens
  };
}

export async function runFullSync() {
  if (!SERVICE_KEY || SERVICE_KEY === 'replace_with_rotated_service_role_key' || SERVICE_KEY.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi sebagai secret/environment variable.');
  }

  // 1. Sync Brew launch catalog into Supabase in batches
  const launchResponse = await requestJson('https://brew.family/api/shared/launches');
  const launches = Array.isArray(launchResponse)
    ? launchResponse
    : (launchResponse?.tokens || launchResponse?.launches || []);

  const toUpsert = launches
    .filter((launch: any) => launch.address)
    .map((launch: any) => ({
      address: String(launch.address).toLowerCase(),
      name: String(launch.name || 'Brew Token').slice(0, 100),
      symbol: String(launch.symbol || 'BREW').slice(0, 50),
      creator: String(launch.creator || '').toLowerCase(),
      pool: String(launch.pool || '').toLowerCase(),
      pair_address: String(launch.pool || '').toLowerCase(),
      quote_symbol: launch.quoteSymbol || 'WBNB',
      quote_address: String(launch.quoteAddress || '').toLowerCase(),
      market_cap_usd: Number(launch.marketCapUsd || 0),
      volume_24h_usd: Number(launch.volume24hUsd || 0),
      image_url: launch.imageUrl || '',
      launched_at: launch.launchedAt || Date.now(),
      block_number: launch.blockNumber || 0,
      transaction_hash: launch.transactionHash || '',
      raw_data: launch,
      data_source: 'brew.family',
      last_seen_at: new Date().toISOString()
    }));

  for (let offset = 0; offset < toUpsert.length; offset += 100) {
    const batch = toUpsert.slice(offset, offset + 100);
    await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(batch)
    });
  }

  // 2. Read all tokens from Supabase in pages of 500
  const dbTokens: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const supaRes = await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens?order=launched_at.desc&limit=${pageSize}&offset=${offset}`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    if (!Array.isArray(supaRes) || supaRes.length === 0) break;
    dbTokens.push(...supaRes);
    if (supaRes.length < pageSize) break;
  }

  // 3. DexScreener enrichment for top 60 tokens
  const topAddrs = dbTokens.slice(0, 60).map(t => t.address);
  const dexMap: Record<string, any> = {};
  if (topAddrs.length > 0) {
    for (let i = 0; i < topAddrs.length; i += 30) {
      const chunk = topAddrs.slice(i, i + 30);
      try {
        const dsRes = await requestJson(`https://api.dexscreener.com/tokens/v1/bsc/${chunk.join(',')}`);
        if (Array.isArray(dsRes)) {
          for (const p of dsRes) {
            const b = p.baseToken?.address?.toLowerCase();
            if (b && (!dexMap[b] || (p.liquidity?.usd || 0) > (dexMap[b].liquidity?.usd || 0))) {
              dexMap[b] = p;
            }
          }
        }
      } catch {}
    }
  }

  // 4. Pre-decode artworks for the top 15 tokens
  const preloadedArtworks: Record<string, string> = {};
  for (let i = 0; i < Math.min(15, dbTokens.length); i++) {
    const item = dbTokens[i];
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('onchain://56/')) {
      const artAddr = item.image_url.replace('onchain://56/', '').toLowerCase();
      try {
        const aRes = await requestJson(`https://brew.family/api/shared/artwork/${artAddr}`);
        if (aRes && aRes.image) {
          preloadedArtworks[artAddr] = aRes.image;
        }
      } catch {}
    }
  }

  // 5. Dev group mapping
  const devMap: Record<string, number> = {};
  for (const t of dbTokens) {
    const c = (t.creator || '').toLowerCase();
    if (c) {
      devMap[c] = (devMap[c] || 0) + 1;
    }
  }

  let totalTrackedVol = 0;
  let totalTrackedMcap = 0;
  let activePairs = 0;

  const enriched = dbTokens.map((t, idx) => {
    const ds = dexMap[t.address.toLowerCase()];
    const priceUsd = ds ? parseFloat(ds.priceUsd) || 0 : parseFloat(t.price_usd) || 0;
    const priceChange24h = ds?.priceChange?.h24 != null ? Number(ds.priceChange.h24) : 0;
    const volume24h = ds?.volume?.h24 != null ? Number(ds.volume.h24) : (parseFloat(t.volume_24h_usd) || 0);
    const liquidityUsd = ds?.liquidity?.usd != null ? Number(ds.liquidity.usd) : (parseFloat(t.liquidity_usd) || 0);
    const marketCap = ds ? Number(ds.marketCap || ds.fdv || 0) : (parseFloat(t.market_cap_usd) || 0);

    if (volume24h > 0 || marketCap > 0 || liquidityUsd > 0) {
      activePairs++;
      totalTrackedVol += volume24h;
      totalTrackedMcap += marketCap;
    }

    const buys24h = ds?.txns?.h24?.buys || 0;
    const sells24h = ds?.txns?.h24?.sells || 0;
    const buyRatio = sells24h > 0 ? (buys24h / sells24h) : (buys24h > 0 ? 2 : 1);
    const fallbackLogoUrl = `https://dd.dexscreener.com/ds-data/tokens/bsc/${t.address}.png`;

    let rawImg = t.image_url || '';
    let artContract = '';
    let logoUrl = '';
    if (typeof rawImg === 'string' && rawImg.startsWith('onchain://56/')) {
      artContract = rawImg.replace('onchain://56/', '').toLowerCase();
      if (preloadedArtworks[artContract]) {
        logoUrl = preloadedArtworks[artContract];
      }
    } else if (typeof rawImg === 'string' && rawImg.startsWith('http') && !rawImg.includes('/api/shared/artwork/')) {
      logoUrl = rawImg;
    }
    if (!logoUrl && ds?.info?.imageUrl) logoUrl = ds.info.imageUrl;
    if (!logoUrl) logoUrl = fallbackLogoUrl;

    const creatorLower = (t.creator || '').toLowerCase();
    const devCount = devMap[creatorLower] || 1;

    let agentScore = 40;
    let signals: string[] = [];
    if (liquidityUsd > 2000) { agentScore += 18; signals.push('Likuiditas solid >$2k'); }
    else if (liquidityUsd > 500) { agentScore += 10; signals.push('Likuiditas aktif'); }
    if (volume24h > 10000) { agentScore += 20; signals.push('Volume tinggi >$10k'); }
    else if (volume24h > 1000) { agentScore += 10; signals.push('Volume aktif'); }
    if (devCount === 1) { agentScore += 12; signals.push('Dev tunggal (fokus 1 token)'); }
    else if (devCount >= 4) { agentScore -= 20; signals.push(`Dev serial (${devCount} token)`); }

    agentScore = Math.max(5, Math.min(99, Math.round(agentScore)));

    let agentVerdict = 'NETRAL';
    if (agentScore >= 70) agentVerdict = 'STRONG ACCUMULATE';
    else if (agentScore >= 50) agentVerdict = 'MOMENTUM WATCH';
    else if (devCount >= 4) agentVerdict = 'HIGH DEV RISK';

    return {
      index: idx + 1,
      address: t.address,
      pool: t.pool || ds?.pairAddress || '',
      creator: t.creator || '',
      creatorLaunchCount: devCount,
      name: t.name,
      symbol: t.symbol,
      quoteSymbol: t.quote_symbol || 'WBNB',
      launchedAt: t.launched_at || 0,
      blockNumber: t.block_number || 0,
      txHash: t.transaction_hash || '',
      logoUrl,
      onchainArtworkContract: artContract,
      fallbackLogoUrl,
      priceUsd,
      priceChange24h,
      volume24h,
      liquidityUsd,
      marketCap,
      buys24h,
      sells24h,
      buyRatio: Math.round(buyRatio * 100) / 100,
      agentScore,
      agentVerdict,
      agentSignals: signals.slice(0, 3),
      dexUrl: ds?.url || `https://dexscreener.com/bsc/${t.pool || t.address}`,
      brewUrl: `https://brew.family/token/${t.address}`,
      bubblemapsUrl: `https://bubblemaps.io/bsc/token/${t.address}`,
      bscscanTokenUrl: `https://bscscan.com/token/${t.address}`,
      bscscanCreatorUrl: t.creator ? `https://bscscan.com/address/${t.creator}` : '',
      bscscanTxUrl: t.transaction_hash ? `https://bscscan.com/tx/${t.transaction_hash}` : ''
    };
  });

  // 6. Persist computed fields
  for (let offset = 0; offset < enriched.length; offset += 100) {
    const batch = enriched.slice(offset, offset + 100).map((token: any) => ({
      address: token.address,
      creator_launch_count: token.creatorLaunchCount,
      price_usd: token.priceUsd,
      price_change_24h: token.priceChange24h,
      market_cap_usd: token.marketCap,
      volume_24h_usd: token.volume24h,
      liquidity_usd: token.liquidityUsd,
      buys_24h: token.buys24h,
      sells_24h: token.sells24h,
      buy_ratio: token.buyRatio,
      pair_address: token.pool,
      dex_url: token.dexUrl,
      image_url: token.logoUrl && token.logoUrl.startsWith('http') ? token.logoUrl : token.fallbackLogoUrl,
      agent_score: token.agentScore,
      agent_verdict: token.agentVerdict,
      agent_signals: token.agentSignals,
      last_market_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    await requestJson(`${SUPABASE_URL}/rest/v1/brew_tokens`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(batch)
    });
  }

  const payload = {
    totalLaunches: dbTokens.length,
    factory: '0xeea6c3bfb29fd9a35380438956bae7b109c63d85',
    updatedAt: Date.now(),
    stats: {
      totalTrackedVol: Math.round(totalTrackedVol * 100) / 100,
      totalTrackedMcap: Math.round(totalTrackedMcap * 100) / 100,
      activePairs,
      multiTokenDevs: Object.values(devMap).filter((v: number) => v > 1).length
    },
    tokens: enriched
  };

  return payload;
}

export async function main() {
  if (Array.isArray(argsPayload.fetchArtworks) && argsPayload.fetchArtworks.length > 0) {
    const artworks = await fetchArtworks(argsPayload.fetchArtworks);
    return { artworks };
  }

  if (argsPayload.searchQuery) {
    return await searchTokens(argsPayload.searchQuery);
  }

  if (argsPayload.customAddress) {
    return await inspectContract(argsPayload.customAddress);
  }

  const payload = await runFullSync();
  console.log(JSON.stringify(payload, null, 2));
  return payload;
}

// If invoked directly from node / tsx CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('script')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
