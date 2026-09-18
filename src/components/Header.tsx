import React from 'react';
import { Language, VisitorStats } from '../types.ts';
import { I18N } from '../i18n.ts';
import { copyToClipboard } from '../utils/format.ts';
import { Copy, RefreshCw, ExternalLink, Check, Coffee } from 'lucide-react';
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
    <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#38281e] mb-4">
      <div className="flex items-center gap-3">
        {/* Official Web Mascot Logo */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-amber-900/30 border-2 border-amber-600/50 bg-[#19130f] shrink-0 group">
          <img
            src={brewOfficialLogo}
            alt="Agent BREW Official Mascot"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/20 rounded-xl pointer-events-none" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-extrabold text-[#fcf8f2] tracking-tight flex items-center gap-1.5">
              <span>Agent BREW</span>
              <span className="text-amber-500 text-xs">☕</span>
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-[#281c15] border border-amber-600/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Coffee className="w-3 dot h-3 text-amber-400" />
              <span>BNB Chain · 56</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-[#16231a] border border-emerald-600/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {dict.dbStatus}
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#a89586] mt-0.5 flex items-center gap-1.5">
            <span>{lang === 'zh' ? '数据库: Supabase PostgreSQL ·' : 'Database: Supabase PostgreSQL ·'}</span>
            <span className="text-amber-400 font-semibold">{totalCount.toLocaleString()} {lang === 'zh' ? '已存代币' : 'Tokens Stored'}</span>
            <span>· Factory: {factoryAddress.slice(0, 6)}...{factoryAddress.slice(-4)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Real-time Visitor Counter Pill */}
        <VisitorBadge
          stats={visitorStats}
          lang={lang}
        />

        {/* Language Selector: English & Chinese */}
        <div className="inline-flex border border-[#38281e] rounded-lg overflow-hidden bg-[#18120d] p-0.5">
          <button
            onClick={() => onSetLang('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              lang === 'en' ? 'text-amber-300 bg-[#2c1e16] border border-amber-600/30 shadow-sm' : 'text-[#a89586] hover:text-[#f7f0e8]'
            }`}
            title="Switch to English"
          >
            🇺🇸 EN
          </button>
          <button
            onClick={() => onSetLang('zh')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              lang === 'zh' ? 'text-amber-300 bg-[#2c1e16] border border-amber-600/30 shadow-sm' : 'text-[#a89586] hover:text-[#f7f0e8]'
            }`}
            title="切换到中文"
          >
            🇨🇳 中文
          </button>
        </div>

        <button
          onClick={handleCopyFactory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18120d] text-[#d6c5b6] border border-[#38281e] hover:bg-[#251b14] hover:text-[#f7f0e8] hover:border-amber-600/40 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400/80" />}
          <span>{lang === 'zh' ? '复制工厂合约' : 'Copy Factory'}</span>
        </button>

        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18120d] text-[#d6c5b6] border border-[#38281e] hover:bg-[#251b14] hover:text-[#f7f0e8] hover:border-amber-600/40 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400/80'}`} />
          <span>{isSyncing ? (lang === 'zh' ? '同步中...' : 'Syncing...') : (lang === 'zh' ? '同步数据库' : 'Sync Database')}</span>
        </button>

        <a
          href="https://brew.family"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 transition-all shadow-md shadow-amber-950/40"
        >
          <span>brew.family</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};

