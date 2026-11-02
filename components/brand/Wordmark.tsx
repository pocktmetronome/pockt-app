import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';

type Props = {
  size?: 'mark' | 'handle' | 'hero' | 'home' | 'ident';
  accessible?: boolean;
};

const HEIGHT: Record<NonNullable<Props['size']>, number> = {
  mark: 36,
  handle: 44,
  home: 78,
  hero: 96,
  ident: 220,
};

export function Wordmark({ size = 'mark', accessible = true }: Props) {
  const face = HEIGHT[size];
  return <Pockt2Mark size={face} accessible={accessible} />;
}

