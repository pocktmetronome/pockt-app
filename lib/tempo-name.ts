import { MAX_BPM, MIN_BPM } from '@/constants/timing';

const NAMES: { until: number; name: string }[] = [
  { until: 40, name: 'Grave' },
  { until: 60, name: 'Largo' },
  { until: 76, name: 'Adagio' },
  { until: 109, name: 'Andante' },
  { until: 120, name: 'Moderato' },
  { until: 138, name: 'Allegretto' },
  { until: 156, name: 'Allegro' },
  { until: 176, name: 'Vivace' },
  { until: 200, name: 'Presto' },
  { until: MAX_BPM + 1, name: 'Prestissimo' },
];

export function tempoName(bpm: number): string {
  const safe = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
  return NAMES.find((entry) => safe < entry.until)?.name ?? 'Allegro';
}
