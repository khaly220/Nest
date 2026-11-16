import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search', autoFocus = false }: SearchBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.shell}>
      <Ionicons color={colors.inkSecondary} name="search-outline" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        selectionColor={colors.brand}
        style={styles.input}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} onPress={() => onChangeText('')}>
          <Ionicons color={colors.inkSecondary} name="close-circle" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  input: { ...typography.body, color: t.colors.ink, flex: 1, paddingVertical: 0 },
}));
