import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';
import type { NestColors } from '@/theme';
import type { IconName, ToastTone } from '@/types';

type ToastValue = { show: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastValue | null>(null);

const toneAppearance = (c: NestColors): Record<ToastTone, { background: string; icon: IconName; accent: string }> => ({
  default: { background: c.navy, icon: 'information-circle-outline', accent: c.accent },
  success: { background: c.navy, icon: 'checkmark-circle-outline', accent: c.accent },
  warning: { background: '#422C0B', icon: 'warning-outline', accent: '#FCD9A0' },
  danger: { background: '#411515', icon: 'alert-circle-outline', accent: '#FBC0C0' },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-12));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (message: string, tone: ToastTone = 'default') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, tone });
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180, mass: 0.8 }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 180, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 2600);
    },
    [opacity, translateY],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ show }), [show]);
  const appearance = toneAppearance(colors)[toast ? toast.tone : 'default'];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { paddingTop: insets.top + spacing.xs }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.toast, { backgroundColor: appearance.background, opacity, transform: [{ translateY }] }]}
          >
            <Ionicons color={appearance.accent} name={appearance.icon} size={19} />
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside a ToastProvider.');
  return value;
}

const useStyles = makeStyles((t) => ({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    maxWidth: 460,
    ...shadows.raised,
  },
  message: { ...typography.caption, color: t.colors.white, flexShrink: 1 },
}));
