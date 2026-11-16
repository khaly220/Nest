import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

type StatTone = 'mint' | 'sage' | 'forest' | 'warning' | 'danger';

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: StatTone;
};

/** Small metric tile used across the dashboard and profile headers. */
export function StatTile({ label, value, hint, icon, tone = 'mint' }: StatTileProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const dark = tone === 'forest';
  const appearance =
    tone === 'sage'
      ? { background: colors.neutralTint, border: colors.border, accent: colors.brandInk }
      : tone === 'warning'
        ? { background: colors.warningTint, border: colors.warning, accent: colors.warning }
        : tone === 'danger'
          ? { background: colors.dangerTint, border: colors.danger, accent: colors.danger }
          : tone === 'forest'
            ? { background: colors.brandDeep, border: colors.brandDeep, accent: colors.white }
            : { background: colors.brandSoft, border: colors.brand, accent: colors.brandInk };

  return (
    <View style={[styles.tile, { backgroundColor: appearance.background, borderColor: appearance.border }]}>
      <Ionicons color={appearance.accent} name={icon} size={16} />
      <Text style={[styles.value, dark && styles.valueDark]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, dark && styles.labelDark]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.hint, dark && styles.labelDark]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Even row wrapper so tiles share the available width on any screen size. */
export function StatRow({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: 3, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1 },
  value: { ...typography.title3, color: t.colors.ink },
  valueDark: { color: t.colors.white },
  label: { ...typography.micro, color: t.colors.inkSecondary },
  labelDark: { color: t.colors.onDark },
  hint: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted, lineHeight: 14 },
}));
