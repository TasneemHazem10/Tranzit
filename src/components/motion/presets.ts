import { Easing } from 'react-native-reanimated';

/** Shared animation presets so every motion component feels consistent. */

export const spring = {
  /** Fast, responsive press feedback. */
  pressIn: { damping: 16, stiffness: 320, mass: 0.5 },
  /** Bouncy release back to rest. */
  pressOut: { damping: 14, stiffness: 200, mass: 0.8 },
  /** Gentle entrances. */
  entrance: { damping: 16, stiffness: 150, mass: 0.9 },
  /** Snappy appearing springs. */
  appear: { damping: 18, stiffness: 260, mass: 0.7 },
  /** Overshoot-heavy "pop". */
  pop: { damping: 11, stiffness: 220, mass: 0.7 },
  /** Smooth UI-state toggles (menu icon, focus). */
  toggle: { damping: 16, stiffness: 230, mass: 0.6 },
} as const;

export const timing = {
  fade: { duration: 240, easing: Easing.out(Easing.cubic) },
  smooth: { duration: 360, easing: Easing.out(Easing.cubic) },
  glow: { duration: 860, easing: Easing.inOut(Easing.quad) },
} as const;

export const screenSpring = {
  damping: 24,
  stiffness: 210,
  mass: 0.9,
  overshootClamping: false,
} as const;