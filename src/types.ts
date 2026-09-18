export interface Token {
  index: number;
  address: string;
  pool: string;
  creator: string;
  creatorLaunchCount: number;
  name: string;
  symbol: string;
  quoteSymbol: string;
  quoteAddress?: string;
  launchedAt: number;
  blockNumber: number;
  txHash: string;
  logoUrl: string;
  fallbackLogoUrl: string;
  onchainArtworkContract?: string;
  description?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  telegramUrl?: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  buys24h: number;
  sells24h: number;
  buyRatio: number;
  agentScore: number;
  potentialScore?: number;
  agentVerdict: string;
  agentSignals: string[];
  dexUrl: string;
  brewUrl: string;
  bubblemapsUrl: string;
  bscscanTokenUrl: string;
  bscscanCreatorUrl: string;
  bscscanTxUrl: string;
  otherDevTokens?: any[];
}

export interface MarketStats {
  totalTrackedVol: number;
  totalTrackedMcap: number;
  activePairs: number;
  multiTokenDevs: number;
}

export interface TokensPayload {
  totalLaunches: number;
  factory: string;
  updatedAt: number;
  stats: MarketStats;
  tokens: Token[];
}

export type ViewTab = 'radar' | 'copilot' | 'picks' | 'devs';
export type FilterType = 'all' | 'newest' | 'dex-active' | 'top10-gainers' | 'top10-mcap' | 'top10-vol' | 'top10-potential' | 'serial-dev' | 'watchlist';
export type SortKey = 'rank' | 'priceUsd' | 'priceChange24h' | 'marketCap' | 'volume24h' | 'liquidityUsd' | 'creatorLaunchCount' | 'agentScore';
export type Language = 'en' | 'zh';

export interface VisitorStats {
  activeVisitors: number;
  totalVisits: number;
  uniqueVisitors: number;
  lastVisitAt?: string;
}

export interface AudioAlertConfig {
  enabled: boolean;
  volume: number; // 0.05 to 1.0
  filter: 'all' | 'liq500' | 'singleDev';
}
