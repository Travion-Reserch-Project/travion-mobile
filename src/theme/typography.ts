export const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    semiBold: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
} as const;

export type Typography = typeof typography;
