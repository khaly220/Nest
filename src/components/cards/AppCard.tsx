import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryLabel } from '@/data/mock/apps';
import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';
import type { MemberAppAccess } from '@/types';

type AppTileProps = {
  app: MemberAppAccess;
  onPress: () => void;
};

/** Grid tile used by the member "available applications" screen. */
export function AppTile({ app, onPress }: AppTileProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const blocked = !app.allowed;
  return (
    <Pressable
      accessibilityLabel={`${app.name}, ${blocked ? 'not available' : 'available'}${app.isSystemApp ? ', system app' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, blocked && styles.tileBlocked, pressed && styles.pressed]}
    >
      <View style={[styles.tileIcon, { backgroundColor: blocked ? colors.surfaceMuted : `${app.tint}1A`, borderColor: blocked ? colors.border : `${app.tint}33` }]}>
        {app.iconUri ? <Image source={{ uri: app.iconUri }} resizeMode="contain" style={styles.tileImage} /> : <Ionicons color={blocked ? colors.inkMuted : app.tint} name={app.icon} size={24} />}
      </View>
      <Text numberOfLines={1} style={[styles.tileName, blocked && styles.blockedText]}>
        {app.name}
      </Text>
      <Text numberOfLines={1} style={styles.tileCategory}>
        {blocked ? 'Not available' : categoryLabel(app.category)}
      </Text>
    </Pressable>
  );
}

type AppRowProps = {
  app: MemberAppAccess;
  /** Replaces the default trailing chevron, usually a Switch. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  last?: boolean;
};

/** List row used by the administrator application access screen. */
export function AppRow({ app, trailing, onPress, onLongPress, last = false }: AppRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${app.name}, ${app.allowed ? 'allowed' : 'blocked'}${app.isSystemApp ? ', system app' : ''}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && onPress && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${app.tint}1A`, borderColor: `${app.tint}33` }]}>
        {app.iconUri ? <Image source={{ uri: app.iconUri }} resizeMode="contain" style={styles.rowImage} /> : <Ionicons color={app.tint} name={app.icon} size={20} />}
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleRow}>
          <Text numberOfLines={1} style={styles.rowName}>
            {app.name}
          </Text>
          {app.sample ? <Text style={styles.sampleTag}>Sample</Text> : null}
          {app.isSystemApp ? <Text style={styles.systemTag}>System</Text> : null}
        </View>
        <Text numberOfLines={2} style={styles.rowSummary}>
          {app.summary}
        </Text>
        <View style={styles.rowMetaRow}>
          <Text style={styles.rowCategory}>{categoryLabel(app.category)}</Text>
          <View style={styles.dot} />
          <Text style={[styles.source, app.source === 'custom' && styles.sourceCustom]}>
            {app.source === 'custom' ? 'Custom rule' : 'Recommended'}
          </Text>
        </View>
      </View>
      {trailing ?? <Ionicons color={colors.inkMuted} name="chevron-forward" size={17} />}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...shadows.xs,
  },
  tileBlocked: { backgroundColor: t.colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tileImage: { width: 36, height: 36, borderRadius: radius.sm },
  tileName: { ...typography.micro, color: t.colors.ink, fontWeight: '700', textAlign: 'center' },
  blockedText: { color: t.colors.inkMuted },
  tileCategory: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  rowPressed: { backgroundColor: t.colors.surfaceMuted },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowImage: { width: 32, height: 32, borderRadius: radius.xs },
  rowCopy: { flex: 1, gap: 2 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowName: { ...typography.bodyStrong, color: t.colors.ink, flexShrink: 1 },
  sampleTag: {
    ...typography.micro,
    fontSize: 10,
    color: t.colors.inkSecondary,
    backgroundColor: t.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  systemTag: {
    ...typography.micro,
    fontSize: 10,
    color: t.colors.inkSecondary,
    backgroundColor: t.colors.neutralTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  rowSummary: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 16 },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  rowCategory: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted, fontWeight: '700' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.borderStrong },
  source: { ...typography.micro, fontSize: 10, color: t.colors.success, fontWeight: '700' },
  sourceCustom: { color: t.colors.warning },
}));
