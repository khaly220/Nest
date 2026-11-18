import type { ViewStyle } from 'react-native';

/**
 * Restrained elevation. Shadows stay warm-tinted rather than pure black so they
 * read as depth instead of a grey halo. Elevation values are intentionally low
 * to keep the interface looking like a tool rather than a stack of cards.
 */
export const shadows: Record<string, ViewStyle> = {
  none: {},
  xs: {
    shadowColor: '#30231E',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#30231E',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#30231E',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  float: {
    shadowColor: '#30231E',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
};
