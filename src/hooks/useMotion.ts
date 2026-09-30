import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** True when the user has enabled "reduce motion" in accessibility settings. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (active) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => {
      setReduced(v);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

/**
 * True when decorative motion should actually run:
 * user hasn't disabled motion AND the screen is focused AND the app is active.
 * Lets infinite native-driver loops pause when covered or backgrounded.
 */
export function useMotionActive(): boolean {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return !reduced && focused && appActive;
}