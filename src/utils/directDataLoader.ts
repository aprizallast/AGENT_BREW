import { Token, MarketStats } from '../types.ts';
import { BACKUP_BREW_TOKENS } from './seedTokens.ts';

const FACTORY_ADDRESS = '0xeea6c3bfb29fd9a35380438956bae7b109c63d85';
const BREW_SHARED_API = 'https://brew.family/api/shared/launches';
const CACHE_KEY = 'agent_brew_tokens_cache_v3';
const STATS_CACHE_KEY = 'agent_brew_stats_cache_v3';

export interface TokenPayload {
  tokens: Token[];
  stats: MarketStats;
  totalLaunches: number;
  factory: string;
  updatedAt: number;
  source?: 'api' | 'direct_brew_dex' | 'cors_proxy' | 'local_cache' | 'seed_fallback';
}

/**
 * Get synchronously cached payload from localStorage on app boot / page refresh
 */
export function getInitialCachedPayload(): TokenPayload {
  try {
    const rawTokens = localStorage.getItem(CACHE_KEY);
    const rawStats = localStorage.getItem(STATS_CACHE_KEY);

    if (rawTokens) {
      const parsedTokens = JSON.parse(rawTokens);
      if (Array.isArray(parsedTokens) && parsedTokens.length > 0) {
        const parsedStats = rawStats ? JSON.parse(rawStats) : null;
        return {
          tokens: parsedTokens,
          stats: parsedStats || {
            totalTrackedVol: 2800000,
            totalTrackedMcap: 11000000,
            activePairs: 370,
            multiTokenDevs: 320
          },
          totalLaunches: parsedTokens.length,
          factory: FACTORY_ADDRESS,
          updatedAt: Date.now(),
          source: 'local_cache'
        };
      }
    }
  } catch {}

  // Initial resilient fallback if cache is completely empty
  return {
    tokens: [],
    stats: {
      totalTrackedVol: 2800000,
      totalTrackedMcap: 11000000,
      activePairs: 370,
      multiTokenDevs: 320
    },
    totalLaunches: 2164,
    factory: FACTORY_ADDRESS,
    updatedAt: Date.now(),
    source: 'seed_fallback'
  };
}

/**
 * Save payload to localStorage safely
 */
export function saveToLocalCache(payload: TokenPayload): void {
  try {
    if (payload.tokens && payload.tokens.length > 5) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload.tokens));
      if (payload.stats) {
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(payload.stats));
      }
    }
  } catch (err) {
    console.warn('Failed to save to localStorage cache:', err);
  }
}

/**
 * Safe JSON parser helper to prevent "Unexpected token '<', <!doctype... is not valid JSON"
 */
async function safeFetchJson(url: string, options?: RequestInit, timeoutMs = 8000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim().startsWith('<') || text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE')) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Client-side helper to enrich tokens with DexScreener live prices & volume
async function enrichTokensWithDexScreener(tokens: Token[]): Promise<void> {
  const pending = tokens.slice(0, 90);
  const chunks: Token[][] = [];
  for (let i = 0; i < pending.length; i += 30) {
    chunks.push(pending.slice(i, i + 30));
  }

  await Promise.allSettled(
    chunks.map(async chunk => {
      try {
        const addrs = chunk.map(t => t.address).filter(Boolean).join(',');
        if (!addrs) return;
        const pairs = await safeFetchJson(`https://api.dexscreener.com/tokens/v1/bsc/${addrs}`);
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

            // Recalculate score based on live market metrics
            if (token.liquidityUsd > 2000) token.agentScore = Math.min(95, token.agentScore + 15);
            if (token.buyRatio > 1.4) token.agentScore = Math.min(98, token.agentScore + 10);
            if (token.volume24h > 5000) token.agentScore = Math.min(99, token.agentScore + 10);

            if (token.agentScore >= 75) token.agentVerdict = 'AMAN';
            else if (token.agentScore >= 50) token.agentVerdict = 'NETRAL';
          }
        }
      } catch {
        // graceful silent fallback
      }
    })
  );

  // Compute implied bonding curve prices for tokens without DEX pair yet
  for (const t of tokens) {
    if ((!t.priceUsd || t.priceUsd === 0) && t.marketCap > 0) {
      t.priceUsd = t.marketCap / 1000000000;
    }
  }
}

function processRawLaunches(launches: any[]): TokenPayload {
  const creatorCounts = launches.reduce((acc: Record<string, number>, l: any) => {
    const c = String(l.creator || '').toLowerCase().trim();
    if (c) acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const multiTokenDevsCount = Object.values(creatorCounts).filter((cnt: any) => cnt > 1).length;

  const tokens: Token[] = launches.map((l: any, idx: number) => {
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

    let agentScore = 50;
    let agentVerdict: 'AMAN' | 'RISIKO TINGGI' | 'NETRAL' | 'PERHATIAN' = 'NETRAL';
    const agentSignals: string[] = [];

    if (launchCount >= 4) {
      agentScore = 20;
      agentVerdict = 'RISIKO TINGGI';
      agentSignals.push(`🚨 Serial Deployer (${launchCount} tokens dibuat)`);
    } else if (launchCount === 1) {
      agentScore = 65;
      agentSignals.push('🛡️ Single-Contract Dev (Komitmen Tinggi)');
    }

    if (l.description && l.description.length > 30) {
      agentScore += 5;
      agentSignals.push('📝 Deskripsi Proyek Lengkap');
    }

    if (l.twitter || l.website) {
      agentScore += 10;
      agentSignals.push('🌐 Social Link Tersedia');
    }

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
      telegramUrl: l.telegram || '',
      priceUsd: l.priceUsd || (l.marketCapUsd ? l.marketCapUsd / 1000000000 : 0),
      priceChange24h: 0,
      volume24h: l.volume24hUsd || 0,
      liquidityUsd: 0,
      marketCap: l.marketCapUsd || 0,
      buys24h: 0,
      sells24h: 0,
      buyRatio: 1,
      agentScore,
      agentVerdict,
      agentSignals,
      dexUrl: `https://dexscreener.com/bsc/${l.pool || l.address}`,
      brewUrl: `https://brew.family/token/${l.address}`,
      bubblemapsUrl: `https://bubblemaps.io/bsc/token/${l.address}`,
      bscscanTokenUrl: `https://bscscan.com/token/${l.address}`,
      bscscanCreatorUrl: l.creator ? `https://bscscan.com/address/${l.creator}` : '',
      bscscanTxUrl: l.transactionHash ? `https://bscscan.com/tx/${l.transactionHash}` : ''
    };
  });

  return {
    totalLaunches: tokens.length,
    factory: FACTORY_ADDRESS,
    updatedAt: Date.now(),
    stats: {
      totalTrackedVol: 2800000,
      totalTrackedMcap: 11000000,
      activePairs: 370,
      multiTokenDevs: multiTokenDevsCount
    },
    tokens,
    source: 'direct_brew_dex'
  };
}

/**
 * Direct Client-Side Loader with Multi-Tier Resilience & Persistent Cache
 */
export async function fetchTokensWithFallback(isManual: boolean = false): Promise<TokenPayload> {
  // Tier 1: Try internal backend route first (with retry)
  let apiData = await safeFetchJson(`/api/tokens${isManual ? '?force=true' : ''}`, undefined, 10000);
  if (!apiData && !isManual) {
    // Retry once if serverless cold started
    await new Promise(r => setTimeout(r, 1200));
    apiData = await safeFetchJson(`/api/tokens`);
  }

  if (apiData && Array.isArray(apiData.tokens) && apiData.tokens.length > 5) {
    const payload: TokenPayload = {
      ...apiData,
      source: 'api'
    };
    saveToLocalCache(payload);
    return payload;
  }

  // Tier 2: Direct Fallback to brew.family launchpad API
  const brewData = await safeFetchJson(BREW_SHARED_API, undefined, 6000);
  const launches = Array.isArray(brewData) ? brewData : (brewData?.tokens || brewData?.launches || []);

  if (Array.isArray(launches) && launches.length > 5) {
    const payload = processRawLaunches(launches);
    await enrichTokensWithDexScreener(payload.tokens);

    let totalVol = 0;
    let totalMcap = 0;
    let activePairs = 0;
    payload.tokens.forEach((t: Token) => {
      if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
        activePairs++;
        totalVol += t.volume24h;
        totalMcap += t.marketCap;
      }
    });
    payload.stats.totalTrackedVol = Math.round(totalVol * 100) / 100;
    payload.stats.totalTrackedMcap = Math.round(totalMcap * 100) / 100;
    payload.stats.activePairs = activePairs;

    saveToLocalCache(payload);
    return payload;
  }

  // Tier 3: CORS Proxy Fallback if direct browser fetch blocked by CORS
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(BREW_SHARED_API)}`;
    const proxyData = await safeFetchJson(proxyUrl, undefined, 6000);
    const proxyLaunches = Array.isArray(proxyData) ? proxyData : (proxyData?.tokens || proxyData?.launches || []);
    if (Array.isArray(proxyLaunches) && proxyLaunches.length > 5) {
      const payload = processRawLaunches(proxyLaunches);
      payload.source = 'cors_proxy';
      saveToLocalCache(payload);
      return payload;
    }
  } catch {}

  // Tier 4: Check if we have persistent cached tokens from previous session
  const cached = getInitialCachedPayload();
  if (cached.tokens.length > 5) {
    return cached;
  }

  // Tier 5: Only as emergency fallback if literally no network and no cache
  const fallbackTokens: Token[] = JSON.parse(JSON.stringify(BACKUP_BREW_TOKENS));
  await enrichTokensWithDexScreener(fallbackTokens);

  return {
    totalLaunches: fallbackTokens.length,
    factory: FACTORY_ADDRESS,
    updatedAt: Date.now(),
    stats: {
      totalTrackedVol: 2800000,
      totalTrackedMcap: 11000000,
      activePairs: 370,
      multiTokenDevs: 1
    },
    tokens: fallbackTokens,
    source: 'seed_fallback'
  };
}

/**
 * Direct On-Chain & GoPlus Contract Inspector
 */
export async function inspectContractDirect(address: string): Promise<any> {
  const clean = address.toLowerCase().trim();
  const res: any = {
    address: clean,
    pair: null,
    brewLaunch: null,
    security: null
  };

  try {
    const [dexData, secData] = await Promise.allSettled([
      safeFetchJson(`https://api.dexscreener.com/tokens/v1/bsc/${clean}`),
      safeFetchJson(`https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses=${clean}`)
    ]);

    if (dexData.status === 'fulfilled' && Array.isArray(dexData.value) && dexData.value.length > 0) {
      res.pair = dexData.value[0];
    }

    if (secData.status === 'fulfilled' && secData.value?.result?.[clean]) {
      res.security = secData.value.result[clean];
    }
  } catch (err) {
    console.warn('Inspector direct fetch error:', err);
  }

  return res;
}
