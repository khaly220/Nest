import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionDialogs } from '@/components/common/SessionDialogs';
import { SessionProvider, useFamilySession } from '@/hooks/useFamilySession';
import { ToastProvider } from '@/hooks/useToast';
import { ThemeProvider, useTheme } from '@/theme';

/** Routes that require a signed-in administrator on this device. */
const administratorRoots = new Set(['(tabs)', 'members', 'device', 'settings']);

function RouteGuard() {
  const { admin, family, lockedMemberId, ready } = useFamilySession();
  const segments = useSegments();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const root = segments[0];
    if (lockedMemberId && !admin) {
      const isLockedVerification = segments.join('/') === 'member/verify' && memberId === lockedMemberId;
      if (!isLockedVerification && root !== 'sign-in') {
        router.replace(`/member/verify?memberId=${encodeURIComponent(lockedMemberId)}`);
      }
      return;
    }
    if (root && administratorRoots.has(root) && !admin) {
      router.replace(family ? '/sign-in' : '/create-family');
    }
  }, [admin, family, lockedMemberId, memberId, ready, router, segments]);

  return null;
}

function RootNavigator() {
  const { colors, scheme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="create-family" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="success" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="members/new" />
        <Stack.Screen name="members/[memberId]/index" />
        <Stack.Screen name="members/[memberId]/access" />
        <Stack.Screen name="members/[memberId]/permissions" />
        <Stack.Screen name="device" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/security" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/family" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/about" />
        <Stack.Screen name="member/index" />
        <Stack.Screen name="member/verify" />
        <Stack.Screen name="member/home" />
        <Stack.Screen name="member/apps" />
        <Stack.Screen name="member/restricted" />
        <Stack.Screen name="member/guest" />
      </Stack>
      <SessionDialogs />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <SessionProvider>
            <RouteGuard />
            <RootNavigator />
          </SessionProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
