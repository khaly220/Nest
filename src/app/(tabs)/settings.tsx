import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, IconButton } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ModalSheet';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { SegmentedControl } from '@/components/forms/ChoiceRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useToast } from '@/hooks/useToast';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { ThemePreference } from '@/theme';
import { pluralize } from '@/utils/format';

const themeOptions: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

/** Screen 15 — administrator settings index. */
export default function SettingsTabScreen() {
  const styles = useStyles();
  const { colors, preference, scheme, setPreference } = useTheme();
  const { admin, family, members, activeMember, signOutAdministrator } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const [signOutVisible, setSignOutVisible] = useState(false);

  const confirmSignOut = () => {
    setSignOutVisible(false);
    signOutAdministrator();
    toast.show('Signed out of the administrator account', 'default');
    router.replace('/welcome');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader eyebrow="Settings" subtitle="Administration, family space and device preferences." title="Settings" />

      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Ionicons color={colors.brandInk} name="person-circle-outline" size={30} />
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileName}>
              {admin?.username ?? 'Administrator'}
            </Text>
            <Text numberOfLines={1} style={styles.profileMeta}>
              {family ? family.familyName : 'No family space yet'}
            </Text>
          </View>
          <IconButton
            accessibilityLabel="Edit administrator profile"
            icon="create-outline"
            onPress={() => router.push('/settings/profile')}
            size={40}
            tone="mint"
          />
        </View>
        <View style={styles.profileStats}>
          <Text style={styles.profileStat}>
            {members.length} {pluralize(members.length, 'profile')}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.profileStat}>
            {activeMember ? `Signed in as ${activeMember.fullName}` : 'No member signed in'}
          </Text>
        </View>
      </Card>

      <SettingsGroup title="Account">
        <SettingsRow
          description="Name held by this administrator account"
          icon="id-card-outline"
          onPress={() => router.push('/settings/profile')}
          title="Administrator profile"
        />
        <SettingsRow
          description="Password rules and the ten-minute admin window"
          icon="lock-closed-outline"
          last
          onPress={() => router.push('/settings/security')}
          title="Security"
        />
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <View style={styles.appearance}>
          <View style={styles.appearanceHeader}>
            <View style={styles.appearanceIcon}>
              <Ionicons color={colors.brandInk} name="contrast-outline" size={18} />
            </View>
            <View style={styles.appearanceCopy}>
              <Text style={styles.appearanceTitle}>Theme</Text>
              <Text style={styles.appearanceDescription}>
                {preference === 'system'
                  ? `Following the device — currently ${scheme}`
                  : `${scheme === 'dark' ? 'Dark' : 'Light'} theme applied across Nest`}
              </Text>
            </View>
          </View>
          <SegmentedControl
            onChange={(id) => setPreference(id as ThemePreference)}
            options={themeOptions}
            style={styles.appearanceControl}
            value={preference}
          />
        </View>
      </SettingsGroup>

      <SettingsGroup title="Family">
        <SettingsRow
          description="Family name and description"
          icon="home-outline"
          onPress={() => router.push('/settings/family')}
          title="Family details"
        />
        <SettingsRow
          description="Add, edit or remove member profiles"
          icon="people-outline"
          onPress={() => router.push('/family')}
          title="Member profiles"
          value={`${members.length}`}
        />
        <SettingsRow
          description="Hand the device to a family member"
          icon="person-outline"
          last
          onPress={() => router.push('/member')}
          title="Member sign-in mode"
        />
      </SettingsGroup>

      <SettingsGroup title="Device">
        <SettingsRow
          description="Status, capabilities and pairing"
          icon="phone-portrait-outline"
          onPress={() => router.push('/device')}
          title="This device"
        />
        <SettingsRow
          description="Choose what Nest tells you about"
          icon="notifications-outline"
          onPress={() => router.push('/settings/notifications')}
          title="Notifications"
        />
        <SettingsRow
          description="What Nest stores and what stays here"
          icon="shield-checkmark-outline"
          last
          onPress={() => router.push('/settings/privacy')}
          title="Privacy and data"
        />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <SettingsRow
          description="Guidance for everyday family questions"
          icon="help-circle-outline"
          onPress={() => router.push('/settings/help')}
          title="Help centre"
        />
        <SettingsRow
          description="Version, build and credits"
          icon="information-circle-outline"
          last
          onPress={() => router.push('/settings/about')}
          title="About Nest"
        />
      </SettingsGroup>

      <View style={styles.signOut}>
        <Button
          icon="log-out-outline"
          label="Sign out of administration"
          onPress={() => setSignOutVisible(true)}
          variant="secondary"
        />
        <Text style={styles.signOutNote}>
          Signing out locks the administration window. Member profiles, boundaries and history stay on this device.
        </Text>
      </View>

      <NoticeCard
        message="Nest keeps every decision on this device inside an encrypted database. Nothing on this screen sends data to a server."
        title="Stored locally"
      />

      <ConfirmDialog
        confirmLabel="Sign out"
        message="You will need your administrator password to make protected changes again. Member profiles and saved boundaries are kept."
        onCancel={() => setSignOutVisible(false)}
        onConfirm={confirmSignOut}
        title="Sign out of administration?"
        tone="danger"
        visible={signOutVisible}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  profileCard: { gap: spacing.sm },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: { flex: 1, gap: 2 },
  profileName: { ...typography.title3, color: t.colors.ink },
  profileMeta: { ...typography.micro, color: t.colors.inkSecondary },
  profileStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  profileStat: { ...typography.micro, color: t.colors.inkMuted, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.borderStrong },
  appearance: { gap: spacing.sm, paddingVertical: spacing.sm },
  appearanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appearanceIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceCopy: { flex: 1, gap: 2 },
  appearanceTitle: { ...typography.bodyStrong, color: t.colors.ink },
  appearanceDescription: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  appearanceControl: { marginBottom: spacing.xxs },
  signOut: { gap: spacing.xs },
  signOutNote: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
