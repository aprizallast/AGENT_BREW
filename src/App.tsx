import React, { useState, useEffect, useCallback } from 'react';
import { Token, MarketStats, ViewTab, Language } from './types.ts';
import { I18N } from './i18n.ts';
import { Header } from './components/Header.tsx';
import { MetricsBar } from './components/MetricsBar.tsx';
import { TokenRadar } from './components/TokenRadar.tsx';
import { CopilotTerminal } from './components/CopilotTerminal.tsx';
import { TopPicksView } from './components/TopPicksView.tsx';
import { DevClusterView } from './components/DevClusterView.tsx';
import { DetailModal } from './components/DetailModal.tsx';
import { useRealtimeVisitors } from './hooks/useRealtimeVisitors.ts';
import { playAlertChime } from './utils/format.ts';
import { fetchTokensWithFallback, inspectContractDirect, getInitialCachedPayload } from './utils/directDataLoader.ts';
import { Rocket, ExternalLink } from 'lucide-react';

const FACTORY_ADDRESS = '0xeea6c3bfb29fd9a35380438956bae7b109c63d85';

export default function App() {
  const initialData = React.useMemo(() => getInitialCachedPayload(), []);
  const { stats: visitorStats } = useRealtimeVisitors();
  const [tokens, setTokens] = useState<Token[]>(initialData.tokens);
  const [stats, setStats] = useState<MarketStats>(initialData.stats);
  const [totalLaunches, setTotalLaunches] = useState<number>(initialData.totalLaunches || 2164);
  const [activeTab, setActiveTab] = useState<ViewTab>('radar');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('agent_brew_lang') as Language) || 'en';
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newReleaseToken, setNewReleaseToken] = useState<Token | null>(null);
  const [devClusterFilter, setDevClusterFilter] = useState<string>('');
  const [radarFilterDev, setRadarFilterDev] = useState<string>('');
  const enrichedSetRef = React.useRef<Set<string>>(new Set());

  const handleVisibleTokens = useCallback(async (visibleTokens: Token[]) => {
    const toEnrich = visibleTokens.filter(t => t.address && !enrichedSetRef.current.has(t.address.toLowerCase()));
    if (toEnrich.length === 0) return;

    toEnrich.forEach(t => enrichedSetRef.current.add(t.address.toLowerCase()));
    const addrs = toEnrich.map(t => t.address).slice(0, 30).join(',');
    if (!addrs) return;

    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/bsc/${addrs}`);
      if (!res.ok) return;
      const pairs = await res.json();
      if (!Array.isArray(pairs) || pairs.length === 0) return;

      const bestPairs: Record<string, any> = {};
      pairs.forEach((p: any) => {
        const base = (p.baseToken?.address || '').toLowerCase();
        if (base && (!bestPairs[base] || (p.liquidity?.usd || 0) > (bestPairs[base].liquidity?.usd || 0))) {
          bestPairs[base] = p;
        }
      });

      setTokens(prev => {
        const next = prev.map(tok => {
          const p = bestPairs[tok.address.toLowerCase()];
          if (!p) return tok;
          return {
            ...tok,
            priceUsd: parseFloat(p.priceUsd) || tok.priceUsd,
            priceChange24h: p.priceChange?.h24 != null ? Number(p.priceChange.h24) : tok.priceChange24h,
            volume24h: p.volume?.h24 != null ? Number(p.volume.h24) : tok.volume24h,
            liquidityUsd: p.liquidity?.usd != null ? Number(p.liquidity.usd) : tok.liquidityUsd,
            marketCap: Number(p.marketCap || p.fdv || tok.marketCap),
            logoUrl: p.info?.imageUrl || tok.logoUrl,
            pool: p.pairAddress || tok.pool,
            dexUrl: p.url || tok.dexUrl,
            buys24h: Number(p.txns?.h24?.buys || tok.buys24h),
            sells24h: Number(p.txns?.h24?.sells || tok.sells24h),
            buyRatio: tok.sells24h > 0 ? Math.round((tok.buys24h / tok.sells24h) * 100) / 100 : tok.buyRatio
          };
        });

        // Recalculate market stats dynamically
        let totalVol = 0;
        let totalMcap = 0;
        let activePairs = 0;
        next.forEach(t => {
          if (t.volume24h > 0 || t.marketCap > 0 || t.liquidityUsd > 0) {
            activePairs++;
            totalVol += (t.volume24h || 0);
            totalMcap += (t.marketCap || 0);
          }
        });

        setStats(prevStats => ({
          ...prevStats,
          totalTrackedVol: Math.max(Math.round(totalVol * 100) / 100, prevStats.totalTrackedVol),
          totalTrackedMcap: Math.max(Math.round(totalMcap * 100) / 100, prevStats.totalTrackedMcap),
          activePairs: Math.max(activePairs, prevStats.activePairs)
        }));

        return next;
      });
    } catch {
      // silent fallback
    }
  }, []);

  const dict = I18N[lang];

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('agent_brew_lang', newLang);
  };

  // 1. Fetch Tokens Data with Automatic Direct Fallback
  const loadData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      const data = await fetchTokensWithFallback(isManual);

      if (data && Array.isArray(data.tokens) && data.tokens.length > 0) {
        // Detect if a new token was launched since last check
        setTokens(prev => {
          if (prev.length > 0 && data.tokens.length > prev.length) {
            const fresh = data.tokens[0];
            if (fresh && fresh.address !== prev[0]?.address) {
              setNewReleaseToken(fresh);
              if (audioEnabled) playAlertChime();
            }
          }
          return data.tokens;
        });

        if (data.stats) setStats(data.stats);
        if (data.totalLaunches) setTotalLaunches(data.totalLaunches);

        if (isManual) {
          const sourceLabel = data.source === 'direct_brew_dex' ? ' (Direct Cloud)' : '';
          showToast(`✅ Synced ${data.tokens.length} tokens successfully!${sourceLabel}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to load token data:', err);
      if (isManual) showToast('Sync failed: ' + (err.message || 'Check network connection'));
    } finally {
      if (isManual) setIsSyncing(false);
    }
  }, [audioEnabled, showToast]);

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      if (!document.hidden) loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 2. Custom Contract Tracking
  const handleTrackCustom = async (address: string) => {
    showToast(`Inspecting contract ${address.slice(0, 6)}...`);
    try {
      const data = await inspectContractDirect(address);

      const pair = data.pair;
      const bl = data.brewLaunch;
      const sec = data.security;

      const customToken: Token = {
        index: tokens.length + 1,
        address: address.toLowerCase(),
        pool: bl?.pool || pair?.pairAddress || '',
        creator: data.creator || bl?.creator || sec?.creator_address || '',
        creatorLaunchCount: 1,
        name: bl?.name || pair?.baseToken?.name || data.name || 'Brew Custom Token',
        symbol: bl?.symbol || pair?.baseToken?.symbol || data.symbol || 'BREW',
        quoteSymbol: pair?.quoteToken?.symbol || 'WBNB',
        quoteAddress: pair?.quoteToken?.address || '',
        launchedAt: Date.now(),
        blockNumber: 0,
        txHash: '',
        logoUrl: bl?.imageUrl || pair?.info?.imageUrl || '',
        fallbackLogoUrl: `https://dd.dexscreener.com/ds-data/tokens/bsc/${address}.png`,
        priceUsd: pair ? parseFloat(pair.priceUsd) || 0 : (data.priceUsd || 0),
        priceChange24h: pair?.priceChange?.h24 != null ? Number(pair.priceChange.h24) : 0,
        volume24h: pair?.volume?.h24 != null ? Number(pair.volume.h24) : (data.volume24h || 0),
        liquidityUsd: pair?.liquidity?.usd != null ? Number(pair.liquidity.usd) : (data.liquidityUsd || 0),
        marketCap: pair ? Number(pair.marketCap || pair.fdv || 0) : (data.marketCap || 0),
        buys24h: pair?.txns?.h24?.buys || 0,
        sells24h: pair?.txns?.h24?.sells || 0,
        buyRatio: 1,
        agentScore: 60,
        agentVerdict: 'TRACKED',
        agentSignals: ['Added via custom contract inspection', 'BSC active pair'],
        dexUrl: pair?.url || data.dexUrl || `https://dexscreener.com/bsc/${address}`,
        brewUrl: `https://brew.family/token/${address}`,
        bubblemapsUrl: `https://bubblemaps.io/bsc/token/${address}`,
        bscscanTokenUrl: `https://bscscan.com/token/${address}`,
        bscscanCreatorUrl: data.creator ? `https://bscscan.com/address/${data.creator}` : '',
        bscscanTxUrl: ''
      };

      setTokens(prev => [customToken, ...prev.filter(x => x.address !== customToken.address)]);
      setSelectedToken(customToken);
      setIsDetailOpen(true);
      showToast(`Contract ${customToken.symbol} tracked successfully!`);
    } catch (err: any) {
      showToast('Error tracking contract: ' + (err.message || 'Verification failed'));
    }
  };

  // 3. Live Search on Brew & BSC
  const handleLiveSearch = async (query: string) => {
    showToast(`Searching "${query}" live on Brew & BSC...`);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tokens && data.tokens.length > 0) {
          showToast(`Found ${data.tokens.length} tokens matching "${query}"!`);
          loadData(false);
        } else {
          showToast(`No tokens found on server for "${query}".`);
        }
      }
    } catch {
      showToast('Live search failed.');
    }
  };

  const handleAnalyzeToken = (token: Token) => {
    setSelectedToken(token);
    setIsDetailOpen(true);
  };

  const handleTradeToken = (token: Token) => {
    window.open(`https://dexscreener.com/bsc/${token.pool || token.address}`, '_blank');
    showToast(`Opening DexScreener to trade ${token.symbol}...`);
  };

  return (
    <div className="min-h-screen bg-[#0f0c0a] text-[#f7f0e8] p-3 sm:p-5 font-sans relative selection:bg-amber-600 selection:text-stone-950">
      {/* Background Radial Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.07),rgba(45,30,22,0.25)_45%,transparent_75%)] -z-10" />

      {/* New Release Alert Banner */}
      {newReleaseToken && (
        <div className="bg-gradient-to-r from-amber-700/30 via-amber-600/20 to-amber-700/30 border border-amber-600/60 rounded-xl p-3 mb-3 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-amber-300 text-xs tracking-wider uppercase block">
                {dict.newReleaseTitle}
              </strong>
              <span className="text-xs text-[#d6c5b6]">
                {newReleaseToken.symbol} ({newReleaseToken.name}) launched on brew.family!
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAnalyzeToken(newReleaseToken)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-sm"
            >
              Inspect ↗
            </button>
            <button
              onClick={() => setNewReleaseToken(null)}
              className="text-[#a89586] hover:text-white text-xs px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          totalCount={totalLaunches}
          factoryAddress={FACTORY_ADDRESS}
          lang={lang}
          onSetLang={handleSetLang}
          isSyncing={isSyncing}
          onSync={() => loadData(true)}
          onShowToast={showToast}
          visitorStats={visitorStats}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#38281e] mb-4 pb-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'radar'
                ? 'bg-gradient-to-r from-[#2c1d15] to-[#241710] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#1a130f]'
            }`}
          >
            ☕ {dict.tabRadar}
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'copilot'
                ? 'bg-gradient-to-r from-[#2c1d15] to-[#241710] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#1a130f]'
            }`}
          >
            🤖 {dict.tabCopilot}
          </button>
          <button
            onClick={() => setActiveTab('picks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'picks'
                ? 'bg-gradient-to-r from-[#2c1d15] to-[#241710] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#1a130f]'
            }`}
          >
            💎 {dict.tabPicks}
          </button>
          <button
            onClick={() => setActiveTab('devs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'devs'
                ? 'bg-gradient-to-r from-[#2c1d15] to-[#241710] text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-950/40'
                : 'text-[#a89586] hover:text-[#f7f0e8] hover:bg-[#1a130f]'
            }`}
          >
            🕵️ {dict.tabDevs}
          </button>
        </div>

        {/* Global Metrics Bar */}
        <MetricsBar
          stats={stats}
          totalLaunches={totalLaunches}
          lang={lang}
        />

        {/* View Switcher */}
        {activeTab === 'radar' && (
          <TokenRadar
            tokens={tokens}
            totalLaunches={totalLaunches}
            lang={lang}
            onAnalyze={handleAnalyzeToken}
            onTrade={handleTradeToken}
            onFilterByDev={devAddr => {
              setDevClusterFilter(devAddr);
              setActiveTab('devs');
              showToast(`Auditing Dev Cluster for ${devAddr.slice(0, 8)}...`);
            }}
            onTrackCustom={handleTrackCustom}
            audioEnabled={audioEnabled}
            onToggleAudio={() => setAudioEnabled(!audioEnabled)}
            onLiveSearch={handleLiveSearch}
            onVisibleTokens={handleVisibleTokens}
            initialSearch={radarFilterDev}
            onClearSearch={() => setRadarFilterDev('')}
          />
        )}

        {activeTab === 'copilot' && (
          <CopilotTerminal
            tokens={tokens}
            lang={lang}
            onAnalyzeToken={handleAnalyzeToken}
            onTradeToken={handleTradeToken}
          />
        )}

        {activeTab === 'picks' && (
          <TopPicksView
            tokens={tokens}
            lang={lang}
            onAnalyze={handleAnalyzeToken}
            onTrade={handleTradeToken}
          />
        )}

        {activeTab === 'devs' && (
          <DevClusterView
            tokens={tokens}
            onSelectToken={handleAnalyzeToken}
            onTradeToken={handleTradeToken}
            onShowToast={showToast}
            onViewInRadar={devAddr => {
              setRadarFilterDev(devAddr);
              setActiveTab('radar');
              showToast(`Filtering Token Radar for Dev ${devAddr.slice(0, 8)}...`);
            }}
            initialDevFilter={devClusterFilter}
            onClearInitialDev={() => setDevClusterFilter('')}
          />
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-[#38281e] flex flex-wrap items-center justify-between text-xs text-[#9e8979] gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span>☕ Data Feeds: brew.family Launchpad API &amp; DexScreener BSC API</span>
            <span>•</span>
            <span>Security: GoPlus Token Security (56)</span>
            <span>•</span>
            <span>Storage: Supabase PostgreSQL</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <a
              href="https://brew.family"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>brew.family</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </div>

      {/* Deep Dive Analysis Modal */}
      <DetailModal
        token={selectedToken}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        lang={lang}
        onTrade={handleTradeToken}
        onSelectAnotherToken={other => {
          setSelectedToken(other);
        }}
        allTokens={tokens}
        onShowToast={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-[#1c140f] border border-amber-600/50 text-[#fdf9f4] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl shadow-black/60 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span>☕</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
