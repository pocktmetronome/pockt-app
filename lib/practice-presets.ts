import { sanitizePractice, type PracticeConfig } from '@/lib/practice';

export type PracticePreset = {
  id: string;
  name: string;
  config: PracticeConfig;
  createdAt: number;
};

export function snapshotPracticePreset(name: string, config: PracticeConfig): PracticePreset {
  const trimmed = name.trim().slice(0, 32) || defaultPracticeName(config);
  return {
    id: `practice-${Date.now()}-${Math.round(Math.random() * 9999)}`,
    name: trimmed,
    config: sanitizePractice(config),
    createdAt: Date.now(),
  };
}

export function sanitizePracticePreset(raw: unknown): PracticePreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id) return null;
  return {
    id: source.id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 32) : 'Practice',
    config: sanitizePractice(source.config),
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
  };
}

export function defaultPracticeName(config: PracticeConfig): string {
  if (config.rampEnabled) return `${config.startBpm}→${config.targetBpm}`;
  if (config.spaceEnabled) return 'Space trainer';
  if (config.shiftEnabled) return 'Shift trainer';
  return 'Practice';
}
