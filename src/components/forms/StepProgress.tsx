import React from 'react';
import { Text, View } from 'react-native';

import { makeStyles, radius, spacing, typography } from '@/theme';

type StepProgressProps = {
  total: number;
  current: number;
  labels?: string[];
};

/** Segmented progress indicator used by the guided setup and member wizard. */
export function StepProgress({ total, current, labels }: StepProgressProps) {
  const styles = useStyles();
  const activeLabel = labels?.[current - 1];
  return (
    <View style={styles.wrap}>
      <View accessibilityLabel={`Step ${current} of ${total}`} style={styles.track}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.segment, index < current && styles.segmentActive]} />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.step}>
          Step {current} of {total}
        </Text>
        {activeLabel ? <Text style={styles.label}>{activeLabel}</Text> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.xs },
  track: { flexDirection: 'row', gap: spacing.xxs + 2 },
  segment: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: t.colors.border },
  segmentActive: { backgroundColor: t.colors.brandInk },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { ...typography.micro, color: t.colors.inkSecondary, fontWeight: '700' },
  label: { ...typography.micro, color: t.colors.brandInk, fontWeight: '700' },
}));
