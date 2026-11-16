import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, shadows, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const heights: Record<ButtonSize, number> = { md: 54, lg: 58 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors, gradients } = useTheme();
  const styles = useStyles();
  const inactive = loading || disabled;
  const textColor = variant === 'primary' || variant === 'danger' ? colors.white : colors.brandInk;

  const content = (
    <View style={styles.contentRow}>
      {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
      {!loading && icon && iconPosition === 'left' ? <Ionicons color={textColor} name={icon} size={18} /> : null}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
      {!loading && icon && iconPosition === 'right' ? <Ionicons color={textColor} name={icon} size={18} /> : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height: heights[size] },
        variant === 'primary' && styles.primaryShadow,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.brand} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'surface' | 'mint' | 'ghost';
  size?: number;
};

export function IconButton({ icon, onPress, accessibilityLabel, tone = 'surface', size = 44 }: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 3 },
        tone === 'surface' && styles.iconSurface,
        tone === 'mint' && styles.iconMint,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={colors.brandInk} name={icon} size={Math.round(size * 0.45)} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
  label: { ...typography.button },
  primaryShadow: { ...shadows.card },
  secondary: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.danger, ...shadows.xs },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  inactive: { opacity: 0.45 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconSurface: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  iconMint: { backgroundColor: t.colors.brandSoft },
}));

/** Re-exported so screens can compose small circular actions consistently. */
export type { ButtonProps, ButtonVariant };
