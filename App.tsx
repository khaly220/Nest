import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addMember,
  authenticateAdministrator,
  authenticateMember,
  changeAdministratorPassword,
  createFamily,
  Family,
  FamilyMember,
  findFamily,
  listMembers,
  loadExistingFamily,
  loadPermissions,
  lockAdministrator,
  passwordIsStrong,
  prepareLocalStore,
  registerAdministrator,
  removeMember,
  savePermission,
  updateFamily,
  updateMember,
} from './src/data/familyStore';

type Screen = 'welcome' | 'register' | 'adminLogin' | 'familySetup' | 'onboardingMembers' | 'onboardingReview' | 'dashboard' | 'memberForm' | 'identity' | 'memberLogin' | 'memberHome' | 'familySettings' | 'accountSettings' | 'reauth' | 'permissionsSettings';
type AgeGroup = FamilyMember['ageGroup'];

const avatars = ['sprout', 'sun', 'moon', 'wave', 'star'];
const avatarGlyph: Record<string, string> = { sprout: '✳', sun: '☼', moon: '◔', wave: '≈', star: '✦' };
const permissionLabels = [['camera', 'Camera'], ['install_apps', 'Install apps'], ['web_access', 'Web access']] as const;

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [family, setFamily] = useState<Family | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [familyDescription, setFamilyDescription] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('child');
  const [avatar, setAvatar] = useState('sprout');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [identityMember, setIdentityMember] = useState<FamilyMember | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [nextPassword, setNextPassword] = useState('');
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState('');
  const [bootstrapError, setBootstrapError] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [reauthReason, setReauthReason] = useState('');
  const [permissionTarget, setPermissionTarget] = useState<FamilyMember | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;
    prepareLocalStore().catch(() => mounted && setBootstrapError('Nest could not open its local database. Please restart the app; if it continues, reinstall the development build.')).finally(() => mounted && setReady(true));
    return () => { mounted = false; };
  }, []);

  const resetError = () => setError('');
  const requestReauthentication = (reason: string, action: () => Promise<void>) => {
    setPendingAction(() => action); setReauthReason(reason); setReauthPassword(''); resetError(); setScreen('reauth');
  };
  const confirmReauthentication = async () => {
    resetError(); setBusy(true);
    try {
      const result = await authenticateAdministrator(username, reauthPassword);
      if (result.result !== 'ok') { setError(result.result === 'locked' ? 'Too many attempts. Try again in five minutes.' : 'Administrator password is incorrect.'); return; }
      setReauthPassword('');
      await pendingAction?.();
      setPendingAction(null); setScreen(onboarding ? 'onboardingMembers' : 'dashboard');
    } catch { setError('The protected action could not be completed.'); }
    finally { setBusy(false); }
  };
  const enterAdministrator = async (id: string) => {
    setAdminId(id);
    const savedFamily = await findFamily(id);
    setFamily(savedFamily);
    if (savedFamily) {
      setFamilyName(savedFamily.familyName);
      setFamilyDescription(savedFamily.description);
      setMembers(await listMembers(savedFamily.id));
      setScreen('dashboard');
    } else {
      setFamily(null);
      setScreen('familySetup');
    }
  };

  const register = async () => {
    resetError();
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!passwordIsStrong(password)) { setError('Your password must contain at least 8 characters.'); return; }
    setBusy(true);
    try {
      const administrator = await registerAdministrator(username, password);
      setUsername(administrator.username);
      setPassword(''); setConfirmPassword('');
      await enterAdministrator(administrator.id);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : '';
      setError(code === 'USERNAME_TAKEN' ? 'That username is already in use.' : code === 'USERNAME_POLICY' ? 'Username must be 3–32 characters: letters, numbers, dot, underscore, or hyphen.' : 'Registration could not be completed.');
    } finally { setBusy(false); }
  };

  const signInAdministrator = async () => {
    resetError(); setBusy(true);
    try {
      const result = await authenticateAdministrator(username, password);
      if (result.result !== 'ok' || !result.administrator) {
        setError(result.result === 'locked' ? 'Too many attempts. Try again in five minutes.' : 'Username or password is incorrect.');
        return;
      }
      setPassword('');
      await enterAdministrator(result.administrator.id);
    } catch { setError('Sign-in could not be completed.'); }
    finally { setBusy(false); }
  };

  const submitFamily = async () => {
    resetError();
    if (!familyName.trim()) { setError('Enter a family name.'); return; }
    setBusy(true);
    try {
      const saved = await createFamily(adminId, familyName, familyDescription);
      setFamily(saved); setMembers([]); setOnboarding(true); setScreen('onboardingMembers');
    } catch { setError('Family could not be saved. Please sign in again and retry.'); }
    finally { setBusy(false); }
  };

  const openNewMember = (editing?: FamilyMember) => {
    setMember(editing ?? null);
    setFullName(editing?.fullName ?? '');
    setAgeGroup(editing?.ageGroup ?? 'child');
    setAvatar(editing?.avatar ?? 'sprout');
    setPin(''); setPinConfirm(''); resetError(); setScreen('memberForm');
  };

  const submitMember = async () => {
    if (!family) return;
    resetError();
    if (!fullName.trim()) { setError('Enter the member’s full name.'); return; }
    if ((!member || pin.length > 0) && !/^\d{6,8}$/.test(pin)) { setError('PIN must contain 6 to 8 digits.'); return; }
    if (pin && pin !== pinConfirm) { setError('PINs do not match.'); return; }
    if (member && pin) {
      requestReauthentication('Confirm administrator password to reset this member PIN.', async () => {
        if (!family) return;
        await updateMember(adminId, family.id, member.id, { fullName, ageGroup, avatar, pin });
        setMembers(await listMembers(family.id));
      });
      return;
    }
    setBusy(true);
    try {
      if (member) {
        await updateMember(adminId, family.id, member.id, { fullName, ageGroup, avatar, pin: pin || undefined });
      } else {
        await addMember(adminId, family.id, { fullName, ageGroup, avatar, pin });
      }
      setMembers(await listMembers(family.id)); setScreen(onboarding ? 'onboardingMembers' : 'dashboard');
    } catch (cause) { setError(cause instanceof Error && cause.message === 'PIN_TAKEN' ? 'That PIN is already assigned to another member. Choose a different PIN.' : 'The profile could not be saved. Check your administrator session and try again.'); }
    finally { setBusy(false); }
  };

  const deleteMember = (target: FamilyMember) => Alert.alert('Remove member?', `Remove ${target.fullName} and their local PIN?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => {
      requestReauthentication('Confirm administrator password to remove this profile.', async () => {
        if (!family) return;
        await removeMember(adminId, family.id, target.id); setMembers(await listMembers(family.id));
      });
    } },
  ]);

  const saveFamilySettings = async () => {
    if (!family) return;
    setBusy(true); resetError();
    try { const saved = await updateFamily(adminId, family.id, familyName, familyDescription); setFamily(saved); setScreen('dashboard'); }
    catch { setError('Could not update family settings.'); }
    finally { setBusy(false); }
  };

  const openIdentity = async () => {
    const activeFamily = family ?? await loadExistingFamily();
    if (activeFamily) {
      setFamily(activeFamily);
      setMembers(await listMembers(activeFamily.id));
    }
    resetError(); setScreen('identity');
  };

  const verifyMember = async () => {
    if (!identityMember) return;
    setBusy(true); resetError();
    try {
      const result = await authenticateMember(identityMember.id, pin);
      if (result !== 'ok') { setError(result === 'locked' ? 'This profile is temporarily locked. Try again in five minutes.' : 'PIN is incorrect or this member requires administrator setup.'); return; }
      setPermissions(await loadPermissions(identityMember.id)); setPin(''); setScreen('memberHome');
    } catch { setError('Member verification could not be completed.'); }
    finally { setBusy(false); }
  };

  const togglePermission = async (key: string) => {
    if (!family || !permissionTarget) return;
    const next = !permissions[key];
    try { await savePermission(adminId, family.id, permissionTarget.id, key, next); setPermissions((current) => ({ ...current, [key]: next })); }
    catch { setError('Administrator authorization expired. Sign in again to change permissions.'); }
  };

  const openPermissions = async (target: FamilyMember) => {
    setPermissionTarget(target); setPermissions(await loadPermissions(target.id)); resetError(); setScreen('permissionsSettings');
  };

  const updateAdminPassword = async () => {
    if (!passwordIsStrong(nextPassword)) { setError('Your password must contain at least 8 characters.'); return; }
    if (nextPassword !== nextPasswordConfirm) { setError('New passwords do not match.'); return; }
    setBusy(true); resetError();
    try { await changeAdministratorPassword(adminId, username, password, nextPassword); setPassword(''); setNextPassword(''); setNextPasswordConfirm(''); setError('Password updated successfully.'); }
    catch { setError('Current password is incorrect, or the administrator session expired.'); }
    finally { setBusy(false); }
  };

  const logout = () => {
    lockAdministrator(); setAdminId(''); setUsername(''); setPassword(''); setFamily(null); setMember(null); setIdentityMember(null); setPermissions({}); setOnboarding(false); resetError(); setScreen('welcome');
  };

  if (!ready) return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={palette.forest} /><Text style={styles.muted}>Preparing Nest…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {screen === 'welcome' && <View style={styles.welcome}>
            <Brand />
            <WelcomeArtwork />
            <View style={styles.welcomeCopy}><Text style={styles.eyebrow}>A MORE THOUGHTFUL SHARED DEVICE</Text><Text style={styles.title}>A little space for everyone.</Text><Text style={styles.body}>Nest gives each person in your family a personal, age-aware way to use one device.</Text></View>
            {bootstrapError ? <InlineError text={bootstrapError} /> : null}
            <View style={styles.actions}><PrimaryButton title="Create a new family" onPress={() => { resetError(); setUsername(''); setPassword(''); setConfirmPassword(''); setScreen('register'); }} /><SecondaryButton title="Administrator sign in" onPress={() => { resetError(); setUsername(''); setPassword(''); setScreen('adminLogin'); }} /><SecondaryButton title="Member sign in" onPress={openIdentity} /></View>
            <Text style={styles.footer}>Your family stays on this device.</Text>
          </View>}

          {screen === 'register' && <FormShell onBack={logout} eyebrow="SETUP · STEP 1 OF 4" title="Start with your account." subtitle="Your administrator account protects the family space and its settings.">
            <Progress step={1} />
            <Field label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" autoCapitalize="none" />
            <SecretField label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
            <SecretField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter it again" />
            <PasswordStrength password={password} />
            <Text style={styles.hint}>Your password must contain at least 8 characters.</Text>
            <InlineError text={error} /><PrimaryButton title="Continue" onPress={register} loading={busy} disabled={!/^[A-Za-z0-9._-]{3,32}$/.test(username.trim()) || !passwordIsStrong(password) || password !== confirmPassword} />
          </FormShell>}

          {screen === 'adminLogin' && <FormShell onBack={() => setScreen('welcome')} eyebrow="ADMINISTRATOR SIGN IN" title="Welcome back." subtitle="Sign in with the administrator username and password to manage your family.">
            <Field label="Username" value={username} onChangeText={setUsername} placeholder="Your username" autoCapitalize="none" />
            <SecretField label="Password" value={password} onChangeText={setPassword} placeholder="Your password" />
            <InlineError text={error} /><PrimaryButton title="Sign in" onPress={signInAdministrator} loading={busy} />
            <SecondaryButton title="Create an administrator account" onPress={() => { resetError(); setScreen('register'); }} />
          </FormShell>}

          {screen === 'familySetup' && <FormShell onBack={() => setScreen('register')} eyebrow="SETUP · STEP 2 OF 4" title="Give your family a name." subtitle="This family belongs to the administrator account you just created.">
            <Progress step={2} />
            <Field label="Family name" value={familyName} onChangeText={setFamilyName} placeholder="The Mokoena family" />
            <Field label="Description · optional" value={familyDescription} onChangeText={setFamilyDescription} placeholder="A short note about your family" multiline />
            <InlineError text={error} /><PrimaryButton title="Create family" onPress={submitFamily} loading={busy} />
          </FormShell>}

          {screen === 'onboardingMembers' && family && <FormShell onBack={() => setScreen('familySetup')} eyebrow="SETUP · STEP 3 OF 4" title="Make it personal." subtitle="Add the people who use this device. Each person has a separate local identity.">
            <Progress step={3} />
            {members.map((item) => <MemberCard key={item.id} item={item} onEdit={() => openNewMember(item)} onPermissions={() => {}} onRemove={() => deleteMember(item)} />)}
            <SecondaryButton title="Add a family member" onPress={() => openNewMember()} />
            <Text style={styles.hint}>Facial verification is unavailable until genuine local biometric verification is implemented. PIN is used for sign-in.</Text>
            <PrimaryButton title="Review family" onPress={() => setScreen('onboardingReview')} />
          </FormShell>}

          {screen === 'onboardingReview' && family && <FormShell onBack={() => setScreen('onboardingMembers')} eyebrow="SETUP · STEP 4 OF 4" title="Ready to create your Nest." subtitle="Review your family before finishing. You can edit profiles later in Family settings.">
            <Progress step={4} />
            <View style={styles.reviewBlock}><Text style={styles.reviewLabel}>ADMINISTRATOR</Text><Text style={styles.reviewValue}>{username}</Text><Text style={styles.reviewLabel}>FAMILY</Text><Text style={styles.reviewValue}>{family.familyName}</Text><Text style={styles.reviewLabel}>MEMBERS</Text><Text style={styles.reviewValue}>{members.length ? members.map((item) => item.fullName).join(', ') : 'No members added yet'}</Text></View>
            <PrimaryButton title="Finish setup" onPress={() => { setOnboarding(false); setScreen('dashboard'); }} />
          </FormShell>}

          {screen === 'dashboard' && family && <View style={styles.dashboard}>
            <View style={styles.topBar}><Brand compact /><TouchableOpacity onPress={logout}><Text style={styles.link}>Sign out</Text></TouchableOpacity></View>
            <Text style={styles.eyebrow}>FAMILY OVERVIEW</Text><Text style={styles.title}>{family.familyName}</Text>
            {!!family.description && <Text style={styles.body}>{family.description}</Text>}
            <View style={styles.summary}><View><Text style={styles.summaryCount}>{members.length}</Text><Text style={styles.summaryLabel}>{members.length === 1 ? 'member' : 'members'}</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryCount}>On device</Text><Text style={styles.summaryLabel}>offline storage</Text></View></View>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Family members</Text><TouchableOpacity onPress={() => openNewMember()}><Text style={styles.link}>Add member +</Text></TouchableOpacity></View>
            {members.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your family starts here.</Text><Text style={styles.body}>Add a member profile, then choose a PIN and permissions for them.</Text></View> : members.map((item) => <MemberCard key={item.id} item={item} onEdit={() => openNewMember(item)} onPermissions={() => openPermissions(item)} onRemove={() => deleteMember(item)} />)}
            <Text style={styles.sectionTitle}>Manage</Text>
            <View style={styles.manageRow}><ManageButton label="Family settings" onPress={() => setScreen('familySettings')} /><ManageButton label="Account security" onPress={() => { setError(''); setPassword(''); setNextPassword(''); setScreen('accountSettings'); }} /></View>
            <SecondaryButton title="Switch to member sign in" onPress={openIdentity} />
          </View>}

          {screen === 'memberForm' && <FormShell onBack={() => setScreen(onboarding ? 'onboardingMembers' : 'dashboard')} eyebrow={member ? 'EDIT PROFILE' : 'NEW MEMBER'} title={member ? 'Update their profile.' : 'Add a family member.'} subtitle="Each member gets their own local profile and permissions.">
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Member’s full name" />
            <Text style={styles.label}>Age group</Text><ChoiceRow options={[[ 'child', 'Child' ], [ 'teen', 'Teen' ], [ 'adult', 'Adult' ]]} selected={ageGroup} onSelect={(value) => setAgeGroup(value as AgeGroup)} />
            <Text style={styles.label}>Profile avatar</Text><AvatarRow selected={avatar} onSelect={setAvatar} />
            <Text style={styles.label}>Sign-in method</Text><View style={styles.optionActive}><View><Text style={styles.optionTitle}>Personal PIN</Text><Text style={styles.hint}>Available · 6 to 8 digits</Text></View><Text style={styles.check}>Selected</Text></View>
            <View style={styles.optionDisabled}><View><Text style={styles.optionTitleMuted}>Facial recognition</Text><Text style={styles.hint}>Not available yet · local identity model required</Text></View></View>
            <SecretField label={member ? 'Reset PIN · optional' : 'Member PIN'} value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 8))} placeholder={member ? 'Leave blank to keep current PIN' : 'Create a PIN'} numeric />
            {(pin.length > 0 || !member) && <SecretField label="Confirm PIN" value={pinConfirm} onChangeText={(value) => setPinConfirm(value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter the PIN again" numeric />}
            <Text style={styles.hint}>PINs are salted and hashed locally. They are never shown again.</Text>
            <InlineError text={error} /><PrimaryButton title={member ? 'Save profile' : 'Add member'} onPress={submitMember} loading={busy} />
          </FormShell>}

          {screen === 'identity' && <FormShell onBack={() => setScreen('dashboard')} eyebrow="MEMBER SIGN IN" title="Who’s using Nest?" subtitle="Select your profile, then verify with its PIN. Unknown users can use restricted guest access.">
            {members.length === 0 && <View style={styles.empty}><Text style={styles.body}>There are no member profiles yet.</Text></View>}
            {members.map((item) => <TouchableOpacity key={item.id} style={styles.identityCard} onPress={() => { setIdentityMember(item); setPin(''); resetError(); setScreen('memberLogin'); }}><Avatar name={item.fullName} value={item.avatar} /><View style={styles.memberDetails}><Text style={styles.memberName}>{item.fullName}</Text><Text style={styles.memberMeta}>{item.ageGroup} · {item.authMethod === 'pin' ? 'PIN' : 'Face sign-in unavailable'}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>)}
            <InlineError text={error} /><SecondaryButton title="Restricted guest access" onPress={() => { setIdentityMember(null); setScreen('memberHome'); }} />
          </FormShell>}

          {screen === 'memberLogin' && identityMember && <FormShell onBack={() => setScreen('identity')} eyebrow="PROFILE VERIFICATION" title={`Hello, ${identityMember.fullName.split(' ')[0]}.`} subtitle="Enter your personal PIN to open your member experience.">
            <SecretField label="6 to 8 digit PIN" value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 8))} placeholder="Enter your PIN" numeric />
            <InlineError text={error} /><PrimaryButton title="Verify and continue" onPress={verifyMember} loading={busy} />
          </FormShell>}

          {screen === 'memberHome' && <FormShell onBack={() => { setIdentityMember(null); setScreen('identity'); }} eyebrow={identityMember ? 'YOUR SPACE' : 'RESTRICTED GUEST'} title={identityMember ? `Welcome, ${identityMember.fullName.split(' ')[0]}.` : 'Guest access.'} subtitle={identityMember ? `Your ${identityMember.ageGroup} profile is active. These are your saved preferences; device enforcement is platform dependent.` : 'Nest could not verify a family member, so no member profile or permissions were activated.'}>
            {identityMember && <View style={styles.permissions}><Text style={styles.sectionTitle}>Your permissions</Text>{permissionLabels.map(([key, label]) => <View key={key} style={styles.permissionRow}><Text style={styles.body}>{label}</Text><Text style={styles.permissionValue}>{permissions[key] === undefined ? 'Family default' : permissions[key] ? 'Allowed' : 'Restricted'}</Text></View>)}</View>}
            <PrimaryButton title="Finish" onPress={() => { setIdentityMember(null); setScreen('welcome'); }} />
          </FormShell>}

          {screen === 'familySettings' && family && <FormShell onBack={() => setScreen('dashboard')} eyebrow="FAMILY SETTINGS" title="Your family details." subtitle="Only the signed-in administrator can change these details.">
            <Field label="Family name" value={familyName} onChangeText={setFamilyName} placeholder="Family name" />
            <Field label="Description · optional" value={familyDescription} onChangeText={setFamilyDescription} placeholder="A short note" multiline />
            <InlineError text={error} /><PrimaryButton title="Save family settings" onPress={saveFamilySettings} loading={busy} />
          </FormShell>}

          {screen === 'accountSettings' && <FormShell onBack={() => setScreen('dashboard')} eyebrow="ACCOUNT SECURITY" title="Change administrator password." subtitle="Confirm your current password to save a new one.">
            <SecretField label="Current password" value={password} onChangeText={setPassword} placeholder="Current password" />
            <SecretField label="New password" value={nextPassword} onChangeText={setNextPassword} placeholder="At least 8 characters" />
            <SecretField label="Confirm new password" value={nextPasswordConfirm} onChangeText={setNextPasswordConfirm} placeholder="Enter new password again" />
            <PasswordStrength password={nextPassword} />
            <InlineError text={error} /><PrimaryButton title="Update password" onPress={updateAdminPassword} loading={busy} />
          </FormShell>}

          {screen === 'reauth' && <FormShell onBack={() => { setPendingAction(null); setScreen('dashboard'); }} eyebrow="SECURITY CHECK" title="Confirm it’s you." subtitle={reauthReason}>
            <SecretField label="Administrator password" value={reauthPassword} onChangeText={setReauthPassword} placeholder="Enter your current password" />
            <InlineError text={error} /><PrimaryButton title="Confirm and continue" onPress={confirmReauthentication} loading={busy} />
          </FormShell>}

          {screen === 'permissionsSettings' && permissionTarget && <FormShell onBack={() => setScreen('dashboard')} eyebrow="MEMBER PERMISSIONS" title={`${permissionTarget.fullName.split(' ')[0]}’s boundaries.`} subtitle="These are saved local preferences. Enforcing application restrictions requires supported device management privileges.">
            {permissionLabels.map(([key, label]) => <TouchableOpacity key={key} style={styles.manageButton} onPress={() => togglePermission(key)}><Text style={styles.manageText}>{label}</Text><Text style={styles.permissionValue}>{permissions[key] === undefined ? 'Age default' : permissions[key] ? 'Allowed' : 'Restricted'}</Text></TouchableOpacity>)}
            <InlineError text={error} />
          </FormShell>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={[styles.brand, compact && styles.brandCompact]}><View style={[styles.mark, compact && styles.markCompact]}><View style={styles.roofLeft} /><View style={styles.roofRight} /><View style={styles.door} /></View><Text style={[styles.brandText, compact && styles.brandTextCompact]}>nest</Text></View>;
}

function WelcomeArtwork() {
  return <View accessibilityLabel="A connected family in a calm home" style={styles.artwork}><View style={styles.artGlow} /><View style={styles.artHome}><View style={styles.artRoof} /><View style={styles.artDoor} /></View><View style={[styles.person, styles.personOne]} /><View style={[styles.person, styles.personTwo]} /><View style={[styles.person, styles.personThree]} /><View style={styles.artSignal}><View style={styles.signalDot} /><View style={styles.signalLine} /><View style={styles.signalLine} /></View></View>;
}

function Progress({ step }: { step: number }) {
  return <View accessibilityLabel={`Step ${step} of 4`} style={styles.progress}>{[1, 2, 3, 4].map((item) => <View key={item} style={[styles.progressSegment, item <= step && styles.progressSegmentActive]} />)}</View>;
}

function PasswordStrength({ password }: { password: string }) {
  const level = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const copy = ['', 'Too short', 'Good', 'Strong'][level];
  return <View style={styles.strength}><View style={styles.strengthBars}>{[1, 2, 3].map((item) => <View key={item} style={[styles.strengthBar, item <= level && styles.strengthBarActive]} />)}</View>{level > 0 && <Text style={styles.strengthText}>{copy}</Text>}</View>;
}

function FormShell({ children, eyebrow, title, subtitle, onBack }: { children: React.ReactNode; eyebrow: string; title: string; subtitle: string; onBack?: () => void }) {
  return <View style={styles.form}><View style={styles.formTop}>{onBack ? <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹  Back</Text></TouchableOpacity> : <Brand compact />}<Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.formTitle}>{title}</Text><Text style={styles.body}>{subtitle}</Text></View><View style={styles.formBody}>{children}</View></View>;
}

function Field({ label, value, onChangeText, placeholder, autoCapitalize = 'words', multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; autoCapitalize?: 'none' | 'words'; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.multiline]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.slate} autoCapitalize={autoCapitalize} autoCorrect={false} multiline={multiline} returnKeyType="next" /></View>;
}

function SecretField({ label, value, onChangeText, placeholder, numeric = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; numeric?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.secretWrap}><TextInput style={styles.secretInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.slate} secureTextEntry={!visible} keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize="none" autoCorrect={false} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? 'Hide secret' : 'Show secret'} onPress={() => setVisible((current) => !current)} style={styles.visibility}><Text style={styles.visibilityText}>{visible ? 'Hide' : 'Show'}</Text></TouchableOpacity></View></View>;
}

function PrimaryButton({ title, onPress, loading = false, disabled = false }: { title: string; onPress: () => void | Promise<void>; loading?: boolean; disabled?: boolean }) {
  return <TouchableOpacity style={[styles.primary, (loading || disabled) && styles.buttonBusy]} onPress={onPress} disabled={loading || disabled} activeOpacity={0.84}><Text style={styles.primaryText}>{loading ? 'Please wait…' : title}</Text>{!loading && <Text style={styles.primaryArrow}>→</Text>}</TouchableOpacity>;
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void | Promise<void> }) {
  return <TouchableOpacity style={styles.secondary} onPress={onPress} activeOpacity={0.75}><Text style={styles.secondaryText}>{title}</Text></TouchableOpacity>;
}

function ChoiceRow({ options, selected, onSelect }: { options: [string, string][]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.choiceRow}>{options.map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceSelected]}><Text style={[styles.choiceText, selected === value && styles.choiceTextSelected]}>{label}</Text></TouchableOpacity>)}</View>;
}

function AvatarRow({ selected, onSelect }: { selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.avatarRow}>{avatars.map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: value === selected }} onPress={() => onSelect(value)} style={[styles.avatarChoice, value === selected && styles.avatarChoiceSelected]}><Text style={styles.avatarGlyph}>{avatarGlyph[value]}</Text></TouchableOpacity>)}</View>;
}

function Avatar({ name, value }: { name: string; value: string }) {
  return <View style={styles.avatar}><Text style={styles.avatarGlyph}>{avatarGlyph[value] ?? name.slice(0, 1).toUpperCase()}</Text></View>;
}

function MemberCard({ item, onEdit, onPermissions, onRemove }: { item: FamilyMember; onEdit: () => void; onPermissions: () => void; onRemove: () => void }) {
  return <View style={styles.memberCard}><Avatar name={item.fullName} value={item.avatar} /><View style={styles.memberDetails}><Text style={styles.memberName}>{item.fullName}</Text><Text style={styles.memberMeta}>{item.ageGroup} · {item.authMethod === 'pin' ? 'PIN protected' : 'Face unavailable'}</Text></View><TouchableOpacity onPress={onPermissions} style={styles.iconAction}><Text style={styles.iconText}>Rules</Text></TouchableOpacity><TouchableOpacity onPress={onEdit} style={styles.iconAction}><Text style={styles.iconText}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={onRemove} style={styles.iconAction}><Text style={styles.removeText}>×</Text></TouchableOpacity></View>;
}

function ManageButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.manageButton} onPress={onPress}><Text style={styles.manageText}>{label}</Text><Text style={styles.chevron}>›</Text></TouchableOpacity>;
}

function InlineError({ text }: { text: string }) {
  return text ? <Text accessibilityRole="alert" style={[styles.error, text.includes('successfully') && styles.success]}>{text}</Text> : null;
}

const palette = { paper: '#F6F5F0', white: '#FFFFFF', forest: '#193D36', forestLight: '#315F52', ink: '#1D2E2A', slate: '#89938E', line: '#E2E5DF', sage: '#E5EEE8', muted: '#F0F1EC', red: '#B6403C', amber: '#C28345' };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.paper }, flex: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 22 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }, muted: { color: palette.slate, fontSize: 14 },
  welcome: { flex: 1, justifyContent: 'space-between', paddingVertical: 22 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandCompact: { marginBottom: 20 }, mark: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.forest, alignItems: 'center', justifyContent: 'center', position: 'relative' }, markCompact: { width: 34, height: 34, borderRadius: 11 }, roofLeft: { position: 'absolute', width: 14, height: 14, borderLeftWidth: 2.5, borderTopWidth: 2.5, borderColor: palette.white, transform: [{ rotate: '45deg' }], top: 10, left: 10 }, roofRight: { position: 'absolute', width: 14, height: 14, borderRightWidth: 2.5, borderTopWidth: 2.5, borderColor: palette.white, transform: [{ rotate: '-45deg' }], top: 10, right: 10 }, door: { position: 'absolute', width: 9, height: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: palette.sage, bottom: 7 }, brandText: { color: palette.forest, fontWeight: '800', fontSize: 25, letterSpacing: -1.1 }, brandTextCompact: { fontSize: 21 },
  artwork: { height: 168, marginTop: 22, backgroundColor: '#DDE8DE', overflow: 'hidden', borderRadius: 24, position: 'relative', justifyContent: 'flex-end', alignItems: 'center' }, artGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#C5D8C6', top: -92 }, artHome: { width: 138, height: 74, backgroundColor: palette.forest, borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: 19, alignItems: 'center' }, artRoof: { position: 'absolute', top: -42, width: 0, height: 0, borderLeftWidth: 82, borderRightWidth: 82, borderBottomWidth: 43, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: palette.forest }, artDoor: { position: 'absolute', bottom: 0, width: 30, height: 43, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#A9BBAA' }, person: { position: 'absolute', width: 25, height: 45, borderRadius: 14, backgroundColor: '#708F7B', bottom: 19 }, personOne: { left: 45, height: 55, backgroundColor: '#315F52' }, personTwo: { right: 52, height: 62, backgroundColor: '#5C7E69' }, personThree: { right: 29, width: 17, height: 34, backgroundColor: '#91A895' }, artSignal: { position: 'absolute', top: 20, right: 25, flexDirection: 'row', alignItems: 'center', gap: 4 }, signalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.forest }, signalLine: { width: 17, height: 2, backgroundColor: palette.forest, transform: [{ rotate: '-28deg' }] },
  welcomeCopy: { marginTop: 30, marginBottom: 30 }, eyebrow: { color: palette.forestLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 14 }, title: { color: palette.ink, fontSize: 35, fontWeight: '700', letterSpacing: -1.2, lineHeight: 42, maxWidth: 340 }, body: { color: '#69756F', fontSize: 15, lineHeight: 23, marginTop: 12 }, actions: { gap: 6 }, footer: { textAlign: 'center', color: palette.slate, fontSize: 12, marginTop: 25 },
  form: { flex: 1, justifyContent: 'center', paddingVertical: 12 }, formTop: { marginBottom: 22 }, formBody: { gap: 3 }, back: { color: palette.forest, fontSize: 15, fontWeight: '700', marginBottom: 28, paddingVertical: 7 }, formTitle: { color: palette.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 34 }, field: { marginBottom: 9 }, label: { color: palette.ink, fontSize: 13, fontWeight: '700', marginBottom: 8 }, input: { minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, paddingHorizontal: 15, fontSize: 15, color: palette.ink }, secretWrap: { minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center' }, secretInput: { flex: 1, minHeight: 52, paddingLeft: 15, fontSize: 15, color: palette.ink }, visibility: { paddingHorizontal: 14, minHeight: 52, justifyContent: 'center' }, visibilityText: { color: palette.forest, fontWeight: '700', fontSize: 13 }, multiline: { minHeight: 90, paddingTop: 13, textAlignVertical: 'top' }, hint: { color: palette.slate, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 8 }, error: { color: palette.red, fontSize: 13, lineHeight: 19, marginVertical: 8 }, success: { color: palette.forestLight }, progress: { flexDirection: 'row', gap: 6, marginBottom: 20 }, progressSegment: { height: 4, flex: 1, backgroundColor: palette.line, borderRadius: 2 }, progressSegmentActive: { backgroundColor: palette.forest }, strength: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -2, marginBottom: 6 }, strengthBars: { flexDirection: 'row', gap: 4 }, strengthBar: { width: 27, height: 3, borderRadius: 2, backgroundColor: palette.line }, strengthBarActive: { backgroundColor: palette.forestLight }, strengthText: { color: palette.slate, fontSize: 12, fontWeight: '700' }, reviewBlock: { backgroundColor: palette.white, borderLeftWidth: 3, borderLeftColor: palette.forest, padding: 18, marginBottom: 12 }, reviewLabel: { color: palette.slate, fontSize: 10, letterSpacing: 1.2, fontWeight: '800', marginTop: 4 }, reviewValue: { color: palette.ink, fontSize: 15, fontWeight: '600', marginTop: 5, marginBottom: 15 },
  primary: { minHeight: 56, borderRadius: 15, backgroundColor: palette.forest, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 20, position: 'relative' }, primaryText: { color: palette.white, fontSize: 15, fontWeight: '700' }, primaryArrow: { position: 'absolute', right: 18, color: palette.white, fontSize: 20 }, buttonBusy: { opacity: 0.72 }, secondary: { minHeight: 50, justifyContent: 'center', alignItems: 'center', marginTop: 3, paddingHorizontal: 10 }, secondaryText: { color: palette.forest, fontSize: 14, fontWeight: '700' },
  dashboard: { paddingTop: 6, paddingBottom: 30 }, topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 }, link: { color: palette.forestLight, fontWeight: '700', fontSize: 13 }, summary: { backgroundColor: palette.sage, borderRadius: 17, minHeight: 92, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, marginTop: 23, marginBottom: 28 }, summaryCount: { color: palette.forest, fontSize: 19, fontWeight: '800' }, summaryLabel: { color: '#65766D', fontSize: 12, marginTop: 4 }, summaryDivider: { width: 1, height: 42, backgroundColor: '#CAD8CE', marginHorizontal: 27 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }, sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 6 }, empty: { padding: 19, borderRadius: 16, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, marginBottom: 18 }, emptyTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' }, memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderColor: palette.line, borderWidth: 1, borderRadius: 15, minHeight: 76, padding: 12, marginBottom: 9 }, avatar: { height: 44, width: 44, borderRadius: 15, backgroundColor: palette.sage, alignItems: 'center', justifyContent: 'center' }, avatarGlyph: { color: palette.forest, fontSize: 21, fontWeight: '700' }, memberDetails: { flex: 1, marginLeft: 12 }, memberName: { color: palette.ink, fontWeight: '700', fontSize: 14 }, memberMeta: { color: palette.slate, fontSize: 12, marginTop: 4, textTransform: 'capitalize' }, iconAction: { minWidth: 32, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, iconText: { color: palette.forestLight, fontSize: 12, fontWeight: '700' }, removeText: { color: palette.red, fontSize: 22, fontWeight: '400' }, manageRow: { gap: 8, marginBottom: 15 }, manageButton: { minHeight: 54, paddingHorizontal: 15, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, manageText: { color: palette.ink, fontSize: 14, fontWeight: '600' }, chevron: { color: palette.slate, fontSize: 23 },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 8 }, choice: { flex: 1, minHeight: 45, borderWidth: 1, borderColor: palette.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white }, choiceSelected: { borderColor: palette.forestLight, backgroundColor: palette.sage }, choiceText: { color: '#6C7973', fontSize: 13, fontWeight: '600' }, choiceTextSelected: { color: palette.forest, fontWeight: '700' }, avatarRow: { flexDirection: 'row', gap: 12, marginBottom: 8 }, avatarChoice: { width: 47, height: 47, borderRadius: 15, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line }, avatarChoiceSelected: { backgroundColor: palette.sage, borderColor: palette.forestLight }, optionActive: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: palette.sage, borderRadius: 13, borderWidth: 1, borderColor: '#C8D9CE', marginBottom: 8 }, optionDisabled: { padding: 14, backgroundColor: palette.muted, borderRadius: 13, opacity: 0.8, marginBottom: 3 }, optionTitle: { color: palette.forest, fontWeight: '700', fontSize: 14 }, optionTitleMuted: { color: '#69756F', fontWeight: '700', fontSize: 14 }, check: { color: palette.forestLight, fontSize: 12, fontWeight: '700' },
  identityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 12, marginBottom: 9, minHeight: 70 }, permissions: { padding: 17, backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, marginTop: 10, marginBottom: 12 }, permissionRow: { minHeight: 42, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, permissionValue: { color: palette.forestLight, fontSize: 12, fontWeight: '700' },
});
