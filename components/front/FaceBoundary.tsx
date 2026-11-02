/**
 * A face that throws never takes the instrument down with it: the error is logged, the face is dropped
 * (the empty glass stays), and the next face switch tries again.
 */
import { Component, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Props = { children: ReactNode; name: string; /** inside a Skia canvas: no view wrapper */ plain?: boolean; fallback?: ReactNode; onError?: (name: string, error: Error) => void };
type State = { failed: boolean };

export class FaceBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[POCKT] face ${this.props.name} failed:`, error?.message);
    this.props.onError?.(this.props.name, error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    if (this.props.plain) return this.props.children;
    // a quick fade in over the shared glass hides the face's first-frame pop (nothing shows through: the
    // glass under every window face is drawn by the instrument, so there is no dial flash)
    return (
      <Animated.View entering={FadeIn.duration(130)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {this.props.children}
      </Animated.View>
    );
  }
}
