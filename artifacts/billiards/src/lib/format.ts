export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function calculateDuration(startTime: string) {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - start) / 1000 / 60);
  return diffMinutes;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
