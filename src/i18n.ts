import { Language } from './types.ts';

export interface TranslationDict {
  dbStatus: string;
  totalLaunches: string;
  trackedVol: string;
  ecosystemFdv: string;
  multiDevs: string;
  activeDexSub: string;
  volSub: string;
  mcapSub: string;
  multiDevsSub: string;
  tabRadar: string;
  tabCopilot: string;
  tabPicks: string;
  tabDevs: string;
  quickFilters: string;
  singleDev: string;
  alertAudioOn: string;
  alertAudioOff: string;
  trackContractBtn: string;
  trackCustomPh: string;
  searchPh: string;
  thRank: string;
  thToken: string;
  thPrice: string;
  thChange: string;
  thMcap: string;
  thMarketCap: string;
  thVol: string;
  thVolume24h: string;
  thLiq: string;
  thLiquidity: string;
  thDev: string;
  thScore: string;
  thActions: string;
  btnAnalyze: string;
  btnSwap: string;
  prevPage: string;
  nextPage: string;
  modalTitle: string;
  sec1Title: string;
  sec2Title: string;
  sec3Title: string;
  sec4Title: string;
  sec5Title: string;
  newReleaseTitle: string;
  // Additional translations
  allTokens: string;
  newestReleases: string;
  withDexLiq: string;
  topGainers: string;
  topMcap: string;
  topVol: string;
  highestScore: string;
  serialDevRisk: string;
  copilotGreeting: string;
  copilotChip1: string;
  copilotChip2: string;
  copilotChip3: string;
  copilotChip4: string;
  copilotChip5: string;
  copilotInputPh: string;
  copilotSend: string;
  copilotTopPicksTitle: string;
  copilotRulesTitle: string;
  copilotRuleDev: string;
  copilotRuleLiq: string;
  copilotRuleOrder: string;
  copilotRuleSec: string;
  picksDesc: string;
  devClusterTitle: string;
  extremeSerial: string;
  repeatDev: string;
  liquidPairs: string;
  farmKing: string;
  liveOnline: string;
  totalVisitors: string;
}

export const I18N: Record<Language, TranslationDict> = {
  en: {
    dbStatus: '⚡ Supabase Connected',
    totalLaunches: 'Total Launchpad Tokens',
    trackedVol: 'Tracked 24h Volume',
    ecosystemFdv: 'Ecosystem FDV',
    multiDevs: 'Multi-Token Devs',
    activeDexSub: 'with DEX liquidity',
    volSub: 'PancakeSwap & BSC DEXs',
    mcapSub: 'Aggregate token valuation',
    multiDevsSub: 'Wallets launched >1 token (risk)',
    tabRadar: '📊 Token Radar & DEX Live',
    tabCopilot: '🤖 Copilot Terminal',
    tabPicks: '💎 Agent Top Picks',
    tabDevs: '🕵️ Dev Cluster Map',
    quickFilters: '⚡ Quick Filters:',
    singleDev: '🛡️ Single Dev (Focused)',
    alertAudioOn: '🔔 Alert Audio: ON',
    alertAudioOff: '🔕 Alert Audio: OFF',
    trackContractBtn: '+ Track Contract',
    trackCustomPh: 'Track custom BSC contract (enter 0x...)...',
    searchPh: 'Search token, symbol, contract, or dev in launches...',
    thRank: 'Rank / Token',
    thToken: 'Token',
    thPrice: 'Price (USD)',
    thChange: '24h Change',
    thMcap: 'Market Cap',
    thMarketCap: 'Market Cap',
    thVol: '24h Volume',
    thVolume24h: '24h Volume',
    thLiq: 'Liquidity',
    thLiquidity: 'Liquidity',
    thDev: 'Dev Cluster',
    thScore: 'Agent Score',
    thActions: 'Actions',
    btnAnalyze: 'Analyze ↗',
    btnSwap: 'Buy ⚡',
    prevPage: '‹ Previous',
    nextPage: 'Next ›',
    modalTitle: 'Token Analysis & Dev Intel',
    sec1Title: '📊 MARKET METRICS & ORDER FLOW',
    sec2Title: '🤖 TACTICAL VERDICT & SECURITY AUDIT',
    sec3Title: '🕵️ DEVELOPER & TOP HOLDERS INTEL',
    sec4Title: '💰 PROFIT SIMULATOR (DYNAMIC ROI)',
    sec5Title: '📑 CONTRACT IDENTITY & VERIFICATION',
    newReleaseTitle: 'NEW TOKEN LAUNCH DETECTED!',
    allTokens: '🌐 All Tracked Tokens',
    newestReleases: '🆕 Newest Releases',
    withDexLiq: '💧 With DEX Liquidity',
    topGainers: '🚀 Top Gainers',
    topMcap: '🏆 Top MCap',
    topVol: '⚡ Top Volume',
    highestScore: '🤖 Highest Score',
    serialDevRisk: '🚨 Serial Dev Risk',
    copilotGreeting: 'Hello! I am Agent BREW Tactical Terminal.\nOperating 100% deterministic intelligence analyzing 2,080+ token launches on brew.family (BNB Chain).\n\nSelect a tactical quick prompt below or type any token symbol (e.g. "BREW") or contract address (0x...) for instant audit!',
    copilotChip1: 'Top 3 High Conviction Picks',
    copilotChip2: 'Riskiest Serial Devs (>3 Tokens)',
    copilotChip3: 'Single-Dev Liquid Gems',
    copilotChip4: 'Top Volume Active Now',
    copilotChip5: '5 Freshest Launches',
    copilotInputPh: "Ask Agent BREW (e.g. 'top picks', 'safe dev gems', 'dump risk', 'BREW')...",
    copilotSend: 'Send',
    copilotTopPicksTitle: '💎 HIGH CONVICTION PICKS',
    copilotRulesTitle: '⚙️ AGENT RULES ENGINE',
    copilotRuleDev: 'Dev Filtering: Deployers with >3 launches penalized for serial dump risk.',
    copilotRuleLiq: 'Liquidity Threshold: Liquidity >$1,000 WBNB receives high stability weighting.',
    copilotRuleOrder: 'Order Flow Radar: Real-time buyer accumulation vs seller pressure ratio.',
    copilotRuleSec: 'Security Scanner: Instant honeypot & buy/sell tax checks via GoPlus BSC Security.',
    picksDesc: 'Curated high-conviction token radar filtered by Agent BREW algorithms based on active DEX liquidity depth, buyer accumulation pressure, clean single-developer history, and sustained 24h trading volume on BNB Chain.',
    devClusterTitle: 'Developer Wallet Clustering',
    extremeSerial: '🚨 Extreme Serial (≥5)',
    repeatDev: '⚠️ Repeat (3-4 launches)',
    liquidPairs: '💧 Active Liquidity Pools',
    farmKing: '👑 Farm King Record',
    liveOnline: 'online',
    totalVisitors: 'visits'
  },
  zh: {
    dbStatus: '⚡ Supabase 已连接',
    totalLaunches: '发射台代币总数',
    trackedVol: '24小时追踪交易量',
    ecosystemFdv: '生态总流通市值',
    multiDevs: '多币开发者',
    activeDexSub: '具有 DEX 流动性',
    volSub: 'PancakeSwap 及 BSC DEX',
    mcapSub: '代币综合估值',
    multiDevsSub: '发布超1个代币的钱包 (存在跑路风险)',
    tabRadar: '📊 代币雷达与实时 DEX',
    tabCopilot: '🤖 战术智能终端',
    tabPicks: '💎 AI 精选代币',
    tabDevs: '🕵️ 开发者关联图谱',
    quickFilters: '⚡ 快捷筛选:',
    singleDev: '🛡️ 单一开发者 (专注)',
    alertAudioOn: '🔔 提示音效: 开启',
    alertAudioOff: '🔕 提示音效: 关闭',
    trackContractBtn: '+ 追踪合约',
    trackCustomPh: '追踪自定义 BSC 合约 (输入 0x...)...',
    searchPh: '搜索代币、符号、合约或开发者地址...',
    thRank: '排名 / 代币',
    thToken: '代币',
    thPrice: '价格 (美元)',
    thChange: '24小时涨跌',
    thMcap: '市值',
    thMarketCap: '市值',
    thVol: '24小时交易量',
    thVolume24h: '24小时交易量',
    thLiq: '流动性',
    thLiquidity: '流动性',
    thDev: '开发者关联',
    thScore: 'AI 评分',
    thActions: '交易操作',
    btnAnalyze: '深度分析 ↗',
    btnSwap: '快速买入 ⚡',
    prevPage: '‹ 上一页',
    nextPage: '下一页 ›',
    modalTitle: '代币深度分析与开发者情报',
    sec1Title: '📊 市场指标与订单流',
    sec2Title: '🤖 AI 策略研判与安全审计',
    sec3Title: '🕵️ 开发者与前十持币者情报',
    sec4Title: '💰 利润模拟器 (动态收益率)',
    sec5Title: '📑 合约身份验证与区块数据',
    newReleaseTitle: '检测到新代币发射！',
    allTokens: '🌐 全部追踪代币',
    newestReleases: '🆕 最新发布',
    withDexLiq: '💧 具备 DEX 流动性',
    topGainers: '🚀 涨幅榜前列',
    topMcap: '🏆 市值榜首',
    topVol: '⚡ 交易量榜首',
    highestScore: '🤖 最高评分',
    serialDevRisk: '🚨 连环发币风险',
    copilotGreeting: '您好！我是 Agent BREW 战术智能终端。\n运行 100% 确定性算法，实时监控 brew.family (BNB Chain) 上的 2,080+ 代币发射。\n\n请点击下方快捷指令或输入代币符号 (如 "BREW")、合约地址 (0x...) 即可进行即时审计！',
    copilotChip1: '前 3 高确信度精选',
    copilotChip2: '极高风险连环发币者 (>3代币)',
    copilotChip3: '单一开发者流动性代币',
    copilotChip4: '当前最高交易量代币',
    copilotChip5: '最新发布的 5 个代币',
    copilotInputPh: '向 Agent BREW 提问 (如 "top picks", "安全代币", "跑路风险", "BREW")...',
    copilotSend: '发送',
    copilotTopPicksTitle: '💎 高确信度精选',
    copilotRulesTitle: '⚙️ 智能分析引擎规则',
    copilotRuleDev: '开发者过滤：发币超过3次的开发者会被扣分以防范连环抛售跑路风险。',
    copilotRuleLiq: '流动性阈值：资金池大于 $1,000 WBNB 将获得极高的稳定性权重。',
    copilotRuleOrder: '订单流雷达：实时买方累积与卖方抛压比率监测。',
    copilotRuleSec: '安全扫描：通过 GoPlus BSC 安全审计即时检查蜜罐及买卖滑点税。',
    picksDesc: '基于 DEX 深度流动性、买方累积压力、单一开发者信誉以及 BNB 链上持续 24 小时交易量，由 Agent BREW 算法严格筛选的高确信度代币雷达。',
    devClusterTitle: '开发者钱包聚类图谱',
    extremeSerial: '🚨 极高频连环发币者 (≥5)',
    repeatDev: '⚠️ 重复发币者 (3-4次)',
    liquidPairs: '💧 活跃流动性池',
    farmKing: '👑 历史发币之王',
    liveOnline: '在线',
    totalVisitors: '访问'
  }
};
