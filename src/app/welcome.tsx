import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { IconBubble, NestMark } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

const values: { icon: IconName; title: string; body: string }[] = [
  { icon: 'phone-portrait-outline', title: 'One shared device', body: 'A family tablet or phone can be handed to anyone without exposing everyone.' },
  { icon: 'people-outline', title: 'A profile for each person', body: 'Every member signs in with their own PIN and sees only their own applications.' },
  { icon: 'shield-checkmark-outline', title: 'Boundaries you decide', body: 'You choose what is available per profile, and Nest keeps that decision consistent.' },
];

/** First screen a new family sees. */
export default function WelcomeScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <ScreenContainer
      background="mint"
      footer={
        <View style={styles.footer}>
          <Button icon="add-circle-outline" label="Create a family" onPress={() => router.push('/create-family')} />
          <Button label="I already have an account" onPress={() => router.push('/sign-in')} variant="secondary" />
        </View>
      }
      scroll
    >
      <View style={styles.brandRow}>
        <NestMark />
        <View style={styles.brandCopy}>
          <Text style={styles.word}>nest</Text>
          <Text style={styles.brandLine}>Family device access</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.glow} />
        <Text style={styles.eyebrow}>Private by design</Text>
        <Text style={styles.headline}>A safer digital world starts at home.</Text>
        <Text style={styles.heroBody}>
          Nest gives every family member their own profile on one shared device, with the boundaries you set.
        </Text>
      </View>

      <SectionHeader subtitle="Everything stays on this device, protected by an encrypted local store." title="Why families use Nest" />
      <View style={styles.values}>
        {values.map((value) => (
          <Card key={value.title} style={styles.valueCard}>
            <View style={styles.valueRow}>
              <IconBubble icon={value.icon} tone="mint" />
              <View style={styles.valueCopy}>
                <Text style={styles.valueTitle}>{value.title}</Text>
                <Text style={styles.valueBody}>{value.body}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Card onPress={() => router.push('/member')} tone="mint" accessibilityLabel="Sign in as a family member" style={styles.memberCard}>
        <View style={styles.valueRow}>
          <IconBubble icon="person-circle-outline" size={44} tone="forest" />
          <View style={styles.valueCopy}>
            <Text style={styles.valueTitle}>Using this device?</Text>
            <Text style={styles.valueBody}>Family members can sign in with their PIN right away.</Text>
          </View>
          <Ionicons color={colors.brandInk} name="chevron-forward" size={18} />
        </View>
      </Card>

      <Button icon="bulb-outline" iconPosition="right" label="How Nest works" onPress={() => router.push('/intro')} variant="ghost" />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  brandCopy: { gap: 2 },
  word: { fontSize: 24, fontWeight: '800', letterSpacing: -1.1, color: t.colors.brandInk },
  brandLine: { ...typography.micro, color: t.colors.inkSecondary },
  hero: {
    backgroundColor: t.colors.brandDeep,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(147,197,253,0.28)',
    top: -80,
    right: -40,
  },
  eyebrow: { ...typography.eyebrow, color: t.colors.onDarkMuted },
  headline: { ...typography.display, color: t.colors.white },
  heroBody: { ...typography.caption, color: t.colors.onDark, lineHeight: 21 },
  values: { gap: spacing.xs },
  valueCard: { padding: spacing.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  valueCopy: { flex: 1, gap: 2 },
  valueTitle: { ...typography.bodyStrong, color: t.colors.ink },
  valueBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  memberCard: { padding: spacing.sm },
}));
