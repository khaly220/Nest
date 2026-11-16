import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card, SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/navigation/AppHeader';
import { makeStyles, spacing, typography, useTheme } from '@/theme';

type Question = { id: string; question: string; answer: string };

const questions: Question[] = [
  {
    id: 'shared-device',
    question: 'What does Nest actually do?',
    answer:
      'Nest gives every family member their own profile on one shared device. Each profile signs in with its own PIN and sees only the applications the administrator has made available to it.',
  },
  {
    id: 'why-pin',
    question: 'Why does every profile need a PIN?',
    answer:
      'The PIN is what tells Nest which profile is using the device, so the right boundaries apply. PINs are unique per profile and stored as a bcrypt hash that cannot be read back.',
  },
  {
    id: 'not-enforced',
    question: 'Are blocked applications really blocked?',
    answer:
      'On Android, Nest can hide blocked user-installed applications when it is provisioned as the Device Owner of a fully managed device. That provisioning must be done during device setup or by an administrator with ADB; ordinary installation is not enough. Nest refuses member sign-in when enforcement is not available. iOS and web cannot block other apps.',
  },
  {
    id: 'catalog',
    question: 'Where does the application list come from?',
    answer:
      'On Android, Nest lists launchable apps installed on this device. Blocked user-installed apps are hidden by Android while a member profile is active. System applications are not hidden. iOS does not let apps enumerate or block other installed apps.',
  },
  {
    id: 'session',
    question: 'Why does Nest ask for the password again?',
    answer:
      'Protected writes are only accepted inside a ten-minute administrator window. When the window closes, the next protected change asks for your password and then repeats the action you were doing.',
  },
  {
    id: 'forgot',
    question: 'A family member forgot their PIN. What now?',
    answer:
      'Sign in as the administrator, open Family, choose the profile and use Reset sign-in PIN. The old PIN stops working immediately for that profile.',
  },
  {
    id: 'data',
    question: 'Where is all of this stored?',
    answer:
      'In an encrypted database on this device. There is no Nest server, no account sync and no analytics. If the app is removed, the local records go with it.',
  },
];

/** Settings — help centre. */
export default function HelpSettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(questions[0]?.id ?? null);

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Support"
        onBack={() => router.back()}
        subtitle="Short answers to the questions families ask most."
        title="Help centre"
      />

      <SectionHeader subtitle="Tap a question to read the answer." title="Common questions" />
      <View style={styles.list}>
        {questions.map((item) => {
          const expanded = open === item.id;
          return (
            <Card key={item.id} padded={false}>
              <Pressable
                accessibilityLabel={item.question}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : item.id)}
                style={({ pressed }) => [styles.question, pressed && styles.pressed]}
              >
                <Text style={styles.questionLabel}>{item.question}</Text>
                <Ionicons color={colors.inkSecondary} name={expanded ? 'chevron-up' : 'chevron-down'} size={17} />
              </Pressable>
              {expanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
            </Card>
          );
        })}
      </View>

      <NoticeCard
        message="Everything above is answered from this build. Live chat and email support arrive with the accounts phase, so there is no support inbox to write to yet."
        title="Contacting support"
        tone="warning"
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.xs },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  questionLabel: { ...typography.bodyStrong, color: t.colors.ink, flex: 1 },
  answer: {
    ...typography.caption,
    color: t.colors.inkSecondary,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -spacing.xxs,
  },
}));
