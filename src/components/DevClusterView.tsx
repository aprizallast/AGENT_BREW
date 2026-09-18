import React, { useState, useMemo, useEffect } from 'react';
import { Token } from '../types.ts';
import { truncateAddr, copyToClipboard, formatUsd, formatPct } from '../utils/format.ts';
import { TokenAvatar } from './TokenAvatar.tsx';
import {
  ExternalLink,
  Copy,
  Search,
  AlertTriangle,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';

interface DevClusterViewProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  onTradeToken: (token: Token) => void;
  onShowToast: (msg: string) => void;
  onViewInRadar: (devAddr: string) => void;
  initialDevFilter?: string;
  onClearInitialDev?: () => void;
}

type ClusterFilter = 'all' | 'extreme' | 'repeat' | 'double' | 'liquid';
type ClusterSort = 'launches-desc' | 'liq-desc' | 'vol-desc' | 'recent';

interface DevClusterInfo {
  devAddress: string;
  tokens: Token[];
  totalLiquidity: number;
  totalVolume: number;
  totalMarketCap: number;
  lastLaunchedAt: number;
  hasActivePool: boolean;
}

export const DevClusterView: React.FC<DevClusterViewProps> = ({
  tokens,
  onSelectToken,
  onTradeToken,
  onShowToast,
  onViewInRadar,
  initialDevFilter,
  onClearInitialDev
}) => {
  const [searchQuery, setSearchQuery] = useState(initialDevFilter || '');
  const [activeFilter, setActiveFilter] = useState<ClusterFilter>('all');
  const [sortBy, setSortBy] = useState<ClusterSort>('launches-desc');
  const [expandedDevs, setExpandedDevs] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const pageSize = 12;

  useEffect(() => {
    if (initialDevFilter) {
      setSearchQuery(initialDevFilter);
      setCurrentPage(1);
    }
  }, [initialDevFilter]);

  // 1. Group tokens by developer address
  const rawClusters = useMemo(() => {
    const map = new Map<string, Token[]>();
    tokens.forEach(t => {
      const c = (t.creator || '').toLowerCase().trim();
      if (!c) return;
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(t);
    });

    const list: DevClusterInfo[] = [];
    map.forEach((toks, devAddr) => {
      if (toks.length > 1) {
        let totalLiq = 0;
        let totalVol = 0;
        let totalMc = 0;
        let lastLaunch = 0;
        let hasActive = false;

        toks.forEach(t => {
          totalLiq += t.liquidityUsd || 0;
          totalVol += t.volume24h || 0;
          totalMc += t.marketCap || 0;
          if (t.launchedAt > lastLaunch) lastLaunch = t.launchedAt;
          if (t.liquidityUsd > 0 || t.volume24h > 0) hasActive = true;
        });

        // Sort tokens inside cluster by liquidity then launchedAt
        toks.sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0) || b.launchedAt - a.launchedAt);

        list.push({
          devAddress: devAddr,
          tokens: toks,
          totalLiquidity: totalLiq,
          totalVolume: totalVol,
          totalMarketCap: totalMc,
          lastLaunchedAt: lastLaunch,
          hasActivePool: hasActive
        });
      }
    });

    return list;
  }, [tokens]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalMultiDevs = rawClusters.length;
    let totalTokensInClusters = 0;
    let extremeDevs = 0;
    let maxTokens = 0;
    let kingDev = '';

    rawClusters.forEach(c => {
      totalTokensInClusters += c.tokens.length;
      if (c.tokens.length >= 5) extremeDevs++;
      if (c.tokens.length > maxTokens) {
        maxTokens = c.tokens.length;
        kingDev = c.devAddress;
      }
    });

    return {
      totalMultiDevs,
      totalTokensInClusters,
      extremeDevs,
      maxTokens,
      kingDev
    };
  }, [rawClusters]);

  // 2. Filter & Search
  const filteredClusters = useMemo(() => {
    let result = rawClusters;

    // Filter by type
    if (activeFilter === 'extreme') {
      result = result.filter(c => c.tokens.length >= 5);
    } else if (activeFilter === 'repeat') {
      result = result.filter(c => c.tokens.length >= 3 && c.tokens.length <= 4);
    } else if (activeFilter === 'double') {
      result = result.filter(c => c.tokens.length === 2);
    } else if (activeFilter === 'liquid') {
      result = result.filter(c => c.hasActivePool);
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(c => {
        if (c.devAddress.includes(q)) return true;
        return c.tokens.some(
          t =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'launches-desc') return b.tokens.length - a.tokens.length;
      if (sortBy === 'liq-desc') return b.totalLiquidity - a.totalLiquidity;
      if (sortBy === 'vol-desc') return b.totalVolume - a.totalVolume;
      if (sortBy === 'recent') return b.lastLaunchedAt - a.lastLaunchedAt;
      return 0;
    });

    return result;
  }, [rawClusters, activeFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredClusters.length / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pagedClusters = filteredClusters.slice((validPage - 1) * pageSize, validPage * pageSize);

  const handleCopy = async (addr: string) => {
    const ok = await copyToClipboard(addr);
    if (ok) {
      setCopiedAddr(addr);
      onShowToast(`Copied developer address ${truncateAddr(addr)}`);
      setTimeout(() => setCopiedAddr(null), 2000);
    }
  };

  const toggleExpand = (dev: string) => {
    setExpandedDevs(prev => ({
      ...prev,
      [dev]: !prev[dev]
    }));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onClearInitialDev) onClearInitialDev();
  };

  return (
    <div className="space-y-4 mb-8">
      {/* 1. Header Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 shadow-sm">
          <div className="text-[11px] font-semibold text-[#a89586] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Multi-Token Devs</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-[#fdf9f4] mt-1">
            {stats.totalMultiDevs}
          </div>
          <div className="text-[10px] text-[#8a7667] mt-0.5">
            Wallets with &gt;1 launchpad token
          </div>
        </div>

        <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 shadow-sm">
          <div className="text-[11px] font-semibold text-[#a89586] uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Serial Farmers (≥5)</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-rose-400 mt-1">
            {stats.extremeDevs}
          </div>
          <div className="text-[10px] text-[#8a7667] mt-0.5">
            High rug &amp; liquidity churn risk
          </div>
        </div>

        <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 shadow-sm">
          <div className="text-[11px] font-semibold text-[#a89586] uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Clustered</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-300 mt-1">
            {stats.totalTokensInClusters} <span className="text-xs font-normal text-[#a89586]">tokens</span>
          </div>
          <div className="text-[10px] text-[#8a7667] mt-0.5">
            {((stats.totalTokensInClusters / (tokens.length || 1)) * 100).toFixed(1)}% of launchpad catalog
          </div>
        </div>

        <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 shadow-sm">
          <div className="text-[11px] font-semibold text-[#a89586] uppercase tracking-wider flex items-center gap-1">
            <span>👑 Farm King Record</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-[#fdf9f4] mt-1">
            {stats.maxTokens} <span className="text-xs font-normal text-[#a89586]">launches</span>
          </div>
          <div className="text-[10px] font-mono text-amber-300 truncate mt-0.5" title={stats.kingDev}>
            {truncateAddr(stats.kingDev)}
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3.5 space-y-3 shadow-md">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8a7667] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by dev address (0x...) or token symbol/name..."
              className="w-full bg-[#1f1610] border border-[#38281e] rounded-xl pl-10 pr-9 py-2 text-xs text-[#fdf9f4] placeholder:text-[#8a7667] focus:outline-none focus:border-amber-600/60"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a89586] hover:text-[#fdf9f4] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#a89586] whitespace-nowrap">Sort By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as ClusterSort)}
              className="bg-[#1f1610] border border-[#38281e] text-[#fdf9f4] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-600/60"
            >
              <option value="launches-desc">Most Launches (Tokens Count)</option>
              <option value="liq-desc">Highest Combined Liquidity</option>
              <option value="vol-desc">Highest Combined 24h Volume</option>
              <option value="recent">Most Recent Launch</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#38281e]">
          <button
            onClick={() => {
              setActiveFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold shadow'
                : 'bg-[#1f1610] text-[#a89586] border border-[#38281e] hover:text-[#fdf9f4]'
            }`}
          >
            All Multi-Devs ({stats.totalMultiDevs})
          </button>

          <button
            onClick={() => {
              setActiveFilter('extreme');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'extreme'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'bg-[#1f1610] text-rose-400 border border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <span>🚨 Extreme Serial (≥5)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded">
              {stats.extremeDevs}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('repeat');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'repeat'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-[#1f1610] text-amber-300 border border-amber-600/30 hover:bg-amber-500/10'
            }`}
          >
            ⚠️ Repeat (3-4 launches)
          </button>

          <button
            onClick={() => {
              setActiveFilter('double');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'double'
                ? 'bg-amber-800 text-[#fdf9f4] font-bold shadow'
                : 'bg-[#1f1610] text-[#d6c5b6] border border-[#38281e] hover:bg-[#2c1e15]'
            }`}
          >
            ⚡ Double Launches (2)
          </button>

          <button
            onClick={() => {
              setActiveFilter('liquid');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'liquid'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-[#1f1610] text-emerald-400 border border-emerald-600/30 hover:bg-emerald-500/10'
            }`}
          >
            💧 Has Active DEX Pool
          </button>

          <div className="ml-auto text-xs text-[#8a7667] font-mono">
            Showing {filteredClusters.length} clusters
          </div>
        </div>
      </div>

      {/* 3. Clusters List Cards */}
      <div className="space-y-3">
        {filteredClusters.length === 0 ? (
          <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-12 text-center text-[#a89586] space-y-2">
            <div className="text-2xl">☕</div>
            <div className="font-bold text-[#fdf9f4] text-sm">No developer clusters match your criteria</div>
            <div className="text-xs text-[#8a7667]">
              Try adjusting your search query or reset the filter tags above.
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          pagedClusters.map(cluster => {
            const devAddr = cluster.devAddress;
            const count = cluster.tokens.length;
            const isExpanded = !!expandedDevs[devAddr];
            const isCritical = count >= 10;
            const isHigh = count >= 5 && count < 10;
            const isMedium = count >= 3 && count < 5;

            // Risk category styling
            const riskBadge = isCritical ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/50">
                🚨 CRITICAL SERIAL FARMER ({count} LAUNCHES)
              </span>
            ) : isHigh ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40">
                ⚠️ HIGH SERIAL RISK ({count} LAUNCHES)
              </span>
            ) : isMedium ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🟡 REPEAT DEPLOYER ({count} LAUNCHES)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                ☕ DOUBLE DEPLOYER (2 LAUNCHES)
              </span>
            );

            // Visible tokens: preview up to 6 or all if expanded
            const visibleTokens = isExpanded ? cluster.tokens : cluster.tokens.slice(0, 6);
            const hasMoreTokens = count > 6;

            return (
              <div
                key={devAddr}
                className={`bg-[#18120d] border rounded-2xl p-4 transition-all shadow-xl space-y-3.5 ${
                  isCritical
                    ? 'border-rose-500/50 hover:border-rose-500/70'
                    : isHigh
                    ? 'border-orange-500/40 hover:border-orange-500/60'
                    : 'border-[#38281e] hover:border-amber-600/40'
                }`}
              >
                {/* Cluster Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2d1f17]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Address with copy */}
                    <div className="flex items-center gap-1.5 bg-[#1f1610] px-2.5 py-1 rounded-xl border border-[#38281e]">
                      <span className="text-[11px] text-slate-400 font-semibold">Dev:</span>
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {devAddr}
                      </span>
                      <button
                        onClick={() => handleCopy(devAddr)}
                        className="text-slate-400 hover:text-white p-0.5 transition-colors"
                        title="Copy developer wallet address"
                      >
                        {copiedAddr === devAddr ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {riskBadge}
                  </div>

                  {/* Quick External Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewInRadar(devAddr)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500 hover:text-slate-950 transition-all"
                      title="Filter all tokens by this dev in Token Radar table"
                    >
                      <span>Filter in Radar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <a
                      href={`https://bscscan.com/address/${devAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#14171d] border border-[#232832] text-slate-300 hover:text-white"
                      title="View deployer transactions on BscScan"
                    >
                      <span>BscScan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={`https://bubblemaps.io/bsc/address/${devAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#14171d] border border-[#232832] text-slate-300 hover:text-white"
                      title="Inspect wallet cluster graph on BubbleMaps"
                    >
                      <span>BubbleMaps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Metrics Summary Strip for this Cluster */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#d6c5b6] bg-[#1f1610] px-3.5 py-2 rounded-xl border border-[#38281e]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8a7667]">Total Launches:</span>
                    <strong className="text-[#fdf9f4]">{count}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8a7667]">Combined DEX Liq:</span>
                    <strong className="text-emerald-400">{formatUsd(cluster.totalLiquidity)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8a7667]">Combined 24h Vol:</span>
                    <strong className="text-amber-300">{formatUsd(cluster.totalVolume)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8a7667]">Combined Market Cap:</span>
                    <strong className="text-[#fdf9f4]">{formatUsd(cluster.totalMarketCap)}</strong>
                  </div>
                  {cluster.hasActivePool ? (
                    <span className="text-emerald-400 text-[11px] font-sans ml-auto flex items-center gap-1 font-semibold">
                      ● Active DEX Trading Pool
                    </span>
                  ) : (
                    <span className="text-[#8a7667] text-[11px] font-sans ml-auto">
                      ○ Bonding Curve Phase Only
                    </span>
                  )}
                </div>

                {/* Grid of Tokens Deployed by this dev */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {visibleTokens.map(tok => {
                    const price = tok.priceUsd > 0 ? tok.priceUsd : (tok.marketCap > 0 ? tok.marketCap / 1000000000 : 0);
                    const chg = tok.priceChange24h;

                    return (
                      <div
                        key={tok.address}
                        className="bg-[#1f1610] border border-[#38281e] rounded-xl p-3 flex flex-col justify-between hover:border-amber-600/40 transition-colors group shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TokenAvatar
                              symbol={tok.symbol}
                              address={tok.address}
                              logoUrl={tok.logoUrl}
                              fallbackLogoUrl={tok.fallbackLogoUrl}
                              onchainArtworkContract={tok.onchainArtworkContract}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="font-extrabold text-[#fdf9f4] text-xs truncate flex items-center gap-1">
                                <span>{tok.symbol}</span>
                              </div>
                              <div className="text-[10px] text-[#a89586] truncate">
                                {tok.name}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              chg > 0
                                ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-400'
                                : chg < 0
                                ? 'bg-rose-950/60 border border-rose-600/40 text-rose-400'
                                : 'bg-[#281b13] text-[#a89586]'
                            }`}
                          >
                            {formatPct(chg)}
                          </span>
                        </div>

                        {/* Price & Liq row */}
                        <div className="grid grid-cols-2 gap-1 my-2 py-1.5 px-2 bg-[#140e0a] rounded-lg text-[11px] font-mono border border-[#2d1f17]">
                          <div>
                            <span className="text-[#8a7667] block text-[9px]">PRICE</span>
                            <span className="text-[#fdf9f4] font-bold">{formatUsd(price)}</span>
                          </div>
                          <div>
                            <span className="text-[#8a7667] block text-[9px]">DEX LIQ</span>
                            <span className="text-amber-300">{formatUsd(tok.liquidityUsd)}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => onSelectToken(tok)}
                            className="flex-1 py-1 px-2 rounded-lg text-[11px] font-bold bg-[#2a1d15] text-[#d6c5b6] border border-[#38281e] hover:bg-amber-600 hover:text-stone-950 transition-all text-center"
                          >
                            Audit
                          </button>
                          <button
                            onClick={() => onTradeToken(tok)}
                            className="flex-1 py-1 px-2 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 transition-all text-center shadow-sm"
                          >
                            Swap ⚡
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expand / Collapse Button if > 6 tokens */}
                {hasMoreTokens && (
                  <div className="text-center pt-1">
                    <button
                      onClick={() => toggleExpand(devAddr)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#1f1610] border border-[#38281e] text-[#d6c5b6] hover:text-amber-300 hover:border-amber-600/40 transition-all"
                    >
                      {isExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>View All {count} Tokens Launched by this Dev</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 flex items-center justify-between">
          <div className="text-xs text-[#a89586]">
            Page <span className="font-bold text-[#fdf9f4]">{validPage}</span> of{' '}
            <span className="font-bold text-[#fdf9f4]">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={validPage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1f1610] border border-[#38281e] text-[#d6c5b6] hover:text-[#fdf9f4] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={validPage >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1f1610] border border-[#38281e] text-[#d6c5b6] hover:text-[#fdf9f4] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
