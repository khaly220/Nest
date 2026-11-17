import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';

type PinDotsProps = {
  length: number;
  filled: number;
  error?: boolean;
};

/** Row of dots showing how many PIN digits have been entered. */
export function PinDots({ length, filled, error = false }: PinDotsProps) {
  const styles = useStyles();
  return (
    <View accessibilityLabel={`${filled} of ${length} digits entered`} style={styles.dots}>
      {Array.from({ length }, (_, index) => {
        const active = index < filled;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              active && styles.dotFilled,
              error && styles.dotError,
              error && active && styles.dotErrorFilled,
            ]}
          />
        );
      })}
    </View>
  );
}

type PinKeypadProps = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onBackspaceLongPress?: () => void;
  disabled?: boolean;
};

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Custom numeric keypad used by member verification and PIN setup flows. */
export function PinKeypad({ onDigit, onDelete, disabled = false }: PinKeypadProps) {
  const styles = useStyles();
  return (
    <View style={[styles.keypad, disabled && styles.disabled]}>
      {keys.map((key) => (
        <Key key={key} label={key} onPress={() => onDigit(key)} />
      ))}
      <View style={styles.key} />
      <Key label="0" onPress={() => onDigit('0')} />
      <Key accessibilityLabel="Delete last digit" icon="backspace-outline" onPress={onDelete} subtle />
    </View>
  );
}

type KeyProps = {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel?: string;
  subtle?: boolean;
};

function Key({ label, icon, onPress, accessibilityLabel, subtle = false }: KeyProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.key, subtle && styles.keySubtle, pressed && styles.keyPressed]}
    >
      {icon ? (
        <Ionicons color={colors.brandInk} name={icon} size={23} />
      ) : (
        <Text style={styles.keyLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
  },
  dotFilled: { backgroundColor: t.colors.brandDeep, borderColor: t.colors.brandDeep },
  dotError: { borderColor: t.colors.danger },
  dotErrorFilled: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, maxWidth: 288 },
  disabled: { opacity: 0.5 },
  key: {
    width: 82,
    height: 62,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  keySubtle: { backgroundColor: t.colors.neutralTint, borderColor: t.colors.border, shadowOpacity: 0 },
  keyPressed: { backgroundColor: t.colors.brandSoft, transform: [{ scale: 0.96 }] },
  keyLabel: { ...typography.title2, color: t.colors.ink, fontSize: 23 },
}));
