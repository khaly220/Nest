import type { TextStyle } from 'react-native';

/**
 * Type scale. Uses the platform UI font (Roboto on Android, SF on iOS) so the
 * app stays native-feeling and ships with no font assets.
 */
export const typography: Record<string, TextStyle> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -1.1 },
  title1: { fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  title2: { fontSize: 21, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  title3: { fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  callout: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Small uppercase section label. */
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1.5 },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: 0.1 },
  numeric: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 6 },
};
