import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { StatusDot } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { HeroPanel, heroText } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { AppHeader } from '@/components/navigation/AppHeader';
import { devicePairingSteps, loadDeviceState } from '@/data/mock/device';
import { isDeviceOwner } from '@/data/services/installedApps';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography } from '@/theme';
import type { DeviceState } from '@/types';
import { formatRelative, pluralize } from '@/utils/format';

const protectionLabel: Record<DeviceState['protection'], string> = {
  protected: 'Protected',
  partial: 'Partly set up',
  'not-configured': 'Not configured',
};

/** Screen 13 — device management. Reports honestly what is and is not enforced. */
export default function DeviceScreen() {
  const { activeMember, members, family } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const [device, setDevice] = useState<DeviceState>(() => loadDeviceState(activeMember?.fullName ?? null));
  const [pairingOpen, setPairingOpen] = useState(false);
  const [deviceOwner, setDeviceOwner] = useState<boolean | null>(null);
  const [deviceOwnerError, setDeviceOwnerError] = useState('');

  const checkDeviceOwner = useCallback(() => isDeviceOwner(), []);

  useEffect(() => {
    let active = true;
    checkDeviceOwner()
      .then((owner) => {
        if (!active) return;
        setDeviceOwner(owner);
        setDeviceOwnerError('');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setDeviceOwner(null);
        setDeviceOwnerError(cause instanceof Error ? cause.message : 'Unknown error');
      });
    return () => {
      active = false;
    };
  }, [checkDeviceOwner]);

  const refresh = useCallback(() => {
    setDevice(loadDeviceState(activeMember?.fullName ?? null));
    checkDeviceOwner()
      .then((owner) => {
        setDeviceOwner(owner);
        setDeviceOwnerError('');
        toast.show('Device status read again from this device', 'default');
      })
      .catch((cause: unknown) => {
        setDeviceOwner(null);
        setDeviceOwnerError(cause instanceof Error ? cause.message : 'Unknown error');
        toast.show('Device Owner status could not be read', 'danger');
      });
  }, [activeMember, checkDeviceOwner, toast]);

  const enforcementMessage =
    Platform.OS !== 'android'
      ? 'Cross-app restrictions are only available on fully managed Android devices. iOS and web do not allow Nest to block other installed apps.'
      : deviceOwnerError
        ? `Nest could not verify Device Owner status: ${deviceOwnerError}`
        : deviceOwner === true
          ? 'Device Owner is active. Nest hides blocked user-installed applications when a member signs in. Android system apps are not hidden.'
          : deviceOwner === false
            ? 'This device is not provisioned for Android app enforcement. Provision Nest as Device Owner on a fully managed device. On an eligible test device, connect ADB and run: adb shell dpm set-device-owner com.anonymous.Nest/expo.modules.appdiscovery.AppDeviceAdminReceiver. Android may require a new or factory-reset device; this cannot be enabled from inside Nest.'
            : 'Checking whether Android Device Owner enforcement is active…';

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Device"
        onBack={() => router.back()}
        subtitle={family ? `Shared with the ${family.familyName} family space` : 'Not linked to a family space yet'}
        title="This device"
      />

      <HeroPanel eyebrow="SHARED DEVICE">
        <Text style={heroText.title}>{device.name}</Text>
        <Text style={heroText.body}>
          {device.model} · {device.platform}
        </Text>
        <View style={styles.statusRow}>
          <StatusDot tone={device.connection === 'paired' ? 'success' : 'warning'} />
          <Text style={[heroText.caption, styles.statusText]}>
            {device.connection === 'paired' ? 'Paired' : 'Not paired'} · checked {formatRelative(device.lastCheckedAt)}
          </Text>
        </View>
      </HeroPanel>

      <StatRow>
        <StatTile
          icon="shield-half-outline"
          label="Protection"
          tone={device.protection === 'protected' ? 'forest' : 'warning'}
          value={protectionLabel[device.protection]}
        />
        <StatTile
          icon="lock-open-outline"
          label="Restrictions"
          tone={Platform.OS === 'android' && deviceOwner ? 'mint' : 'warning'}
          value={
            Platform.OS !== 'android'
              ? 'Android only'
              : deviceOwner === null
                ? 'Checking'
                : deviceOwner
                  ? 'Active'
                  : 'Needs setup'
          }
        />
        <StatTile
          icon="person-outline"
          label="Active profile"
          tone="sage"
          value={activeMember ? activeMember.fullName : 'None'}
        />
      </StatRow>

      <View style={styles.actions}>
        <Button icon="refresh-outline" label="Refresh device status" onPress={refresh} />
        <Button icon="link-outline" label="Pair another device" onPress={() => setPairingOpen(true)} variant="secondary" />
      </View>

      <SectionHeader subtitle="What Nest knows about the device it is running on." title="Device details" />
      <SettingsGroup>
        <SettingsRow icon="phone-portrait-outline" title="Device name" value={device.name} />
        <SettingsRow icon="hardware-chip-outline" title="Model" value={device.model} />
        <SettingsRow icon="logo-android" title="Platform" value={device.platform} />
        <SettingsRow icon="link-outline" title="Connection" value={device.connection === 'paired' ? 'Nest is on this device' : 'Not paired'} />
        <SettingsRow icon="time-outline" title="Last checked" value={formatRelative(device.lastCheckedAt)} />
        <SettingsRow
          icon="people-outline"
          last
          title="Member profiles"
          value={`${members.length} ${pluralize(members.length, 'profile')}`}
        />
      </SettingsGroup>

      <SectionHeader subtitle="Application restrictions for other installed apps." title="Enforcement status" />
      <NoticeCard
        message={enforcementMessage}
        title={
          Platform.OS !== 'android'
            ? 'Android only'
            : deviceOwnerError
            ? 'Device Owner status unavailable'
            : deviceOwner === null
              ? 'Checking enforcement status'
              : deviceOwner
                ? 'Android enforcement is ready'
                : 'Device Owner setup required'
        }
        tone={Platform.OS === 'android' && deviceOwner ? 'success' : 'warning'}
      />
      <NoticeCard icon="person-circle-outline" message={device.protectionNote} title="Protection for the active profile" />

      <NoticeCard
        message="On sign-in, Nest first restores previously hidden apps, reads the saved profile rules, then hides blocked user-installed apps through Android DevicePolicyManager. Signing out restores those apps."
        title="What refresh does"
      />

      <ModalSheet
        footer={<Button label="Got it" onPress={() => setPairingOpen(false)} />}
        onClose={() => setPairingOpen(false)}
        subtitle="Pairing runs on the new device itself. This screen only shows the steps."
        title="Pair another device"
        visible={pairingOpen}
      >
        <NoticeCard
          message="Pairing is an interface preview in this build. No device is contacted, and no profiles are copied anywhere."
          title="Preview only"
          tone="warning"
        />
        {devicePairingSteps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexLabel}>{index + 1}</Text>
            </View>
            <Text style={styles.stepLabel}>{step}</Text>
          </View>
        ))}
      </ModalSheet>

      <NoticeCard
        icon="layers-outline"
        message="Nest keeps every decision on this device. Nothing on this screen sends your family data to a server."
        title="Stored on this device"
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  statusText: { flex: 1 },
  actions: { gap: spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexLabel: { ...typography.micro, color: t.colors.brandInk, fontWeight: '800' },
  stepLabel: { ...typography.caption, color: t.colors.ink, flex: 1, lineHeight: 20 },
}));
