import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import type { Theme } from './ThemeProvider';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Turns a theme-aware style factory into a memoised hook.
 *
 * ```ts
 * const useStyles = makeStyles((t) => ({
 *   card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
 * }));
 *
 * function Card() {
 *   const styles = useStyles();
 *   ...
 * }
 * ```
 *
 * Styles are rebuilt only when the palette changes, which keeps light/dark
 * switching instant without thrashing `StyleSheet.create` on every render.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
