import React, { useState, useMemo } from 'react';
import { Token, Language } from '../types.ts';
import { I18N } from '../i18n.ts';
import { formatUsd, formatPct } from '../utils/format.ts';
import { TokenAvatar } from './TokenAvatar.tsx';
import { Trophy, Crown, Award, Zap, TrendingUp, Coins, Sparkles, ExternalLink, Search, Flame, ShieldCheck } from 'lucide-react';

interface HallOfFamePodiumProps {
  tokens: Token[];
  lang: Language;
  onAnalyze: (token: Token) => void;
  onTrade: (token: Token) => void;
}

type PodiumCriteria = 'volume' | 'change' | 'mcap';

export const HallOfFamePodium: React.FC<HallOfFamePodiumProps> = ({
  tokens,
  lang,
  onAnalyze,
  onTrade
}) => {
  const [criteria, setCriteria] = useState<PodiumCriteria>('volume');
  const dict = I18N[lang] || I18N.en;

  // Compute Top 3 tokens based on selected criteria
  const podiumTokens = useMemo(() => {
    if (!tokens || tokens.length === 0) return { rank1: null, rank2: null, rank3: null };

    // Clean & filter tokens with valid values
    const list = [...tokens].filter(t => {
      if (criteria === 'volume') return (t.volume24h || 0) > 0;
      if (criteria === 'change') return typeof t.priceChange24h === 'number';
      return (t.marketCap || 0) > 0;
    });

    if (criteria === 'volume') {
      list.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    } else if (criteria === 'change') {
      list.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
    } else {
      list.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }

    return {
      rank1: list[0] || null,
      rank2: list[1] || null,
      rank3: list[2] || null
    };
  }, [tokens, criteria]);

  const { rank1, rank2, rank3 } = podiumTokens;

  const getPrimaryStat = (token: Token | null) => {
    if (!token) return { label: '', value: '-', sub: '' };
    if (criteria === 'volume') {
      return {
        label: dict.hofCritVol,
        value: formatUsd(token.volume24h || 0),
        sub: `MCap: ${formatUsd(token.marketCap || 0)}`
      };
    }
    if (criteria === 'change') {
      return {
        label: dict.hofCritChange,
        value: formatPct(token.priceChange24h || 0),
        sub: `Vol: ${formatUsd(token.volume24h || 0)}`
      };
    }
    return {
      label: dict.hofCritMcap,
      value: formatUsd(token.marketCap || 0),
      sub: `Vol: ${formatUsd(token.volume24h || 0)}`
    };
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#1c140e] via-[#140e0a] to-[#0d0907] border border-[#4a3424]/60 p-4 sm:p-6 shadow-2xl shadow-black/80 mb-6">
      {/* Dynamic Background Light Show / Radiant Spotlight Beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Radial Golden Spotlight Beam centered on Rank #1 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-gradient-to-b from-amber-500/20 via-amber-600/5 to-transparent blur-3xl rounded-full transform -translate-y-12 pointer-events-none" />
        
        {/* Left Silver/Cyan Glow on Rank #2 */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-slate-300/10 blur-3xl rounded-full pointer-events-none" />
        
        {/* Right Bronze/Amber Glow on Rank #3 */}
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-amber-700/15 blur-3xl rounded-full pointer-events-none" />

        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3a271c_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
      </div>

      {/* Header Section with Criteria Switcher */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#38281e]/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 shadow-lg shadow-amber-600/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 uppercase">
                  {dict.hofTitle}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                  TOP 3 BSC
                </span>
              </div>
              <p className="text-xs text-[#a89586] mt-0.5">
                {dict.hofSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Interactive Criteria Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#110c09]/90 border border-[#3e2c21] self-stretch sm:self-auto overflow-x-auto shadow-inner">
          <button
            onClick={() => setCriteria('volume')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              criteria === 'volume'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-md shadow-amber-950/60 font-black'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#201712]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{dict.hofCritVol}</span>
          </button>

          <button
            onClick={() => setCriteria('change')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              criteria === 'change'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-stone-950 shadow-md shadow-emerald-950/60 font-black'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#201712]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{dict.hofCritChange}</span>
          </button>

          <button
            onClick={() => setCriteria('mcap')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              criteria === 'mcap'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 shadow-md shadow-yellow-950/60 font-black'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#201712]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{dict.hofCritMcap}</span>
          </button>
        </div>
      </div>

      {/* 3 PODIUM STAGES DISPLAY */}
      <div className="relative z-10 pt-8 sm:pt-10 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end max-w-5xl mx-auto">
          
          {/* ========================================================= */}
          {/* 🥈 PODIUM 2 (SILVER - LEFT) */}
          {/* ========================================================= */}
          <div className="order-2 md:order-1 flex flex-col items-center">
            {/* Crown / Rank Medal Floating Badge */}
            <div className="animate-float-badge mb-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 text-slate-200 border border-slate-400/50 shadow-lg shadow-slate-900/60 font-black text-xs">
              <span className="text-base">🥈</span>
              <span>{dict.hofRank2Badge}</span>
            </div>

            {rank2 ? (
              <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#241e24] via-[#1a1518] to-[#120e10] border-2 border-slate-400/40 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-500/20 group animate-silver-glow light-sweep-effect">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar with Silver Glow Ring */}
                  <div className="relative p-1 rounded-2xl bg-gradient-to-tr from-slate-500 via-slate-200 to-slate-400 shadow-md shadow-slate-900/80 mb-3 group-hover:scale-105 transition-transform">
                    <TokenAvatar
                      symbol={rank2.symbol}
                      address={rank2.address}
                      logoUrl={rank2.logoUrl}
                      fallbackLogoUrl={rank2.fallbackLogoUrl}
                      onchainArtworkContract={rank2.onchainArtworkContract}
                      size="lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-stone-950 font-black text-[10px] flex items-center justify-center border border-slate-900">
                      2
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-100 group-hover:text-white transition-colors flex items-center gap-1 font-mono">
                    ${rank2.symbol}
                    {rank2.creatorLaunchCount === 1 && (
                      <span title="Single-contract dev">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 max-w-[170px] truncate font-medium">{rank2.name}</p>

                  {/* Highlighted Metric Badge */}
                  <div className="mt-3.5 w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">
                      {getPrimaryStat(rank2).label}
                    </div>
                    <div className={`text-lg font-black font-mono mt-0.5 ${
                      criteria === 'change' && (rank2.priceChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {getPrimaryStat(rank2).value}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {getPrimaryStat(rank2).sub}
                    </div>
                  </div>

                  {/* Dev & Security Tag */}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                      {dict.hofDev}: {rank2.creator ? `${rank2.creator.slice(0, 4)}...${rank2.creator.slice(-3)}` : 'On-chain'}
                    </span>
                    <span className="font-mono text-amber-300 font-bold">
                      {dict.hofAgentScore}: {rank2.agentScore || 50}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => onAnalyze(rank2)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-600/40 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>{dict.hofInspectBtn}</span>
                  </button>
                  <button
                    onClick={() => onTrade(rank2)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-slate-300 to-slate-200 text-stone-950 hover:from-white hover:to-slate-100 transition-colors shadow-sm shadow-slate-900 cursor-pointer"
                  >
                    <span>{dict.hofTradeBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-56 rounded-2xl bg-[#1a1412] border border-dashed border-slate-700/50 flex items-center justify-center text-xs text-stone-500 font-mono">
                {lang === 'zh' ? '等待第 2 名入榜...' : lang === 'ja' ? '第2位 集計中...' : 'Awaiting Silver Champion...'}
              </div>
            )}

            {/* Silver Pedestal Step Base */}
            <div className="relative w-full h-9 sm:h-13 mt-2 rounded-t-xl bg-gradient-to-b from-slate-400/30 via-slate-600/15 to-transparent border-t-2 border-slate-300/80 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
              <span className="font-mono font-black text-slate-300 text-xs tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-ping" />
                #2 SILVER PEDESTAL
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 👑 PODIUM 1 (GOLD - CENTER, HIGHEST & LARGEST) */}
          {/* ========================================================= */}
          <div className="order-1 md:order-2 flex flex-col items-center -mt-4 md:-mt-8">
            {/* Grand Crown & Champion Badge */}
            <div className="animate-float-badge mb-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-stone-950 shadow-2xl shadow-amber-400/50 font-black text-xs uppercase tracking-wider border border-yellow-200">
              <Crown className="w-4 h-4 fill-stone-950" />
              <span>{dict.hofRank1Badge}</span>
            </div>

            {rank1 ? (
              <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#382414] via-[#24160d] to-[#140c07] border-2 border-amber-400 p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:border-yellow-300 hover:shadow-2xl hover:shadow-amber-500/50 group animate-gold-glow light-sweep-effect">
                {/* Decorative Champion Ribbon */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black text-[10px] tracking-widest uppercase shadow-md flex items-center gap-1 border border-yellow-200">
                  <Sparkles className="w-3 h-3 fill-stone-950" />
                  HALL OF FAME #1
                </div>

                <div className="flex flex-col items-center text-center mt-2">
                  {/* Avatar with Radiant Gold Halo Ring & Rotating Cyber Ring */}
                  <div className="relative p-2 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-400 shadow-2xl shadow-amber-500/60 mb-3.5 group-hover:scale-110 transition-transform">
                    {/* Outer Rotating Cyber Ring */}
                    <div className="absolute -inset-1.5 rounded-3xl border border-amber-400/40 border-dashed animate-spin-slow pointer-events-none" />

                    <TokenAvatar
                      symbol={rank1.symbol}
                      address={rank1.address}
                      logoUrl={rank1.logoUrl}
                      fallbackLogoUrl={rank1.fallbackLogoUrl}
                      onchainArtworkContract={rank1.onchainArtworkContract}
                      size="lg"
                    />
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-stone-950 font-black text-xs flex items-center justify-center border-2 border-stone-950 shadow-md">
                      1
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 group-hover:from-white group-hover:to-amber-200 transition-all font-mono">
                      ${rank1.symbol}
                    </h3>
                    {rank1.creatorLaunchCount === 1 && (
                      <span className="p-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300" title="Single contract verified dev">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-200/90 max-w-[200px] truncate font-medium">{rank1.name}</p>

                  {/* Primary Highlighted Metric */}
                  <div className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#472c19] to-[#20140c] border border-amber-400/60 shadow-lg shadow-black/40">
                    <div className="text-[10px] text-amber-300 uppercase tracking-widest font-bold flex items-center justify-center gap-1 font-mono">
                      <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                      {getPrimaryStat(rank1).label}
                    </div>
                    <div className={`text-2xl font-black font-mono mt-1 ${
                      criteria === 'change' && (rank1.priceChange24h || 0) >= 0 ? 'text-emerald-300' : 'text-amber-200'
                    }`}>
                      {getPrimaryStat(rank1).value}
                    </div>
                    <div className="text-[11px] font-mono text-amber-300/70 mt-0.5">
                      {getPrimaryStat(rank1).sub}
                    </div>
                  </div>

                  {/* Dev Intel & Tactical Signals */}
                  <div className="mt-3 flex items-center gap-2 text-[10px]">
                    <span className="font-mono bg-[#1c120a] text-[#d6c5b6] px-2.5 py-0.5 rounded-md border border-amber-900/60">
                      {dict.hofDev}: {rank1.creator ? `${rank1.creator.slice(0, 4)}...${rank1.creator.slice(-4)}` : 'On-chain'}
                    </span>
                    <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/40">
                      {dict.hofAgentScore}: {rank1.agentScore || 75}/100
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 pt-3.5 border-t border-amber-900/60">
                  <button
                    onClick={() => onAnalyze(rank1)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#2a1a10] text-amber-200 hover:bg-[#3d2719] hover:text-white transition-colors border border-amber-600/40 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>{dict.hofInspectBtn}</span>
                  </button>
                  <button
                    onClick={() => onTrade(rank1)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-950/60 cursor-pointer"
                  >
                    <span>{dict.hofTradeBtn}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 rounded-2xl bg-[#1a1412] border border-dashed border-amber-700/50 flex items-center justify-center text-xs text-amber-600 font-mono">
                {lang === 'zh' ? '正在计算榜首代币...' : lang === 'ja' ? '第1位 集計中...' : 'Calculating Top Champion...'}
              </div>
            )}

            {/* Gold Pedestal Step Base with Cyber Horizon & Radiant Crown Light */}
            <div className="relative w-full h-13 sm:h-18 mt-2 rounded-t-xl bg-gradient-to-b from-amber-500/50 via-amber-600/25 to-amber-950/20 border-t-2 border-amber-300 flex flex-col items-center justify-center overflow-hidden shadow-lg shadow-amber-500/30">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
              <span className="font-mono font-black text-amber-200 text-xs tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                👑 #1 GOLD PODIUM
              </span>
              <span className="text-[9px] text-amber-300/90 font-mono font-bold tracking-wider">SUPREME CHAMPION</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 🥉 PODIUM 3 (BRONZE - RIGHT) */}
          {/* ========================================================= */}
          <div className="order-3 flex flex-col items-center">
            {/* Bronze Medal Floating Badge */}
            <div className="animate-float-badge mb-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700/50 shadow-lg shadow-amber-950/60 font-black text-xs">
              <span className="text-base">🥉</span>
              <span>{dict.hofRank3Badge}</span>
            </div>

            {rank3 ? (
              <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#251710] via-[#1a100a] to-[#100a06] border-2 border-amber-700/50 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-900/30 group animate-bronze-glow light-sweep-effect">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar with Bronze Glow Ring */}
                  <div className="relative p-1 rounded-2xl bg-gradient-to-tr from-amber-800 via-amber-600 to-amber-700 shadow-md shadow-amber-950 mb-3 group-hover:scale-105 transition-transform">
                    <TokenAvatar
                      symbol={rank3.symbol}
                      address={rank3.address}
                      logoUrl={rank3.logoUrl}
                      fallbackLogoUrl={rank3.fallbackLogoUrl}
                      onchainArtworkContract={rank3.onchainArtworkContract}
                      size="lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-stone-100 font-black text-[10px] flex items-center justify-center border border-stone-950">
                      3
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-[#f5ede4] group-hover:text-amber-200 transition-colors flex items-center gap-1 font-mono">
                    ${rank3.symbol}
                    {rank3.creatorLaunchCount === 1 && (
                      <span title="Single-contract dev">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#a89586] max-w-[170px] truncate font-medium">{rank3.name}</p>

                  {/* Highlighted Metric Badge */}
                  <div className="mt-3.5 w-full py-2 px-3 rounded-xl bg-[#140b07] border border-[#3e2417] shadow-inner">
                    <div className="text-[10px] text-amber-500/90 uppercase tracking-wider font-semibold font-mono">
                      {getPrimaryStat(rank3).label}
                    </div>
                    <div className={`text-lg font-black font-mono mt-0.5 ${
                      criteria === 'change' && (rank3.priceChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-amber-100'
                    }`}>
                      {getPrimaryStat(rank3).value}
                    </div>
                    <div className="text-[10px] font-mono text-[#a89586] mt-0.5">
                      {getPrimaryStat(rank3).sub}
                    </div>
                  </div>

                  {/* Dev & Score */}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-[#a89586]">
                    <span className="font-mono bg-[#140d09] px-2 py-0.5 rounded border border-[#2b1b12]">
                      {dict.hofDev}: {rank3.creator ? `${rank3.creator.slice(0, 4)}...${rank3.creator.slice(-3)}` : 'Verified'}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {dict.hofAgentScore}: {rank3.agentScore || 50}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-[#311c12]">
                  <button
                    onClick={() => onAnalyze(rank3)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#20120b] text-[#d6c5b6] hover:bg-[#2d1b11] hover:text-[#f5ede4] transition-colors border border-[#442617] cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>{dict.hofInspectBtn}</span>
                  </button>
                  <button
                    onClick={() => onTrade(rank3)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-stone-100 hover:from-amber-500 hover:to-amber-600 transition-colors shadow-sm shadow-amber-950 cursor-pointer"
                  >
                    <span>{dict.hofTradeBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-56 rounded-2xl bg-[#1a1412] border border-dashed border-amber-900/50 flex items-center justify-center text-xs text-stone-500 font-mono">
                {lang === 'zh' ? '等待第 3 名入榜...' : lang === 'ja' ? '第3位 集計中...' : 'Awaiting Bronze Champion...'}
              </div>
            )}

            {/* Bronze Pedestal Step Base with Cyber Ring */}
            <div className="relative w-full h-9 sm:h-13 mt-2 rounded-t-xl bg-gradient-to-b from-amber-700/30 via-amber-800/15 to-transparent border-t-2 border-amber-600/80 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
              <span className="font-mono font-black text-amber-400 text-xs tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                #3 BRONZE PEDESTAL
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
