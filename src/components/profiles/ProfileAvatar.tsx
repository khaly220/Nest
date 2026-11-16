import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { NestColors } from '@/theme';
import type { IconName } from '@/types';

/**
 * Profile avatars are stored on the member row as a short key. The same five
 * keys the local store already uses are kept so existing profiles keep working.
 */
export type AvatarOption = {
  id: string;
  label: string;
  icon: IconName;
  tint: string;
  background: string;
};

export const avatarOptions: AvatarOption[] = [
  { id: 'sprout', label: 'Sprout', icon: 'leaf-outline', tint: '#16A34A', background: '#E7F7EF' },
  { id: 'sun', label: 'Sun', icon: 'sunny-outline', tint: '#B4791B', background: '#FDF4E6' },
  { id: 'moon', label: 'Moon', icon: 'moon-outline', tint: '#5D4E86', background: '#EFECF7' },
  { id: 'wave', label: 'Wave', icon: 'water-outline', tint: '#356A88', background: '#E9F1F5' },
  { id: 'star', label: 'Star', icon: 'star-outline', tint: '#A8556A', background: '#FAECEF' },
];

const fallbackOption = (c: NestColors): AvatarOption => ({
  id: 'default',
  label: 'Profile',
  icon: 'person-outline',
  tint: c.brandInk,
  background: c.brandSoft,
});

export function avatarOption(avatar: string, c: NestColors) {
  return avatarOptions.find((option) => option.id === avatar) ?? fallbackOption(c);
}

type ProfileAvatarProps = {
  name: string;
  avatar: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Rounded tile showing the profile glyph, with initials as a safe fallback. */
export function ProfileAvatar({ name, avatar, size = 48, style }: ProfileAvatarProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const option = avatarOptions.find((item) => item.id === avatar);
  const shape = { width: size, height: size, borderRadius: size / 3.2 };
  if (option) {
    return (
      <View
        accessibilityLabel={`${name} profile`}
        style={[styles.tile, shape, { backgroundColor: option.background, borderColor: option.background }, style]}
      >
        <Ionicons color={option.tint} name={option.icon} size={Math.round(size * 0.5)} />
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={`${name} profile`}
      style={[styles.tile, shape, { backgroundColor: colors.accent, borderColor: colors.accent }, style]}
    >
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>
        {name.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

type AvatarPickerProps = {
  value: string;
  onChange: (avatar: string) => void;
};

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const styles = useStyles();
  return (
    <View accessibilityRole="radiogroup" style={styles.picker}>
      {avatarOptions.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.choice,
              { backgroundColor: option.background },
              selected && { borderColor: option.tint },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={option.tint} name={option.icon} size={22} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { color: t.colors.brandInk, fontWeight: '800' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
}));
