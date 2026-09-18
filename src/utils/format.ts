export function formatUsd(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return '$0.00';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(4);
  if (n >= 0.0001) return '$' + n.toFixed(6);
  if (n >= 0.00000001) return '$' + n.toFixed(8);
  return '$' + n.toExponential(3);
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0.00%';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

export function truncateAddr(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const success = document.execCommand('copy');
    area.remove();
    return success;
  }
}

export function formatTimeAgo(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp)) return '-';
  // Handle both seconds and milliseconds timestamps
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function isRecentlyLaunched(timestamp: number | null | undefined): boolean {
  if (!timestamp || isNaN(timestamp)) return false;
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const diffHours = (Date.now() - ms) / (1000 * 3600);
  return diffHours >= 0 && diffHours < 1; // within 1 hour
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCsv = (val: string | number) => {
    const str = String(val == null ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function playAlertChime(volume: number = 0.15): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    const vol = Math.max(0.01, Math.min(volume, 1));
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
