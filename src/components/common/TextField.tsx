import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type TextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: TextInputProps['autoCorrect'];
  autoFocus?: boolean;
  maxLength?: number;
  editable?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  icon,
  iconPosition = 'left',
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
  autoCorrect = false,
  autoFocus = false,
  maxLength,
  editable = true,
  returnKeyType = 'next',
  onSubmitEditing,
  style,
  accessibilityLabel,
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const leadingIcon = icon && iconPosition === 'left' ? icon : undefined;
  const trailingIcon = icon && iconPosition === 'right' ? icon : undefined;

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          multiline && styles.shellMultiline,
          focused && styles.shellFocused,
          Boolean(error) && styles.shellError,
          !editable && styles.shellDisabled,
        ]}
      >
        {leadingIcon ? <Ionicons color={focused ? colors.brand : colors.inkMuted} name={leadingIcon} size={18} /> : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoFocus={autoFocus}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          returnKeyType={returnKeyType}
          selectionColor={colors.brand}
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
        />
        {trailingIcon ? <Ionicons color={colors.inkMuted} name={trailingIcon} size={18} /> : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, 'icon' | 'iconPosition' | 'keyboardType' | 'secureTextEntry'> & {
  numeric?: boolean;
};

export function PasswordField({ numeric = false, ...props }: PasswordFieldProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, props.style]}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <View
        style={[
          styles.shell,
          focused && styles.shellFocused,
          Boolean(props.error) && styles.shellError,
          props.editable === false && styles.shellDisabled,
        ]}
      >
        <Ionicons color={focused ? colors.brand : colors.inkMuted} name={numeric ? 'key-outline' : 'lock-closed-outline'} size={18} />
        <TextInput
          accessibilityLabel={props.accessibilityLabel ?? props.label ?? props.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={props.editable}
          keyboardType={numeric ? 'number-pad' : 'default'}
          maxLength={props.maxLength}
          onBlur={() => setFocused(false)}
          onChangeText={props.onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={props.onSubmitEditing}
          placeholder={props.placeholder}
          placeholderTextColor={colors.inkMuted}
          returnKeyType={props.returnKeyType}
          secureTextEntry={!visible}
          selectionColor={colors.brand}
          style={styles.input}
          value={props.value}
        />
        <Pressable
          accessibilityLabel={visible ? 'Hide value' : 'Show value'}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setVisible((current) => !current)}
          style={styles.eye}
        >
          <Ionicons color={colors.inkSecondary} name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} />
        </Pressable>
      </View>
      {props.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {props.error}
        </Text>
      ) : props.hint ? (
        <Text style={styles.hint}>{props.hint}</Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: t.colors.ink, fontWeight: '700' },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  shellMultiline: { minHeight: 104, alignItems: 'flex-start', paddingTop: spacing.sm },
  shellFocused: { borderColor: t.colors.brand, backgroundColor: t.colors.brandTint },
  shellError: { borderColor: t.colors.danger, backgroundColor: t.colors.dangerTint },
  shellDisabled: { backgroundColor: t.colors.surfaceMuted, opacity: 0.8 },
  input: { ...typography.body, color: t.colors.ink, flex: 1, paddingVertical: 0 },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top', paddingTop: 0 },
  eye: { paddingLeft: spacing.xs, paddingVertical: spacing.xs },
  hint: { ...typography.micro, color: t.colors.inkSecondary },
  error: { ...typography.micro, color: t.colors.danger, fontWeight: '600' },
}));
