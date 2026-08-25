export const colors = {
  dark: '#1E1E1C',
  darkSoft: '#2D2D2D',
  background: '#F5F5F4',
  white: '#FFFFFF',
  card: '#F9F9F9',
  orange: '#F89421',
  green: '#43C050',
  red: '#E5484D',
  border: '#CDCED4',
  divider: '#EDEEEA',
  textGray: '#6E6E6E',
  textLight: '#9B9B99',

  onboardingBlue: '#A9CBE5',
  onboardingYellow: '#FFB938',
  onboardingPurple: '#B79BD4',
} as const;

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
  lg: 20,
  xl: 28,
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

export const STATUS_TEXT: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  assigned: 'تم تعيين السائق',
  picked_up: 'تم استلام الشحنة',
  in_transit: 'في الطريق إليك',
  delivered: 'تم التسليم',
  canceled: 'ملغي',
};

export const PAYMENT_METHODS: Record<number, string> = {
  1: 'أونلاين',
  2: 'عند الاستلام',
  3: 'محفظة إلكترونية',
};

export const PACKAGE_LABELS: Record<string, string> = {
  small: 'صغيرة',
  medium: 'متوسطة',
  large: 'كبيرة',
};
