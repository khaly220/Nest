import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { RefreshControlProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { makeStyles, screenPadding, spacing, useTheme } from '@/theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  /** Wraps the content in a ScrollView. */
  scroll?: boolean;
  /** Applies the standard horizontal screen padding to the content. */
  padded?: boolean;
  background?: 'plain' | 'mint' | 'sage';
  /** Sticky footer rendered below the scroll area. */
  footer?: React.ReactNode;
  keyboardAware?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  background = 'plain',
  footer,
  keyboardAware = false,
  edges,
  contentStyle,
  refreshControl,
}: ScreenContainerProps) {
  const { gradients } = useTheme();
  const styles = useStyles();
  const gradient = background === 'plain' ? null : gradients[background === 'mint' ? 'soft' : 'neutral'];
  const safeEdges: Edge[] = edges ?? (footer ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']);

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        padded && styles.paddedContent,
        footer ? styles.scrollContentWithFooter : null,
        contentStyle,
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.paddedContent, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      {gradient ? <LinearGradient colors={gradient} end={{ x: 0.4, y: 1 }} start={{ x: 0.1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
      <SafeAreaView edges={safeEdges} style={styles.flex}>
        {keyboardAware ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
        {footer ? (
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.footer}>
            {footer}
          </SafeAreaView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl, gap: spacing.lg },
  scrollContentWithFooter: { paddingBottom: spacing.lg },
  paddedContent: { paddingHorizontal: screenPadding },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: t.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
}));
