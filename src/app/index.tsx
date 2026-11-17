import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { NoticeCard } from '@/components/common/InlineMessage';
import { NestMark } from '@/components/common/NestMark';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, spacing, typography, useTheme } from '@/theme';

/** Splash screen: opens the encrypted local store before anything else. */
export default function SplashScreen() {
  const { admin, family, ready, bootstrapError } = useFamilySession();
  const router = useRouter();
  const styles = useStyles();
  const { colors, gradients } = useTheme();
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !minimumElapsed || bootstrapError) return;
    router.replace(admin ? (family ? '/home' : '/create-family') : family ? '/sign-in' : '/create-family');
  }, [admin, bootstrapError, family, minimumElapsed, ready, router]);

  return (
    <LinearGradient colors={gradients.hero} end={{ x: 0.7, y: 1 }} start={{ x: 0.1, y: 0 }} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.brand}>
          <NestMark size={76} tone="mint" />
          <Text style={styles.word}>nest</Text>
          <Text style={styles.tagline}>One device. Every family member.</Text>
        </View>

        <View style={styles.footer}>
          {bootstrapError ? (
            <NoticeCard message={bootstrapError} title="Local store unavailable" tone="danger" />
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.loadingText}>Preparing this device</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  word: { fontSize: 40, fontWeight: '800', letterSpacing: -1.8, color: t.colors.white },
  tagline: { ...typography.caption, color: t.colors.onDark, textAlign: 'center' },
  footer: { paddingBottom: spacing.xl },
  loading: { alignItems: 'center', gap: spacing.sm },
  loadingText: { ...typography.micro, color: t.colors.onDarkMuted },
}));
