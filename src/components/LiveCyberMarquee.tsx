import React from 'react';
import { Token, Language } from '../types.ts';
import { formatUsd, formatPct } from '../utils/format.ts';
import { Activity, Zap, TrendingUp, Flame, Radio } from 'lucide-react';

interface LiveCyberMarqueeProps {
  tokens: Token[];
  totalLaunches: number;
  totalVolume: number;
  lang?: Language;
  onSelectToken: (token: Token) => void;
}

export const LiveCyberMarquee: React.FC<LiveCyberMarqueeProps> = ({
  tokens,
  totalLaunches,
  totalVolume,
  lang = 'en',
  onSelectToken
}) => {
  // Top gainers & active trending tokens
  const topGainers = React.useMemo(() => {
    return [...tokens]
      .filter(t => (t.priceChange24h || 0) > 0 || (t.volume24h || 0) > 100)
      .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))
      .slice(0, 10);
  }, [tokens]);

  const items = topGainers.length > 0 ? topGainers : tokens.slice(0, 8);

  return (
    <div className="relative w-full bg-[#0d0906]/95 border-b border-amber-900/40 text-xs text-[#d6c5b6] py-1.5 overflow-hidden select-none z-20 backdrop-blur-md">
      {/* Left Static Tactical Badge */}
      <div className="absolute left-0 inset-y-0 z-10 flex items-center px-3 bg-gradient-to-r from-[#0d0906] via-[#0d0906] to-transparent pointer-events-none">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono font-bold text-[10px] border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>LIVE RADAR</span>
        </span>
      </div>

      {/* Right Fade Gradient */}
      <div className="absolute right-0 inset-y-0 z-10 w-16 bg-gradient-to-l from-[#0d0906] to-transparent pointer-events-none" />

      {/* Scrolling Cyber Marquee */}
      <div className="animate-marquee flex items-center gap-8 pl-36">
        {/* Loop content twice for seamless infinite scrolling */}
        {[...items, ...items].map((t, idx) => {
          const isGainer = (t.priceChange24h || 0) >= 0;
          return (
            <button
              key={`${t.address}-${idx}`}
              onClick={() => onSelectToken(t)}
              className="inline-flex items-center gap-2 hover:bg-amber-950/40 px-2 py-0.5 rounded transition-all cursor-pointer group"
            >
              <span className="font-mono font-black text-amber-300 group-hover:text-white transition-colors">
                ${t.symbol}
              </span>

              {t.priceUsd > 0 && (
                <span className="font-mono text-[#a89586] text-[11px]">
                  {formatUsd(t.priceUsd)}
                </span>
              )}

              <span
                className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded ${
                  isGainer
                    ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-700/40'
                    : 'text-rose-400 bg-rose-950/80 border border-rose-700/40'
                }`}
              >
                {formatPct(t.priceChange24h || 0)}
              </span>

              {t.volume24h > 0 && (
                <span className="text-[10px] text-amber-500/80 font-mono hidden sm:inline">
                  Vol: {formatUsd(t.volume24h)}
                </span>
              )}
            </button>
          );
        })}

        {/* Global Live Ticker Intel Items */}
        <div className="inline-flex items-center gap-2 text-[10px] font-mono text-amber-400/80 border-l border-amber-900/60 pl-4">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>BSC BLOCK TIME: ~3.0s</span>
        </div>

        <div className="inline-flex items-center gap-2 text-[10px] font-mono text-amber-300/90">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>TOTAL LAUNCHES: {totalLaunches.toLocaleString()}</span>
        </div>

        <div className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400">
          <Zap className="w-3 h-3" />
          <span>24H VOL: {formatUsd(totalVolume)}</span>
        </div>
      </div>
    </div>
  );
};
