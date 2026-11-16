import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import type { FamilyMember } from '@/data/familyStore';
import { makeStyles, radius, shadows, spacing, typography, useTheme } from '@/theme';

type MemberCardProps = {
  member: FamilyMember;
  /** Short summary of the profile's boundaries, e.g. "24 apps allowed". */
  summary?: string;
  /** Right hand slot, usually an options button. */
  trailing?: React.ReactNode;
  onPress?: () => void;
};

const ageLabel: Record<FamilyMember['ageGroup'], string> = { child: 'Child', teen: 'Teen', adult: 'Adult' };

/** Row shown in the family list and in onboarding review. */
export function MemberCard({ member, summary, trailing, onPress }: MemberCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const body = (
    <>
      <ProfileAvatar avatar={member.avatar} name={member.fullName} size={48} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {member.fullName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{ageLabel[member.ageGroup]}</Text>
          <View style={styles.dot} />
          <Text style={styles.meta}>{member.hasCredential ? 'PIN sign-in' : 'PIN not set'}</Text>
        </View>
        {summary ? (
          <Text numberOfLines={1} style={styles.summary}>
            {summary}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.card}>{body}</View>;

  return (
    <Pressable
      accessibilityLabel={`${member.fullName}, ${ageLabel[member.ageGroup]}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...shadows.xs,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  copy: { flex: 1, gap: 2 },
  name: { ...typography.bodyStrong, color: t.colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { ...typography.micro, color: t.colors.inkSecondary },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.borderStrong },
  summary: { ...typography.micro, color: t.colors.inkMuted, marginTop: 2 },
}));
