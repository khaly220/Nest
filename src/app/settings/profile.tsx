import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ConfirmDialog } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import { formatDate, pluralize } from '@/utils/format';

/** Settings — administrator profile. */
export default function AdministratorProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
      <AppHeader
        eyebrow="Account"
        onBack={() => router.back()}
        subtitle="The administrator account that protects this device."
        title="Administrator profile"
      />

      <Card style={styles.identity}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Ionicons color={colors.brandInk} name="person-circle-outline" size={34} />
          </View>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.username}>
              {admin?.username ?? 'Administrator'}
            </Text>
            <Text style={styles.role}>Administrator on this device</Text>
          </View>
        </View>
      </Card>

      <SettingsGroup title="Identity">
        <SettingsRow icon="id-card-outline" title="Administrator name" value={admin?.username ?? 'Not signed in'} />
        <SettingsRow icon="ribbon-outline" title="Role" value="Family administrator" />
        <SettingsRow icon="home-outline" title="Family space" value={family?.familyName ?? 'None created yet'} />
        <SettingsRow
          icon="calendar-outline"
          title="Family created"
          value={family ? formatDate(family.createdAt) : 'Not created yet'}
        />
        <SettingsRow
          icon="people-outline"
          last
          title="Member profiles"
          value={`${members.length} ${pluralize(members.length, 'profile')}`}
        />
      </SettingsGroup>

      <SettingsGroup title="Session">
        <SettingsRow
          description="Current member profile signed in on this device."
          icon="person-outline"
          onPress={() => router.push('/member')}
          title="Member sign-in mode"
          value={activeMember?.fullName ?? 'No member'}
        />
        <SettingsRow
          description="Change the password that unlocks protected changes."
          icon="lock-closed-outline"
          last
          onPress={() => router.push('/settings/security')}
          title="Password and security"
        />
      </SettingsGroup>

      <NoticeCard
        message="An administrator name is fixed when the account is created so stored PIN hashes and boundary rules keep pointing at the right owner. Editing the display name arrives with the accounts phase."
        title="Why the name is read-only here"
      />

      <Button icon="log-out-outline" label="Sign out of administration" onPress={() => setSignOutVisible(true)} variant="secondary" />

      <ConfirmDialog
        confirmLabel="Sign out"
        message="You will need your administrator password to make protected changes again. Member profiles and saved boundaries are kept on this device."
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
  identity: { padding: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: { flex: 1, gap: 3 },
  username: { ...typography.title2, color: t.colors.ink },
  role: { ...typography.micro, color: t.colors.inkSecondary },
}));
