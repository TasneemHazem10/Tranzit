import { createContext, useContext } from 'react';

export type ThemeColors = {
  brand: string;
  brandWarm: string;
  brandDeep: string;
  brandSoft: string;
  dark: string;
  darkDeep: string;
  darkSoft: string;
  background: string;
  white: string;
  card: string;
  orange: string;
  green: string;
  red: string;
  purple: string;
  border: string;
  divider: string;
  textGray: string;
  textLight: string;
  onboardingBlue: string;
  onboardingYellow: string;
  onboardingPurple: string;
};

export const lightColors: ThemeColors = {
  brand: '#FF3B1F',
  brandWarm: '#F97316',
  brandDeep: '#D92D16',
  brandSoft: '#FFF0EC',
  dark: '#1E1E1C',
  darkDeep: '#141413',
  darkSoft: '#3A3A38',
  background: '#FFF9F7',
  white: '#FFFFFF',
  card: '#FFFFFF',
  orange: '#FF3B1F',
  green: '#42C45A',
  red: '#E5484D',
  purple: '#3A3A38',
  border: '#E2E2DF',
  divider: '#ECECE9',
  textGray: '#8A8A86',
  textLight: '#B4B4AF',

  onboardingBlue: '#1677A8',
  onboardingYellow: '#F2B134',
  onboardingPurple: '#D94F70',
};

export const darkColors: ThemeColors = {
  brand: '#FF4A2E',
  brandWarm: '#F97316',
  brandDeep: '#E0321A',
  brandSoft: '#2C120C',
  dark: '#ECEDEA',
  darkDeep: '#F7F7F4',
  darkSoft: '#4C4C49',
  background: '#111110',
  white: '#FFFFFF',
  card: '#1B1B19',
  orange: '#FF3B1F',
  green: '#47C75D',
  red: '#FF5A5F',
  purple: '#3A3A38',
  border: '#2B2B28',
  divider: 'rgba(255,255,255,0.08)',
  textGray: '#9B9A95',
  textLight: '#66655F',

  onboardingBlue: '#1677A8',
  onboardingYellow: '#F2B134',
  onboardingPurple: '#D94F70',
};

/** Backwards-compatible alias — the light palette. Prefer `useTheme()` for reactive colors. */
export const colors: ThemeColors = lightColors;

export const ThemeContext = createContext<ThemeColors>(lightColors);

/** Reactive palette. Components calling this re-render when the theme changes. */
export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}

export type CairoWeight =
  | 'Cairo_400Regular'
  | 'Cairo_500Medium'
  | 'Cairo_600SemiBold'
  | 'Cairo_700Bold'
  | 'Cairo_800ExtraBold'
  | 'Cairo_900Black';

export const fonts = {
  regular: 'Cairo_400Regular' as CairoWeight,
  medium: 'Cairo_500Medium' as CairoWeight,
  semiBold: 'Cairo_600SemiBold' as CairoWeight,
  bold: 'Cairo_700Bold' as CairoWeight,
  extraBold: 'Cairo_800ExtraBold' as CairoWeight,
  black: 'Cairo_900Black' as CairoWeight,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 30,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;