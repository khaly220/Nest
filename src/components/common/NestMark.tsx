import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { lightColors, radius, shadows, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type NestMarkProps = {
  size?: number;
  tone?: 'forest' | 'mint';
};

/** Nest logo mark: a soft gradient tile with a home glyph. */
export function NestMark({ size = 44, tone = 'forest' }: NestMarkProps) {
  const { colors, gradients } = useTheme();
  return (
    <View style={[styles.markShadow, { width: size, height: size, borderRadius: size / 3.2, ...shadows.xs }]}>
      <LinearGradient
        colors={tone === 'forest' ? gradients.hero : gradients.soft}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.markFill, { borderRadius: size / 3.2 }]}
      >
        <Ionicons color={tone === 'forest' ? colors.white : colors.brandInk} name="home" size={Math.round(size * 0.5)} />
      </LinearGradient>
    </View>
  );
}

export function NestWordmark({ size = 44, tone = 'forest' }: NestMarkProps & { tone?: 'forest' | 'mint' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wordmark}>
      <NestMark size={size} tone={tone} />
      <Text style={[styles.word, { color: tone === 'forest' ? colors.brandInk : colors.white }]}>nest</Text>
    </View>
  );
}

/** Tinted square holding an Ionicons glyph — used by lists, timelines and actions. */
export function IconBubble({
  icon,
  tone = 'mint',
  size = 44,
  color,
}: {
  icon: IconName;
  tone?: 'mint' | 'sage' | 'forest' | 'warning' | 'danger' | 'success';
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const background =
    tone === 'forest'
      ? colors.brandDeep
      : tone === 'sage'
        ? colors.neutralTint
        : tone === 'warning'
          ? colors.warningTint
          : tone === 'danger'
            ? colors.dangerTint
            : tone === 'success'
              ? colors.successTint
              : colors.brandSoft;
  const glyph =
    color ??
    (tone === 'forest'
      ? colors.white
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : tone === 'success'
            ? colors.success
            : colors.brandInk);
  return (
    <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 3.4, backgroundColor: background }]}>
      <Ionicons color={glyph} name={icon} size={Math.round(size * 0.46)} />
    </View>
  );
}

type HeroPanelProps = {
  children: React.ReactNode;
  eyebrow?: string;
  style?: React.ComponentProps<typeof View>['style'];
};

/** Deep navy gradient panel used for hero content and highlighted summaries. */
export function HeroPanel({ children, eyebrow, style }: HeroPanelProps) {
  const { gradients } = useTheme();
  return (
    <LinearGradient colors={gradients.hero} end={{ x: 0.9, y: 1 }} start={{ x: 0, y: 0 }} style={[styles.hero, style]}>
      <View pointerEvents="none" style={styles.glowLarge} />
      <View pointerEvents="none" style={styles.glowSmall} />
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      {children}
    </LinearGradient>
  );
}

/** Hero panels stay dark in both themes, so this text scale is intentionally static. */
export const heroText = StyleSheet.create({
  title: { ...typography.title1, color: lightColors.white },
  body: { ...typography.caption, color: lightColors.onDark, lineHeight: 20 },
  caption: { ...typography.micro, color: lightColors.onDarkMuted },
});

const styles = StyleSheet.create({
  markShadow: { ...shadows.card },
  markFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  word: { fontSize: 25, fontWeight: '800', letterSpacing: -1.1 },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    gap: spacing.xxs,
  },
  heroEyebrow: { ...typography.eyebrow, color: lightColors.onDarkMuted, marginBottom: spacing.xxs },
  glowLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(147,197,253,0.14)',
    top: -110,
    right: -60,
  },
  glowSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37,99,235,0.22)',
    bottom: -70,
    left: -30,
  },
});
