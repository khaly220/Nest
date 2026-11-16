import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { IconBubble } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { makeStyles, radius, screenPadding, spacing, typography } from '@/theme';
import type { IconName } from '@/types';

const slides: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'people-outline',
    title: 'One device, many people',
    body: 'The same tablet or phone can belong to the whole family without everyone seeing the same thing.',
  },
  {
    icon: 'id-card-outline',
    title: 'A profile for each person',
    body: 'Parents, a teenager and a child each get their own profile, their own PIN and their own applications.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Boundaries without arguments',
    body: 'You decide which applications a profile can open. Nest keeps that decision consistent every time.',
  },
];

const steps: { title: string; body: string }[] = [
  { title: 'Create the family', body: 'One administrator account holds the family space on this device.' },
  { title: 'Add each member', body: 'Name, age group, an avatar and a six-digit PIN that only they know.' },
  { title: 'Choose what is available', body: 'Start from age-appropriate defaults, then adjust any application.' },
  { title: 'Hand the device over', body: 'Members pick their profile, enter their PIN and see only their own apps.' },
];

/** Product introduction shown before account creation. */
export default function IntroduceScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const slideWidth = width - screenPadding * 2;
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(slideWidth, 1));
    if (next !== index) setIndex(next);
  };

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button icon="add-circle-outline" label="Create a family" onPress={() => router.push('/create-family')} />
          <Button label="I already have an account" onPress={() => router.push('/sign-in')} variant="secondary" />
        </View>
      }
    >
      <AppHeader eyebrow="Getting started" onBack={() => router.back()} subtitle="Nest is a family device-access app. Nothing here leaves this device." title="How Nest works" />

      <ScrollView
        horizontal
        onScroll={onScroll}
        pagingEnabled
        ref={scroller}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.slider}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
            <View style={styles.slideCard}>
              <IconBubble icon={slide.icon} size={56} tone="mint" />
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, dotIndex) => (
          <View key={slide.title} style={[styles.dot, dotIndex === index && styles.dotActive]} />
        ))}
      </View>

      <SectionHeader subtitle="Four short steps and the device is ready to be shared." title="What happens next" />
      <Card style={styles.stepCard}>
        {steps.map((step, stepIndex) => (
          <View key={step.title} style={[styles.stepRow, stepIndex < steps.length - 1 && styles.stepDivider]}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{stepIndex + 1}</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.xs },
  slider: { marginHorizontal: -screenPadding },
  slide: { paddingHorizontal: screenPadding },
  slideCard: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 232,
    justifyContent: 'center',
  },
  slideTitle: { ...typography.title1, color: t.colors.ink },
  slideBody: { ...typography.caption, color: t.colors.inkSecondary, lineHeight: 21 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.borderStrong },
  dotActive: { width: 22, backgroundColor: t.colors.brandDeep },
  stepCard: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  stepDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: { ...typography.micro, color: t.colors.brandInk, fontWeight: '800' },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: { ...typography.bodyStrong, color: t.colors.ink },
  stepBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
