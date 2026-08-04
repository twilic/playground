export function formatBytes(bytes: number): string {
  return bytes.toLocaleString('en-US');
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)}%`;
}
