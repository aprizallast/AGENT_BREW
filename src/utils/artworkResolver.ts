// In-memory cache for resolved on-chain and external artworks
const artworkCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Resolves on-chain artwork contract address or JSON artwork endpoint
 * into a directly displayable data:image/... URI or verified image URL.
 */
export async function resolveArtwork(
  artContractOrUrl: string
): Promise<string | null> {
  if (!artContractOrUrl) return null;

  const key = artContractOrUrl.toLowerCase().trim();

  // 1. If already a data URI or blob URI, return immediately
  if (key.startsWith('data:image') || key.startsWith('blob:')) {
    return artContractOrUrl;
  }

  // 2. Check in-memory cache
  if (artworkCache.has(key)) {
    return artworkCache.get(key) || null;
  }

  // 3. Deduplicate in-flight requests
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = (async () => {
    let cleanAddress = key;
    if (cleanAddress.startsWith('onchain://56/')) {
      cleanAddress = cleanAddress.replace('onchain://56/', '');
    } else if (cleanAddress.includes('/api/shared/artwork/')) {
      cleanAddress = cleanAddress.split('/api/shared/artwork/')[1] || cleanAddress;
    } else if (cleanAddress.includes('/api/artwork/')) {
      cleanAddress = cleanAddress.split('/api/artwork/')[1] || cleanAddress;
    }

    cleanAddress = cleanAddress.split('?')[0].toLowerCase().trim();

    // Is it a standard hex EVM address?
    const isAddress = /^0x[a-f0-9]{40}$/i.test(cleanAddress);

    // If it's a regular external image URL (png/jpg/webp) and NOT a brew json api endpoint
    if (!isAddress && (key.startsWith('http://') || key.startsWith('https://')) && !key.includes('brew.family/api/shared/artwork/')) {
      artworkCache.set(key, artContractOrUrl);
      return artContractOrUrl;
    }

    if (isAddress) {
      // Try resolving the artwork JSON from brew.family or local proxy
      const urlsToTry = [
        `https://brew.family/api/shared/artwork/${cleanAddress}`,
        `/api/artwork/${cleanAddress}`
      ];

      for (const targetUrl of urlsToTry) {
        try {
          const res = await fetch(targetUrl);
          if (!res.ok) continue;
          
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('image/') || contentType.includes('svg')) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            artworkCache.set(key, blobUrl);
            artworkCache.set(cleanAddress, blobUrl);
            return blobUrl;
          }

          // Try JSON payload containing { image: "data:image/svg+xml;base64,..." }
          const text = await res.text();
          if (text.startsWith('{') || text.includes('"image"')) {
            const data = JSON.parse(text);
            if (data && data.image && typeof data.image === 'string') {
              artworkCache.set(key, data.image);
              artworkCache.set(cleanAddress, data.image);
              return data.image;
            }
          }
        } catch {
          // continue to next candidate
        }
      }
    }

    return null;
  })();

  pendingRequests.set(key, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}

export function getCachedArtworkSync(key: string): string | null {
  if (!key) return null;
  const k = key.toLowerCase().trim();
  if (k.startsWith('data:image') || k.startsWith('blob:')) return key;
  return artworkCache.get(k) || null;
}
