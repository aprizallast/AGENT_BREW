export default async function handler(req: any, res: any) {
  // Extract address from path query or param
  let addr = (req.query?.address || '').toString().toLowerCase().trim();
  if (!addr && req.url) {
    const match = req.url.match(/\/api\/artwork\/([^/?]+)/);
    if (match) addr = match[1].toLowerCase().trim();
  }

  if (!addr) {
    return res.status(400).send('Missing artwork contract address');
  }

  try {
    const upstreamRes = await fetch(`https://brew.family/api/shared/artwork/${addr}`, {
      headers: {
        'Accept': 'application/json, image/*, text/html, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!upstreamRes.ok) {
      return res.status(404).send('Artwork not found upstream');
    }

    const contentType = upstreamRes.headers.get('content-type') || '';

    // Direct image binary
    if (contentType.includes('image/') || contentType.includes('svg')) {
      const arrayBuf = await upstreamRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const mime = contentType.split(';')[0] || 'image/svg+xml';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.send(buf);
    }

    const text = await upstreamRes.text();

    // Raw SVG
    if (text.trim().startsWith('<svg') || text.includes('</svg>')) {
      const buf = Buffer.from(text, 'utf-8');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.send(buf);
    }

    // JSON payload with base64 image data
    try {
      const data = JSON.parse(text);
      const rawImg = data?.image || data?.artwork || data?.svg || data?.data;
      if (rawImg && typeof rawImg === 'string') {
        if (rawImg.startsWith('data:image')) {
          if (rawImg.includes(';base64,')) {
            const parts = rawImg.split(';base64,');
            const mime = parts[0].replace('data:', '');
            const buf = Buffer.from(parts[1], 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
            return res.send(buf);
          } else {
            const commaIdx = rawImg.indexOf(',');
            const header = rawImg.slice(0, commaIdx);
            const content = decodeURIComponent(rawImg.slice(commaIdx + 1));
            const mime = header.split(';')[0].replace('data:', '') || 'image/svg+xml';
            const buf = Buffer.from(content, 'utf-8');
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
            return res.send(buf);
          }
        } else if (rawImg.startsWith('http')) {
          return res.redirect(rawImg);
        } else if (rawImg.startsWith('<svg')) {
          const buf = Buffer.from(rawImg, 'utf-8');
          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
          return res.send(buf);
        }
      }
    } catch {}

    return res.status(404).send('Artwork format unrecognized');
  } catch (err: any) {
    return res.status(500).send('Artwork proxy error');
  }
}
