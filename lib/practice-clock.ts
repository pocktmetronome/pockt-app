export function formatClock(date: Date, showSeconds = false): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const hh = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(minutes).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  if (showSeconds) {
    return `${hh}:${mm}:${String(seconds).padStart(2, '0')} ${suffix}`;
  }
  return `${hh}:${mm} ${suffix}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function msUntilNextMinute(now = Date.now()): number {
  return 60000 - (now % 60000);
}
