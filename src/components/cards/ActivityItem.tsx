import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { NestColors } from '@/theme';
import type { ActivityEvent, ActivityTone, IconName } from '@/types';

const toneAppearance = (c: NestColors): Record<ActivityTone, { background: string; accent: string }> => ({
  success: { background: c.successTint, accent: c.success },
  info: { background: c.brandSoft, accent: c.brandInk },
  warning: { background: c.warningTint, accent: c.warning },
  danger: { background: c.dangerTint, accent: c.danger },
  neutral: { background: c.surfaceMuted, accent: c.inkSecondary },
});

type ActivityItemProps = {
  event: ActivityEvent;
  /** Timestamp text, already formatted by the screen. */
  timestamp: string;
  last?: boolean;
};

/** One entry on the audit timeline. */
export function ActivityItem({ event, timestamp, last = false }: ActivityItemProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const appearance = toneAppearance(colors)[event.tone];
  const icon: IconName = event.icon;
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.marker, { backgroundColor: appearance.background }]}>
          <Ionicons color={appearance.accent} name={icon} size={17} />
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.body, !last && styles.bodySpaced]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.sample ? <Text style={styles.sampleTag}>Preview</Text> : null}
        </View>
        <Text style={styles.description}>{event.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{timestamp}</Text>
          {event.memberName ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.meta}>{event.memberName}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type ActivityGroupProps = {
  title: string;
  children: React.ReactNode;
};

/** Date grouping header for the timeline. */
export function ActivityGroup({ title, children }: ActivityGroupProps) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  rail: { alignItems: 'center', width: 38 },
  marker: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: t.colors.border, marginVertical: 4, borderRadius: 1 },
  body: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  bodySpaced: { marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  title: { ...typography.bodyStrong, color: t.colors.ink, flex: 1 },
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
  description: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.borderStrong },
  group: { gap: spacing.xs },
  groupTitle: { ...typography.eyebrow, color: t.colors.inkSecondary },
  groupBody: { gap: 0 },
}));
