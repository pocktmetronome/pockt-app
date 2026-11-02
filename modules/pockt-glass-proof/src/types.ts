import type { ViewProps } from 'react-native';

export type PocktGlassProofSettleEvent = {
  nativeEvent: {
    index: number;
    angle: number;
  };
};

export type PocktGlassProofViewProps = ViewProps & {
  detentCount?: number;
  onSettle?: (event: PocktGlassProofSettleEvent) => void;
};
