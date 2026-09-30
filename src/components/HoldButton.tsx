import React, { useCallback, useEffect, useRef } from 'react';
import { ViewStyle } from 'react-native';
import { PressableScale } from './Motion';

type Props = {
  onStep: () => void;
  disabled?: boolean;
  interval?: number;
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  contentStyle?: ViewStyle | ViewStyle[] | (ViewStyle | false | null | undefined)[];
  pressedStyle?: ViewStyle | ViewStyle[] | (ViewStyle | false | null | undefined)[];
  scaleTo?: number;
  accessibilityLabel?: string;
  children: React.ReactNode;
};

/** Press-and-hold auto-repeating button: fires once on touch-down, then repeats while held. */
export default function HoldButton({
  onStep,
  disabled,
  interval = 170,
  style,
  contentStyle,
  pressedStyle,
  scaleTo = 0.92,
  accessibilityLabel,
  children,
}: Props) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(onStep);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    stepRef.current = onStep;
    disabledRef.current = !!disabled;
  }, [onStep, disabled]);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (disabledRef.current) return;
    stepRef.current();
    stop();
    timer.current = setInterval(() => {
      if (disabledRef.current) {
        stop();
        return;
      }
      stepRef.current();
    }, interval);
  }, [interval, stop]);

  return (
    <PressableScale
      onPressIn={start}
      onPressOut={stop}
      disabled={disabled}
      style={style}
      contentStyle={contentStyle}
      pressedStyle={pressedStyle}
      scaleTo={scaleTo}
      accessibilityLabel={accessibilityLabel}>
      {children}
    </PressableScale>
  );
}