import React, { useState, useEffect } from 'react';
import { resolveArtwork, getCachedArtworkSync } from '../utils/artworkResolver.ts';

interface TokenAvatarProps {
  symbol: string;
  address: string;
  logoUrl?: string;
  fallbackLogoUrl?: string;
  onchainArtworkContract?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Generate consistent background gradient colors from contract address
function getAvatarGradient(address: string): string {
  if (!address) return 'from-amber-600 to-amber-900';
  const charCode = address.charCodeAt(2) || 0;
  const palettes = [
    'from-amber-500 to-orange-700',
    'from-emerald-500 to-teal-800',
    'from-cyan-500 to-blue-800',
    'from-purple-500 to-indigo-800',
    'from-rose-500 to-pink-800',
    'from-yellow-500 to-amber-800',
    'from-violet-500 to-purple-900',
    'from-sky-500 to-indigo-700'
  ];
  return palettes[charCode % palettes.length];
}

function extractContract(raw: string): string {
  if (!raw) return '';
  let str = raw.toLowerCase().trim();
  if (str.startsWith('onchain://56/')) {
    str = str.replace('onchain://56/', '');
  } else if (str.includes('/api/shared/artwork/')) {
    str = str.split('/api/shared/artwork/')[1] || str;
  } else if (str.includes('/api/artwork/')) {
    str = str.split('/api/artwork/')[1] || str;
  }
  const clean = str.split('?')[0].trim();
  if (/^0x[a-f0-9]{40}$/i.test(clean)) return clean;
  return '';
}

export const TokenAvatar: React.FC<TokenAvatarProps> = ({
  symbol,
  address,
  logoUrl,
  fallbackLogoUrl,
  onchainArtworkContract,
  size = 'md',
  className = ''
}) => {
  const artContract = onchainArtworkContract || extractContract(logoUrl || '') || '';

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (logoUrl && (logoUrl.startsWith('data:image') || logoUrl.startsWith('blob:'))) {
      return logoUrl;
    }
    const cached = getCachedArtworkSync(artContract) || getCachedArtworkSync(logoUrl || '') || getCachedArtworkSync(address || '');
    if (cached) return cached;
    if (logoUrl && logoUrl.startsWith('http') && !logoUrl.includes('/api/shared/artwork/')) {
      return logoUrl;
    }
    return null;
  });

  const [attempt, setAttempt] = useState<number>(0);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  // Build clean list of candidate URLs
  const candidates = React.useMemo(() => {
    const list: string[] = [];
    const addr = (address || '').toLowerCase().trim();

    // 1. If we have a verified resolved data/blob URI, prioritize it
    if (resolvedSrc) {
      list.push(resolvedSrc);
    }

    // 2. Direct data URI or proxy URL from logoUrl
    if (logoUrl && (logoUrl.startsWith('data:image') || logoUrl.startsWith('/api/artwork/'))) {
      if (!list.includes(logoUrl)) list.push(logoUrl);
    }

    // 3. Internal API artwork endpoint for decoded on-chain SVG / WebP
    if (artContract && /^0x[a-f0-9]{40}$/i.test(artContract)) {
      const internalUrl = `/api/artwork/${artContract}`;
      if (!list.includes(internalUrl)) list.push(internalUrl);
    }

    // 4. Regular HTTP image (Dexscreener CDN, IPFS, etc.)
    if (logoUrl && logoUrl.trim() && !logoUrl.includes('/api/shared/artwork/') && !logoUrl.includes('dd.dexscreener.com') && !list.includes(logoUrl)) {
      list.push(logoUrl);
    }

    // 5. Fallbacks from trusted token repositories
    if (fallbackLogoUrl && fallbackLogoUrl.trim() && !fallbackLogoUrl.includes('dd.dexscreener.com') && !list.includes(fallbackLogoUrl)) {
      list.push(fallbackLogoUrl);
    }
    if (addr && /^0x[a-f0-9]{40}$/i.test(addr)) {
      list.push(`https://tokens.pancakeswap.finance/images/${addr}.png`);
      list.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/${addr}/logo.png`);
    }

    return Array.from(new Set(list.filter(Boolean)));
  }, [resolvedSrc, artContract, logoUrl, fallbackLogoUrl, address]);

  // Asynchronously resolve on-chain artwork contract to data URI
  useEffect(() => {
    let isMounted = true;
    const target = artContract || logoUrl;

    if (target && !resolvedSrc?.startsWith('data:image')) {
      resolveArtwork(target).then(res => {
        if (isMounted && res) {
          setResolvedSrc(res);
          setHasFailedAll(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [artContract, logoUrl]);

  useEffect(() => {
    setAttempt(0);
    setHasFailedAll(false);
  }, [candidates]);

  const currentSrc = candidates[attempt] || null;

  const handleError = () => {
    const nextAttempt = attempt + 1;
    if (nextAttempt < candidates.length) {
      setAttempt(nextAttempt);
    } else {
      setHasFailedAll(true);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  }[size];

  const initials = (symbol || 'TK')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'TK';

  const gradient = getAvatarGradient(address);

  if (hasFailedAll || !currentSrc) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-extrabold text-white shadow-inner border border-white/10 shrink-0 select-none ${className}`}
        title={`${symbol} (${address})`}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#181d25] overflow-hidden flex items-center justify-center border border-[#232832] shrink-0 relative ${className}`}
    >
      <img
        src={currentSrc}
        alt={symbol}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={handleError}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
