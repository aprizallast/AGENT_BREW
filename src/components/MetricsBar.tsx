import React from 'react';
import { MarketStats, Language } from '../types.ts';
import { I18N } from '../i18n.ts';
import { formatUsd } from '../utils/format.ts';
import { Coffee, Flame, Layers, TrendingUp } from 'lucide-react';

interface MetricsBarProps {
  stats: MarketStats;
  totalLaunches: number;
  lang: Language;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats, totalLaunches, lang }) => {
  const dict = I18N[lang];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3.5 hover:border-amber-600/50 transition-all shadow-md shadow-black/20 group">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#a89586] uppercase tracking-wider mb-1">
          <span>{dict.totalLaunches}</span>
          <Coffee className="w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="text-xl font-extrabold font-mono text-[#fdf9f4]">
          {totalLaunches ? totalLaunches.toLocaleString() : '2,081'}
        </div>
        <div className="text-[11px] text-[#9e8979] mt-0.5">
          {stats.activePairs} {dict.activeDexSub}
        </div>
      </div>

      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3.5 hover:border-amber-600/50 transition-all shadow-md shadow-black/20 group">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#a89586] uppercase tracking-wider mb-1">
          <span>{dict.trackedVol}</span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500/70 group-hover:text-emerald-400 transition-colors" />
        </div>
        <div className="text-xl font-extrabold font-mono text-emerald-400">
          {formatUsd(stats.totalTrackedVol)}
        </div>
        <div className="text-[11px] text-[#9e8979] mt-0.5">
          {dict.volSub}
        </div>
      </div>

      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3.5 hover:border-amber-600/50 transition-all shadow-md shadow-black/20 group">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#a89586] uppercase tracking-wider mb-1">
          <span>{dict.ecosystemFdv}</span>
          <Flame className="w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="text-xl font-extrabold font-mono text-[#fdf9f4]">
          {formatUsd(stats.totalTrackedMcap)}
        </div>
        <div className="text-[11px] text-[#9e8979] mt-0.5">
          {dict.mcapSub}
        </div>
      </div>

      <div className="bg-[#18120d] border border-[#38281e] rounded-xl p-3.5 hover:border-amber-600/50 transition-all shadow-md shadow-black/20 group">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#a89586] uppercase tracking-wider mb-1">
          <span>{dict.multiDevs}</span>
          <Layers className="w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-400 transition-colors" />
        </div>
        <div className="text-xl font-extrabold font-mono text-amber-400">
          {stats.multiTokenDevs || '29'}
        </div>
        <div className="text-[11px] text-[#9e8979] mt-0.5">
          {dict.multiDevsSub}
        </div>
      </div>
    </div>
  );
};
