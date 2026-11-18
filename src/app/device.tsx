import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
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
import { loadDeviceState } from '@/data/mock/device';
import { isDeviceOwner } from '@/data/services/installedApps';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography } from '@/theme';
import type { DeviceState } from '@/types';
import { formatRelative, pluralize } from '@/utils/format';
import {
  approvePairingRequest,
  createPairingRequest,
  issueMemberLock,
  listCloudDevices,
  listPairingRequests,
  rejectPairingRequest,
  revokeCloudDevice,
  activatePairedDevice,
  cancelPairingRequest,
  type CloudDevice,
  type PairingRequest,
} from '@/data/services/cloudService';

const protectionLabel: Record<DeviceState['protection'], string> = {
  protected: 'Protected',
  partial: 'Partly set up',
  'not-configured': 'Not configured',
};

/** Screen 13 — device management. Reports honestly what is and is not enforced. */
export default function DeviceScreen() {
  const { activeMember, members, family, memberRestrictionWarning, admin } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const [device, setDevice] = useState<DeviceState>(() => loadDeviceState(activeMember?.fullName ?? null));
  const [pairingOpen, setPairingOpen] = useState(false);
  const [deviceOwner, setDeviceOwner] = useState<boolean | null>(null);
  const [deviceOwnerError, setDeviceOwnerError] = useState('');
  const [cloudDevices, setCloudDevices] = useState<CloudDevice[]>([]);
  const [pairingRequests, setPairingRequests] = useState<PairingRequest[]>([]);
  const [familyIdToJoin, setFamilyIdToJoin] = useState('');
  const [createdRequestId, setCreatedRequestId] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState('');

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

  useEffect(() => {
    if (!family) return;
    let active = true;
    Promise.all([listCloudDevices(family.id), listPairingRequests(family.id)])
      .then(([devices, requests]) => {
        if (!active) return;
        setCloudDevices(devices);
        setPairingRequests(requests);
      })
      .catch((cause) => {
        if (active) setCloudError(cause instanceof Error ? cause.message : 'Cloud status unavailable');
      });
    return () => {
      active = false;
    };
  }, [family]);

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
          <StatusDot tone={device.connection === 'local' ? 'success' : 'warning'} />
          <Text style={[heroText.caption, styles.statusText]}>
            {device.connection === 'local' ? 'Local device' : 'Not paired'} · checked {formatRelative(device.lastCheckedAt)}
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
        <SettingsRow icon="link-outline" title="Connection" value={device.connection === 'local' ? 'Nest is on this device' : 'Not paired'} />
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
      {memberRestrictionWarning ? (
        <NoticeCard message={memberRestrictionWarning} title="App access needs attention" tone="warning" />
      ) : null}
      <NoticeCard icon="person-circle-outline" message={device.protectionNote} title="Protection for the active profile" />

      <NoticeCard
        message="On sign-in, Nest first restores previously hidden apps, reads the saved profile rules, then hides blocked user-installed apps through Android DevicePolicyManager. Signing out restores those apps."
        title="What refresh does"
      />

      <ModalSheet
        footer={<Button label="Got it" onPress={() => setPairingOpen(false)} />}
        onClose={() => setPairingOpen(false)}
        subtitle="Pairing is authorized only by the original owner device."
        title="Pair another device"
        visible={pairingOpen}
      >
        {!!cloudError ? <NoticeCard message={cloudError} title="Cloud unavailable" tone="warning" /> : null}
        {family && cloudDevices.find((item) => item.role === 'owner') ? (
          <>
            <SectionHeader subtitle="Requests waiting for owner approval." title="Pending pairing requests" />
            {pairingRequests.filter((item) => item.status === 'pending').map((request) => (
              <View key={request.id} style={styles.cloudRow}>
                <View style={styles.cloudCopy}>
                  <Text style={styles.cloudTitle}>{request.device_name ?? 'Unknown device'}</Text>
                  <Text style={styles.cloudMeta}>Code {request.pairing_code}</Text>
                </View>
                <Button
                  label="Approve"
                  loading={cloudBusy}
                  onPress={async () => {
                    setCloudBusy(true);
                    setCloudError('');
                    try {
                      await approvePairingRequest(request.id);
                      setPairingRequests((current) =>
                        current.map((item) =>
                          item.id === request.id ? { ...item, status: 'approved' } : item,
                        ),
                      );
                      toast.show('Pairing approved', 'success');
                    } catch (cause) {
                      setCloudError(cause instanceof Error ? cause.message : 'Pairing could not be approved');
                    } finally {
                      setCloudBusy(false);
                    }
                  }}
                />
                <Button
                  label="Reject"
                  loading={cloudBusy}
                  onPress={async () => {
                    setCloudBusy(true);
                    try {
                      await rejectPairingRequest(request.id);
                      setPairingRequests((current) =>
                        current.map((item) =>
                          item.id === request.id ? { ...item, status: 'rejected' } : item,
                        ),
                      );
                    } catch (cause) {
                      setCloudError(cause instanceof Error ? cause.message : 'Pairing could not be rejected');
                    } finally {
                      setCloudBusy(false);
                    }
                  }}
                  variant="secondary"
                />
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.cloudTitle}>Join an existing family</Text>
            <TextInput
              onChangeText={setFamilyIdToJoin}
              placeholder="Family ID"
              placeholderTextColor="#69756F"
              style={styles.cloudInput}
              value={familyIdToJoin}
            />
            <Button
              label="Create pairing request"
              loading={cloudBusy}
              onPress={async () => {
                if (!familyIdToJoin.trim()) {
                  setCloudError('Enter the family ID shown by the owner device.');
                  return;
                }
                setCloudBusy(true);
                setCloudError('');
                try {
                  const request = await createPairingRequest(familyIdToJoin.trim());
                  setCreatedRequestId(request.request_id);
                  setPairingCode(request.pairing_code);
                  toast.show(`Pairing code: ${request.pairing_code}`, 'success');
                } catch (cause) {
                  setCloudError(cause instanceof Error ? cause.message : 'Pairing request could not be created');
                } finally {
                  setCloudBusy(false);
                }
              }}
            />
            {pairingCode ? (
              <NoticeCard
                message={`Pairing code ${pairingCode}. The owner must approve request ${createdRequestId}.`}
                title="Waiting for owner approval"
                tone="warning"
              />
            ) : null}
            {createdRequestId ? (
              <>
                <Button
                  label="Activate after approval"
                  loading={cloudBusy}
                  onPress={async () => {
                    setCloudBusy(true);
                    setCloudError('');
                    try {
                      await activatePairedDevice(createdRequestId);
                      toast.show('Pairing confirmed by the server', 'success');
                      setPairingOpen(false);
                    } catch (cause) {
                      setCloudError(cause instanceof Error ? cause.message : 'Pairing is not approved yet');
                    } finally {
                      setCloudBusy(false);
                    }
                  }}
                  variant="secondary"
                />
                <Button
                  label="Cancel pairing request"
                  loading={cloudBusy}
                  onPress={async () => {
                    setCloudBusy(true);
                    setCloudError('');
                    try {
                      await cancelPairingRequest(createdRequestId);
                      setCreatedRequestId('');
                      setPairingCode('');
                      toast.show('Pairing request cancelled', 'success');
                    } catch (cause) {
                      setCloudError(cause instanceof Error ? cause.message : 'Pairing could not be cancelled');
                    } finally {
                      setCloudBusy(false);
                    }
                  }}
                  variant="secondary"
                />
              </>
            ) : null}
          </>
        )}

        <SectionHeader subtitle="Paired devices synchronized for this family." title="Family devices" />
        {cloudDevices.map((pairedDevice) => (
          <View key={pairedDevice.id} style={styles.cloudRow}>
            <View style={styles.cloudCopy}>
              <Text style={styles.cloudTitle}>{pairedDevice.name ?? pairedDevice.id}</Text>
              <Text style={styles.cloudMeta}>
                {pairedDevice.role} · {pairedDevice.status}
              </Text>
            </View>
            {pairedDevice.role === 'secondary' && pairedDevice.status === 'paired' ? (
              <Button
                label="Revoke"
                onPress={async () => {
                  try {
                    await revokeCloudDevice(pairedDevice.id);
                    setCloudDevices((current) =>
                      current.map((item) =>
                        item.id === pairedDevice.id ? { ...item, status: 'revoked' } : item,
                      ),
                    );
                    toast.show('Device revoked', 'success');
                  } catch (cause) {
                    setCloudError(cause instanceof Error ? cause.message : 'Device could not be revoked');
                  }
                }}
                variant="secondary"
              />
            ) : null}
          </View>
        ))}

        {admin && family ? (
          <>
            <SectionHeader subtitle="Only the original owner can issue a Nest-session lock." title="Remote lock" />
            {members.map((member) =>
              cloudDevices
                .filter((item) => item.role === 'secondary' && item.status === 'paired')
                .map((pairedDevice) => (
                  <Button
                    key={`${member.id}-${pairedDevice.id}`}
                    label={`Lock ${member.fullName} on ${pairedDevice.name ?? pairedDevice.id}`}
                    onPress={async () => {
                      setCloudBusy(true);
                      setCloudError('');
                      try {
                        await issueMemberLock(pairedDevice.id, member.id);
                        toast.show('Lock command is pending until the device reconnects', 'success');
                      } catch (cause) {
                        setCloudError(cause instanceof Error ? cause.message : 'Lock command could not be issued');
                      } finally {
                        setCloudBusy(false);
                      }
                    }}
                    variant="secondary"
                  />
                )),
            )}
          </>
        ) : null}
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
  cloudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cloudCopy: { flex: 1, gap: 2 },
  cloudTitle: { ...typography.caption, color: t.colors.ink, fontWeight: '700' },
  cloudMeta: { ...typography.micro, color: t.colors.inkSecondary },
  cloudInput: {
    ...typography.body,
    color: t.colors.ink,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
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
