import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';

import { darkColors, darkGradients, lightColors, lightGradients } from './colors';
import type { NestColors, NestGradients } from './colors';
import { shadows } from './shadows';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

/** SecureStore key holding the persisted theme choice. Not a secret. */
const STORAGE_KEY = 'nest.theme.preference.v1';

export type Theme = {
  /** What the user picked: light, dark or follow the system. */
  preference: ThemePreference;
  /** The scheme actually rendered after resolving `system`. */
  scheme: ResolvedScheme;
  colors: NestColors;
  gradients: NestGradients;
  shadows: Record<string, import('react-native').ViewStyle>;
  /** Persists a new choice; the app re-renders immediately, no restart needed. */
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<Theme | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Holds the active colour scheme for the whole app.
 *
 * The preference is persisted locally so it survives restarts, and `system`
 * resolves against the live OS setting (`useColorScheme`) so the app follows the
 * device without a restart when the user switches Light/Dark/System.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (active && isPreference(stored)) setPreferenceState(stored);
      } catch {
        // A missing or unreadable preference simply falls back to `system`.
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const scheme: ResolvedScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<Theme>(
    () => ({
      preference,
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      gradients: scheme === 'dark' ? darkGradients : lightGradients,
      shadows,
      setPreference,
    }),
    [preference, scheme, setPreference],
  );

  useEffect(() => {
    // Keeps the native root view in step with the JS theme so rotation and
    // navigation transitions never flash the wrong colour.
    void SystemUI.setBackgroundColorAsync(scheme === 'dark' ? darkColors.background : lightColors.background).catch(() => {});
  }, [scheme]);

  if (!hydrated) {
    return <View style={[styles.boot, { backgroundColor: scheme === 'dark' ? darkColors.background : lightColors.background }]} />;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider.');
  return value;
}

const styles = StyleSheet.create({
  boot: { flex: 1 },
});
