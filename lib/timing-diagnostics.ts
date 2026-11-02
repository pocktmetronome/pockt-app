import type { TimingDiagnostics } from '@/modules/pockt-timing';

export function formatTimingDiagnostics(data: TimingDiagnostics | null): string {
  if (!data) return 'No native diagnostics available.';
  const errorMs =
    data.accumulatedTimelineErrorSeconds != null
      ? (data.accumulatedTimelineErrorSeconds * 1000).toExponential(3)
      : 'n/a';
  const maxDevMs =
    data.maxSchedulingDeviationSeconds != null
      ? (data.maxSchedulingDeviationSeconds * 1000).toExponential(3)
      : 'n/a';
  return [
    `kind=${data.measurementKind ?? 'unknown'}`,
    `bpm=${data.bpm ?? 'n/a'}`,
    `sub=${data.subdivision ?? 'n/a'}`,
    `sr=${data.sampleRate ?? 'n/a'}`,
    `events=${data.scheduledEventCount ?? 'n/a'}`,
    `drift_ms=${errorMs}`,
    `max_dev_ms=${maxDevMs}`,
    `dup=${data.duplicateEventCount ?? 0}`,
    `miss=${data.missedEventCount ?? 0}`,
    data.note ?? '',
  ]
    .filter(Boolean)
    .join(' | ');
}
