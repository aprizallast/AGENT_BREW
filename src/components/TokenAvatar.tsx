import React, { useState, useEffect } from 'react';

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

export const TokenAvatar: React.FC<TokenAvatarProps> = ({
  symbol,
  address,
  logoUrl,
  fallbackLogoUrl,
  onchainArtworkContract,
  size = 'md',
  className = ''
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  // Candidates list in order of priority
  const candidates = React.useMemo(() => {
    const list: string[] = [];
    if (logoUrl && logoUrl.trim()) list.push(logoUrl);
    if (onchainArtworkContract && onchainArtworkContract.trim()) {
      list.push(`/api/artwork/${onchainArtworkContract.toLowerCase()}`);
      list.push(`https://brew.family/api/shared/artwork/${onchainArtworkContract.toLowerCase()}`);
    }
    if (fallbackLogoUrl && fallbackLogoUrl.trim()) list.push(fallbackLogoUrl);
    if (address && address.trim()) {
      list.push(`https://dd.dexscreener.com/ds-data/tokens/bsc/${address.toLowerCase()}.png`);
    }
    return Array.from(new Set(list));
  }, [logoUrl, fallbackLogoUrl, onchainArtworkContract, address]);

  useEffect(() => {
    setAttempt(0);
    setHasFailedAll(false);
    if (candidates.length > 0) {
      setCurrentSrc(candidates[0]);
    } else {
      setCurrentSrc(null);
      setHasFailedAll(true);
    }
  }, [candidates]);

  const handleError = () => {
    const nextAttempt = attempt + 1;
    if (nextAttempt < candidates.length) {
      setAttempt(nextAttempt);
      setCurrentSrc(candidates[nextAttempt]);
    } else {
      setHasFailedAll(true);
      setCurrentSrc(null);
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
        onError={handleError}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
