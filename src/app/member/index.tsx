import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { MemberCard } from '@/components/cards/MemberCard';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { IconBubble } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, spacing, typography, useTheme } from '@/theme';

/** Screen 16 — member identification: who is using the device? */
export default function MemberIdentificationScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { family, members, loadStoredFamily } = useFamilySession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!family) {
      loadStoredFamily()
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [family, loadStoredFamily]);

  return (
    <ScreenContainer scroll>
      <AppHeader
        backLabel="Administrator sign-in"
        eyebrow="Member sign-in"
        onBack={() => router.replace('/sign-in')}
        subtitle="Pick the profile that belongs to you. Each profile has its own PIN and its own applications."
        title="Who's using this device?"
      />

      {loading && !family && !members.length ? (
        <LoadingState message="Looking for profiles on this device…" />
      ) : members.length === 0 ? (
        <EmptyState
          actionLabel="Administrator sign-in"
          icon="people-outline"
          message="No member profiles exist on this device yet. An administrator needs to add one from Settings before anyone can sign in here."
          onAction={() => router.replace('/sign-in')}
          title="No profiles yet"
        />
      ) : (
        <>
          <View style={styles.list}>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onPress={() => router.push(`/member/verify?memberId=${member.id}`)}
                summary={member.hasCredential ? 'Tap to enter your PIN' : 'Needs an administrator to set a PIN'}
                trailing={<Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />}
              />
            ))}
          </View>

          <Card onPress={() => router.push('/member/guest')} style={styles.guestCard} tone="mint">
            <View style={styles.guestRow}>
              <IconBubble icon="person-add-outline" size={44} tone="forest" />
              <View style={styles.guestCopy}>
                <Text style={styles.guestTitle}>I&apos;m a guest</Text>
                <Text style={styles.guestBody}>Use only the essentials, with no access to family settings.</Text>
              </View>
              <Ionicons color={colors.brandInk} name="chevron-forward" size={18} />
            </View>
          </Card>

          <Button
            icon="settings-outline"
            label="I'm the administrator"
            onPress={() => router.replace('/sign-in')}
            variant="ghost"
          />
        </>
      )}

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          {family
            ? `${family.familyName} · ${members.length} ${members.length === 1 ? 'profile' : 'profiles'} on this device`
            : 'Nest keeps every profile on this device only.'}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.xs },
  guestCard: { padding: spacing.sm },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guestCopy: { flex: 1, gap: 2 },
  guestTitle: { ...typography.bodyStrong, color: t.colors.ink },
  guestBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  footerNote: { alignItems: 'center', paddingTop: spacing.xs },
  footerText: { ...typography.micro, color: t.colors.inkMuted, textAlign: 'center' },
}));
