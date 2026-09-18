import React from 'react';
import { VisitorStats, Language } from '../types.ts';
import { I18N } from '../i18n.ts';
import { Eye } from 'lucide-react';

interface VisitorBadgeProps {
  stats: VisitorStats;
  lang: Language;
}

export const VisitorBadge: React.FC<VisitorBadgeProps> = ({ stats, lang }) => {
  const dict = I18N[lang];

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#18120d] border border-[#38281e] text-xs font-mono select-none">
      {/* Realtime Live Active Online */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-emerald-400">
          {stats.activeVisitors}
        </span>
        <span className="text-[11px] text-[#a89586] font-sans">
          {dict.liveOnline}
        </span>
      </div>

      <span className="text-[#38281e]">|</span>

      {/* Total Visits */}
      <div className="flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-amber-400/80" />
        <span className="font-semibold text-[#f7f0e8]">
          {stats.totalVisits.toLocaleString()}
        </span>
        <span className="text-[11px] text-[#a89586] font-sans hidden sm:inline">
          {dict.totalVisitors}
        </span>
      </div>
    </div>
  );
};

