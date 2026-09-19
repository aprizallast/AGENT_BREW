import React, { useState, useMemo, useEffect } from 'react';
import { Token, FilterType, SortKey, Language } from '../types.ts';
import { I18N } from '../i18n.ts';
import { formatUsd, formatPct, truncateAddr } from '../utils/format.ts';
import { TokenAvatar } from './TokenAvatar.tsx';
import { Search, Plus, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TokenRadarProps {
  tokens: Token[];
  totalLaunches: number;
  lang: Language;
  onAnalyze: (token: Token) => void;
  onTrade: (token: Token) => void;
  onFilterByDev: (devAddress: string) => void;
  onTrackCustom: (contractAddress: string) => Promise<void>;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onLiveSearch: (query: string) => Promise<void>;
  onVisibleTokens?: (tokens: Token[]) => void;
  initialSearch?: string;
  onClearSearch?: () => void;
}

export const TokenRadar: React.FC<TokenRadarProps> = ({
  tokens,
  totalLaunches,
  lang,
  onAnalyze,
  onTrade,
  onFilterByDev,
  onTrackCustom,
  audioEnabled,
  onToggleAudio,
  onLiveSearch,
  onVisibleTokens,
  initialSearch,
  onClearSearch
}) => {
  const dict = I18N[lang];
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
      setCurrentPage(1);
    }
  }, [initialSearch]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Quick filters
  const [minLiq1k, setMinLiq1k] = useState(false);
  const [minVol5k, setMinVol5k] = useState(false);
  const [singleDevOnly, setSingleDevOnly] = useState(false);

  // Custom contract tracking
  const [customInput, setCustomInput] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Accurately compute creator launch counts across all active tokens
  const devCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tokens.forEach(t => {
      const c = (t.creator || '').toLowerCase().trim();
      if (c) map[c] = (map[c] || 0) + 1;
    });
    return map;
  }, [tokens]);

  const totalSerialTokens = useMemo(() => {
    let count = 0;
    tokens.forEach(t => {
      const c = (t.creator || '').toLowerCase().trim();
      const launchCount = Math.max(t.creatorLaunchCount || 1, devCounts[c] || 1);
      if (launchCount > 1) count++;
    });
    return count;
  }, [tokens, devCounts]);

  // Filter & Sort logic
  const filteredTokens = useMemo(() => {
    let list = [...tokens];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q) ||
        t.creator.toLowerCase().includes(q)
      );
    }

    if (minLiq1k) list = list.filter(t => t.liquidityUsd >= 1000);
    if (minVol5k) list = list.filter(t => t.volume24h >= 5000);
    if (singleDevOnly) {
      list = list.filter(t => {
        const c = (t.creator || '').toLowerCase().trim();
        const cnt = c ? Math.max(t.creatorLaunchCount || 1, devCounts[c] || 1) : (t.creatorLaunchCount || 1);
        return cnt === 1;
      });
    }

    if (filterType === 'newest') {
      list.sort((a, b) => (b.launchedAt || b.blockNumber || 0) - (a.launchedAt || a.blockNumber || 0));
    } else if (filterType === 'top10-mcap') {
      list.sort((a, b) => b.marketCap - a.marketCap);
      return list.slice(0, 10);
    } else if (filterType === 'top10-vol') {
      list.sort((a, b) => b.volume24h - a.volume24h);
      return list.slice(0, 10);
    } else if (filterType === 'top10-gainers') {
      list.sort((a, b) => b.priceChange24h - a.priceChange24h);
      return list.slice(0, 10);
    } else if (filterType === 'top10-potential') {
      list.sort((a, b) => b.agentScore - a.agentScore);
      return list.slice(0, 10);
    } else if (filterType === 'dex-active') {
      list = list.filter(t => t.liquidityUsd > 0 || t.volume24h > 0);
      list.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
    } else if (filterType === 'serial-dev') {
      list = list.filter(t => {
        const c = (t.creator || '').toLowerCase().trim();
        const cnt = c ? Math.max(t.creatorLaunchCount || 1, devCounts[c] || 1) : (t.creatorLaunchCount || 1);
        return cnt > 1;
      });
      list.sort((a, b) => {
        const cA = (a.creator || '').toLowerCase().trim();
        const cB = (b.creator || '').toLowerCase().trim();
        const countA = cA ? Math.max(a.creatorLaunchCount || 1, devCounts[cA] || 1) : (a.creatorLaunchCount || 1);
        const countB = cB ? Math.max(b.creatorLaunchCount || 1, devCounts[cB] || 1) : (b.creatorLaunchCount || 1);
        return countB - countA;
      });
    } else if (filterType === 'all') {
      const dir = sortDir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        let valA: any = sortKey === 'rank' ? (a.launchedAt || a.blockNumber || 0) : (a as any)[sortKey];
        let valB: any = sortKey === 'rank' ? (b.launchedAt || b.blockNumber || 0) : (b as any)[sortKey];
        if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
        return ((valA || 0) - (valB || 0)) * dir;
      });
    }

    return list;
  }, [tokens, devCounts, searchQuery, filterType, sortKey, sortDir, minLiq1k, minVol5k, singleDevOnly]);

  const totalPages = Math.ceil(filteredTokens.length / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIdx = (validPage - 1) * pageSize;
  const pagedTokens = filteredTokens.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    if (onVisibleTokens && pagedTokens.length > 0) {
      onVisibleTokens(pagedTokens);
    }
  }, [pagedTokens, onVisibleTokens]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setFilterType('all');
    setCurrentPage(1);
  };

  const handleTrack = async () => {
    const addr = customInput.trim();
    if (!addr) return;
    setIsTracking(true);
    try {
      await onTrackCustom(addr);
      setCustomInput('');
    } finally {
      setIsTracking(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (q) onLiveSearch(q);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Search & Tabs Controls */}
      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3 space-y-2.5 shadow-md shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#a89586] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={dict.searchPh}
              className="w-full bg-[#130d09] border border-[#38281e] rounded-lg pl-9 pr-8 py-2 text-xs text-[#f7f0e8] placeholder-[#8a7667] focus:outline-none focus:border-amber-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (onClearSearch) onClearSearch();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a89586] hover:text-white text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#a89586]">
            {searchQuery.startsWith('0x') && searchQuery.length >= 20 && (
              <span className="bg-[#281c15] border border-amber-600/40 text-amber-300 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1">
                <span>Filter: Dev {truncateAddr(searchQuery)}</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    if (onClearSearch) onClearSearch();
                  }}
                  className="hover:text-white"
                >
                  ✕
                </button>
              </span>
            )}
            <div>
              Showing <strong className="text-white">{filteredTokens.length}</strong> of {totalLaunches.toLocaleString()} launches
            </div>
          </div>
        </div>

        {/* Primary Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.allTokens}
          </button>
          <button
            onClick={() => { setFilterType('newest'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'newest'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.newestReleases}
          </button>
          <button
            onClick={() => { setFilterType('dex-active'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'dex-active'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.withDexLiq}
          </button>
          <button
            onClick={() => { setFilterType('top10-gainers'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'top10-gainers'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.topGainers}
          </button>
          <button
            onClick={() => { setFilterType('top10-mcap'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'top10-mcap'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.topMcap}
          </button>
          <button
            onClick={() => { setFilterType('top10-vol'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'top10-vol'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.topVol}
          </button>
          <button
            onClick={() => { setFilterType('top10-potential'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'top10-potential'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            {dict.highestScore}
          </button>
          <button
            onClick={() => { setFilterType('serial-dev'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'serial-dev'
                ? 'bg-[#2d1e16] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] bg-[#1d1510] border border-[#38281e]'
            }`}
          >
            🕵️ {lang === 'zh' ? '开发者聚类' : lang === 'ja' ? '開発者クラスター' : 'Dev Clusters'} ({totalSerialTokens > 0 ? `${totalSerialTokens} ${lang === 'zh' ? '代币' : lang === 'ja' ? 'トークン' : 'Tokens'}` : '>1 Token'})
          </button>
        </div>

        {/* Quick Filters Row + Custom Contract Input */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#38281e]">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#a89586] font-semibold text-[11px]">{dict.quickFilters}</span>
            <button
              onClick={() => { setMinLiq1k(!minLiq1k); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                minLiq1k
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                  : 'bg-[#1d1510] text-[#a89586] border border-[#38281e] hover:text-white'
              }`}
            >
              💧 Liq &gt; $1K
            </button>
            <button
              onClick={() => { setMinVol5k(!minVol5k); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                minVol5k
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                  : 'bg-[#1d1510] text-[#a89586] border border-[#38281e] hover:text-white'
              }`}
            >
              ⚡ Vol 24h &gt; $5K
            </button>
            <button
              onClick={() => { setSingleDevOnly(!singleDevOnly); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                singleDevOnly
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                  : 'bg-[#1d1510] text-[#a89586] border border-[#38281e] hover:text-white'
              }`}
            >
              {dict.singleDev}
            </button>
            <button
              onClick={onToggleAudio}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                audioEnabled
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                  : 'bg-[#1d1510] text-[#8a7667] border border-[#38281e]'
              }`}
            >
              {audioEnabled ? dict.alertAudioOn : dict.alertAudioOff}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 max-w-md">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              placeholder={dict.trackCustomPh}
              className="flex-1 bg-[#130d09] border border-[#38281e] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f0e8] placeholder-[#8a7667] focus:outline-none focus:border-amber-600"
            />
            <button
              onClick={handleTrack}
              disabled={isTracking || !customInput.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 transition-all shadow-md shadow-amber-950/30 disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTracking ? 'Tracking...' : dict.trackContractBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="cyber-glass rounded-2xl overflow-hidden border border-amber-900/40 shadow-2xl shadow-black/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs text-[#d6c5b6]">
            <thead className="bg-[#1a110b]/90 text-amber-300/80 uppercase tracking-widest text-[10px] font-mono font-bold border-b border-amber-900/50">
              <tr>
                <th
                  onClick={() => handleSort('rank')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thRank}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priceUsd')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thPrice}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priceChange24h')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thChange}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marketCap')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thMcap}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('volume24h')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thVol}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('liquidityUsd')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thLiq}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('creatorLaunchCount')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thDev}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('agentScore')}
                  className="px-4 py-3.5 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{dict.thScore}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500/50" />
                  </div>
                </th>
                <th className="px-4 py-3.5">{dict.thActions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-amber-950/40">
              {pagedTokens.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-[#8a7667]">
                    <div className="text-sm font-semibold">No tokens found matching the current search filters.</div>
                    {searchQuery && (
                      <button
                        onClick={() => onLiveSearch(searchQuery)}
                        className="mt-3.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950/40"
                      >
                        Search Live on Brew.family &amp; BSC
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pagedTokens.map((t, idx) => {
                  const globalIdx = startIdx + idx + 1;
                  const chg = t.priceChange24h || 0;
                  const cAddr = (t.creator || '').toLowerCase().trim();
                  const devCount = cAddr ? Math.max(t.creatorLaunchCount || 1, devCounts[cAddr] || 1) : (t.creatorLaunchCount || 1);
                  const isTopGainer = chg >= 50;

                  return (
                    <tr
                      key={t.address}
                      className="hover:bg-amber-950/25 transition-all group duration-200"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[#8a7667] text-[11px] w-6 font-bold group-hover:text-amber-400 transition-colors">
                            #{globalIdx}
                          </span>
                          <TokenAvatar
                            symbol={t.symbol}
                            address={t.address}
                            logoUrl={t.logoUrl}
                            fallbackLogoUrl={t.fallbackLogoUrl}
                            onchainArtworkContract={t.onchainArtworkContract}
                            size="md"
                          />
                          <div>
                            <div className="font-bold text-[#fdf9f4] flex items-center gap-1.5">
                              <span className="group-hover:text-amber-300 transition-colors font-mono">{t.symbol}</span>
                              <span className="text-[9px] font-mono text-[#9e8979] bg-[#1a110a] px-1.5 py-0.5 rounded border border-amber-900/30">
                                /{t.quoteSymbol || 'WBNB'}
                              </span>
                              {globalIdx <= 3 && filterType === 'newest' && (
                                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 animate-pulse">
                                  NEW
                                </span>
                              )}
                              {isTopGainer && (
                                <span className="text-[9px] font-mono font-black px-1 py-0.2 rounded bg-amber-500 text-stone-950 shadow-sm animate-bounce">
                                  🔥
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#a89586] max-w-[130px] truncate font-sans" title={t.name}>
                              {t.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-[#fdf9f4]">
                        {formatUsd(t.priceUsd > 0 ? t.priceUsd : (t.marketCap > 0 ? t.marketCap / 1000000000 : 0))}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shadow-sm ${
                            chg > 0
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : chg < 0
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-[#1e140e] text-[#9e8979]'
                          }`}
                        >
                          {formatPct(chg)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-semibold text-[#e8ded5]">{formatUsd(t.marketCap)}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#e8ded5]">{formatUsd(t.volume24h)}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#e8ded5]">{formatUsd(t.liquidityUsd)}</td>

                      <td className="px-4 py-3.5">
                        <div
                          onClick={() => t.creator && onFilterByDev(t.creator)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {devCount >= 4 ? (
                            <span className="inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50">
                              🚨 Serial ({devCount})
                            </span>
                          ) : devCount > 1 ? (
                            <span className="inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50">
                              ⚠️ Multi ({devCount})
                            </span>
                          ) : (
                            <span className="inline-flex text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                              🛡️ Single Dev
                            </span>
                          )}
                          <div className="text-[10px] font-mono text-[#8a7667] mt-0.5 group-hover:text-[#a89586]">
                            {truncateAddr(t.creator)}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md border w-fit ${
                              t.agentScore >= 65
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                : t.agentScore >= 45
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                                : 'bg-[#1f150f] text-[#9e8979] border-amber-900/30'
                            }`}
                          >
                            ★ {t.agentScore}/100
                          </span>
                          <div className="w-16 h-1 rounded-full bg-stone-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.agentScore >= 65 ? 'bg-emerald-400' : t.agentScore >= 45 ? 'bg-amber-400' : 'bg-stone-600'
                              }`}
                              style={{ width: `${Math.min(t.agentScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onAnalyze(t)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#221711] text-amber-300 border border-amber-600/40 hover:bg-amber-500 hover:text-stone-950 transition-all shadow-sm cursor-pointer"
                          >
                            🔍 {dict.btnAnalyze}
                          </button>
                          <button
                            onClick={() => onTrade(t)}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 hover:from-amber-400 hover:to-yellow-400 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
                          >
                            ⚡ {dict.btnSwap}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-[#a89586]">
          Page <strong className="text-[#fdf9f4]">{validPage}</strong> of {totalPages} ({filteredTokens.length} tokens)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={validPage <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18120d] border border-[#38281e] text-[#d6c5b6] hover:text-[#fdf9f4] hover:bg-[#251b14] disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{dict.prevPage}</span>
          </button>

          <span className="font-mono text-xs font-bold text-amber-400 px-2">
            {validPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={validPage >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18120d] border border-[#38281e] text-[#d6c5b6] hover:text-[#fdf9f4] hover:bg-[#251b14] disabled:opacity-40 transition-colors"
          >
            <span>{dict.nextPage}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
