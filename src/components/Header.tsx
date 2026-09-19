import React from 'react';
import { Language, VisitorStats } from '../types.ts';
import { I18N } from '../i18n.ts';
import { copyToClipboard } from '../utils/format.ts';
import { Copy, RefreshCw, ExternalLink, Check, Coffee, Zap, Shield, Sparkles } from 'lucide-react';
import brewOfficialLogo from '../assets/images/brew_agent_logo_1789743336149.jpg';
import { VisitorBadge } from './VisitorBadge.tsx';

interface HeaderProps {
  totalCount: number;
  factoryAddress: string;
  lang: Language;
  onSetLang: (lang: Language) => void;
  isSyncing: boolean;
  onSync: () => void;
  onShowToast: (msg: string) => void;
  visitorStats: VisitorStats;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  factoryAddress,
  lang,
  onSetLang,
  isSyncing,
  onSync,
  onShowToast,
  visitorStats
}) => {
  const [copied, setCopied] = React.useState(false);
  const dict = I18N[lang];

  const handleCopyFactory = async () => {
    const ok = await copyToClipboard(factoryAddress);
    if (ok) {
      setCopied(true);
      onShowToast(lang === 'zh' ? 'BrewFactory 合约地址已复制！' : 'BrewFactory address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-amber-900/40 mb-6">
      <div className="flex items-center gap-3.5">
        {/* Futuristic Hologram Mascot Avatar */}
        <div className="relative w-13 h-13 rounded-2xl overflow-hidden shadow-2xl shadow-amber-600/30 border-2 border-amber-400/80 bg-[#150f0b] shrink-0 group animate-gold-glow">
          <img
            src={brewOfficialLogo}
            alt="Agent BREW Official Mascot"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {/* Hologram scan sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-amber-300/20 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#150f0b] shadow-sm" />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-400">
              <span>Agent BREW</span>
              <span className="text-amber-400 text-sm">☕</span>
            </h1>

            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>BNB CHAIN · 56</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {dict.dbStatus}
            </span>
          </div>

          <p className="text-[11px] font-mono text-[#a89586] mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-amber-200/90 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {totalCount.toLocaleString()} {lang === 'zh' ? '已收录代币' : 'Tracked Tokens'}
            </span>
            <span className="text-[#6d5b4e]">|</span>
            <span>Factory: {factoryAddress.slice(0, 6)}...{factoryAddress.slice(-4)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Real-time Visitor Counter Pill */}
        <VisitorBadge stats={visitorStats} lang={lang} />

        {/* Language Selector */}
        <div className="inline-flex border border-amber-900/60 rounded-xl overflow-hidden bg-[#140e0a]/90 p-0.5 shadow-inner">
          <button
            onClick={() => onSetLang('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' 
                ? 'text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-md font-black' 
                : 'text-[#a89586] hover:text-[#f7f0e8]'
            }`}
            title="English"
          >
            English
          </button>
          <button
            onClick={() => onSetLang('zh')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'zh' 
                ? 'text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-md font-black' 
                : 'text-[#a89586] hover:text-[#f7f0e8]'
            }`}
            title="简体中文"
          >
            简体中文
          </button>
          <button
            onClick={() => onSetLang('ja')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'ja' 
                ? 'text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-md font-black' 
                : 'text-[#a89586] hover:text-[#f7f0e8]'
            }`}
            title="日本語"
          >
            日本語
          </button>
        </div>

        {/* Copy Factory Button */}
        <button
          onClick={handleCopyFactory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#18100c] text-[#d6c5b6] border border-amber-900/50 hover:bg-[#251812] hover:text-white hover:border-amber-500/50 transition-all shadow-sm cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400/80" />}
          <span>{dict.copyBtn}</span>
        </button>

        {/* Sync Database Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#18100c] text-amber-200 border border-amber-700/50 hover:bg-amber-950/40 hover:text-white hover:border-amber-400 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
          <span>{isSyncing ? dict.syncing : dict.syncBtn}</span>
        </button>

        {/* Brew.family External Link */}
        <a
          href="https://brew.family"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-stone-950 hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-950/60"
        >
          <span>brew.family</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};
