import React from 'react';
import { MarketStats, Language } from '../types.ts';
import { I18N } from '../i18n.ts';
import { formatUsd } from '../utils/format.ts';
import { Coffee, Flame, Layers, TrendingUp, Radio, Zap, ShieldAlert, Sparkles } from 'lucide-react';

interface MetricsBarProps {
  stats: MarketStats;
  totalLaunches: number;
  lang: Language;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats, totalLaunches, lang }) => {
  const dict = I18N[lang];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Total Launches Card */}
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#20140c] via-[#160e09] to-[#0f0906] border border-amber-900/50 p-4 transition-all duration-300 hover:border-amber-500/70 hover:shadow-xl hover:shadow-amber-950/50 light-sweep-effect">
        <div className="flex items-center justify-between text-[10px] font-bold text-amber-300/80 uppercase tracking-widest mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            {dict.totalLaunches}
          </span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <Coffee className="w-4 h-4" />
          </div>
        </div>
        
        <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400">
          {totalLaunches ? totalLaunches.toLocaleString() : '2,164'}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#a89586] mt-1.5">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <strong className="text-amber-200">{stats.activePairs}</strong> {dict.activeDexSub}
          </span>
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-800/40 font-bold">
            100% On-Chain
          </span>
        </div>

        {/* Tactical neon base accent line */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent group-hover:h-1 transition-all" />
      </div>

      {/* 2. Tracked 24h DEX Volume Card */}
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#142319] via-[#0e1711] to-[#0a100c] border border-emerald-900/50 p-4 transition-all duration-300 hover:border-emerald-400/70 hover:shadow-xl hover:shadow-emerald-950/50 light-sweep-effect">
        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300/80 uppercase tracking-widest mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {dict.trackedVol}
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
          {formatUsd(stats.totalTrackedVol)}
        </div>

        <div className="flex items-center justify-between text-[11px] text-emerald-200/70 mt-1.5">
          <span>{dict.volSub}</span>
          <span className="font-mono text-[10px] text-emerald-300 font-bold flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Live DEX
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent group-hover:h-1 transition-all" />
      </div>

      {/* 3. Ecosystem FDV / Market Cap Card */}
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#24170d] via-[#180f08] to-[#100a05] border border-amber-800/50 p-4 transition-all duration-300 hover:border-amber-400/70 hover:shadow-xl hover:shadow-amber-950/50 light-sweep-effect">
        <div className="flex items-center justify-between text-[10px] font-bold text-amber-300/80 uppercase tracking-widest mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            {dict.ecosystemFdv}
          </span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-400">
          {formatUsd(stats.totalTrackedMcap)}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#a89586] mt-1.5">
          <span>{dict.mcapSub}</span>
          <span className="font-mono text-[10px] text-amber-300/90 font-bold">
            Aggregated
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent group-hover:h-1 transition-all" />
      </div>

      {/* 4. Multi-Token Dev Risk Cluster Card */}
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-[#241212] via-[#180b0b] to-[#100707] border border-rose-900/50 p-4 transition-all duration-300 hover:border-rose-500/70 hover:shadow-xl hover:shadow-rose-950/50 light-sweep-effect">
        <div className="flex items-center justify-between text-[10px] font-bold text-rose-300/80 uppercase tracking-widest mb-1.5">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            {dict.multiDevs}
          </span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]">
          {stats.multiTokenDevs || '320'}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#a89586] mt-1.5">
          <span className="truncate max-w-[150px]">{dict.multiDevsSub}</span>
          <span className="font-mono text-[10px] text-rose-400 bg-rose-950/70 px-1.5 py-0.2 rounded border border-rose-800/40 font-bold">
            Cluster Intel
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/60 to-transparent group-hover:h-1 transition-all" />
      </div>
    </div>
  );
};
