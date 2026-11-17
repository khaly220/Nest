import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  addMember,
  authenticateAdministrator,
  authenticateMember,
  changeAdministratorPassword,
  createFamily as createFamilyRecord,
  findFamily,
  listMembers,
  loadExistingFamily,
  lockAdministrator,
  prepareLocalStore,
  registerAdministrator,
  removeMember,
  updateFamily as updateFamilyRecord,
  updateMember,
} from '@/data/familyStore';
import { applyMemberRestrictions, clearMemberRestrictions } from '@/data/services/accessService';
import type { Family, FamilyMember } from '@/data/familyStore';
import type { ActionResult, AgeGroup } from '@/types';

export type Administrator = { id: string; username: string };
export type MemberDraft = { fullName: string; ageGroup: AgeGroup; avatar: string; pin?: string };

type ReauthState = { reason: string } | null;
type AddMemberResult = { ok: true; member: FamilyMember } | { ok: false; error: string };

type SessionValue = {
  /** False until the encrypted local store has been opened. */
  ready: boolean;
  bootstrapError: string;

  admin: Administrator | null;
  family: Family | null;
  members: FamilyMember[];
  memberNames: Record<string, string>;

  /** Member currently signed in on this device, if any. */
  activeMember: FamilyMember | null;
  /** Member session awaiting PIN verification after Nest left the foreground. */
  lockedMemberId: string | null;
  /** Warning when Android could not restore apps after administrator sign-in. */
  memberRestrictionWarning: string;
  /** True when the administrator session expired and a password is needed again. */
  sessionExpired: boolean;

  reauth: { visible: boolean; reason: string; busy: boolean; error: string };

  registerAdministrator: (username: string, password: string) => Promise<ActionResult>;
  signInAdministrator: (username: string, password: string) => Promise<ActionResult>;
  createFamily: (familyName: string, description: string) => Promise<ActionResult>;
  saveFamilyDetails: (familyName: string, description: string) => Promise<ActionResult>;
  refreshMembers: () => Promise<FamilyMember[]>;
  /** Loads the family that already exists on this device without an admin session. */
  loadStoredFamily: () => Promise<Family | null>;
  addMemberProfile: (draft: MemberDraft & { pin: string }) => Promise<AddMemberResult>;
  updateMemberProfile: (memberId: string, draft: MemberDraft) => Promise<ActionResult>;
  removeMemberProfile: (memberId: string) => Promise<ActionResult>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<ActionResult>;
  signOutAdministrator: () => void;

  signInMember: (memberId: string, pin: string) => Promise<ActionResult>;
  signOutMember: () => Promise<void>;

  requestReauthentication: (reason: string, run: () => Promise<void>) => void;
  submitReauthentication: (password: string) => Promise<void>;
  cancelReauthentication: () => void;
  clearSessionExpired: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

const isAuthRequired = (cause: unknown) => cause instanceof Error && cause.message === 'ADMIN_AUTH_REQUIRED';

function friendlyError(cause: unknown, fallback: string) {
  const code = cause instanceof Error ? cause.message : '';
  switch (code) {
    case 'USERNAME_TAKEN':
      return 'That username is already in use on this device.';
    case 'USERNAME_POLICY':
      return 'Usernames need 3–32 characters: letters, numbers, dot, underscore or hyphen.';
    case 'PASSWORD_POLICY':
      return 'Your password must contain at least 8 characters.';
    case 'PASSWORD_HASH_FAILED':
    case 'ADMINISTRATOR_INSERT_FAILED':
      return 'The account could not be saved. Please try again.';
    case 'PIN_TAKEN':
      return 'That PIN is already assigned to another member. Choose a different PIN.';
    case 'PIN_POLICY':
      return 'PINs must contain 6 to 8 digits.';
    case 'FAMILY_NOT_FOUND':
      return 'No family is linked to this account on this device.';
    case 'MEMBER_NOT_FOUND':
      return 'That member profile is no longer available.';
    case 'AUTH_FAILED':
      return 'The current password is incorrect.';
    default:
      return fallback;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');
  const [admin, setAdmin] = useState<Administrator | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null);
  const [lockedMemberId, setLockedMemberId] = useState<string | null>(null);
  const [memberRestrictionWarning, setMemberRestrictionWarning] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingReauth, setPendingReauth] = useState<ReauthState>(null);
  const [reauthRun, setReauthRun] = useState<(() => Promise<void>) | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthError, setReauthError] = useState('');

  useEffect(() => {
    if (!activeMember) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') return;
      setLockedMemberId(activeMember.id);
      setActiveMember((current) => (current?.id === activeMember.id ? null : current));
    });
    return () => subscription.remove();
  }, [activeMember]);

  useEffect(() => {
    let mounted = true;
    prepareLocalStore()
      .then(async () => {
        const storedFamily = await loadExistingFamily();
        if (!mounted || !storedFamily) return;
        setFamily(storedFamily);
        setMembers(await listMembers(storedFamily.id));
      })
      .catch(() =>
        mounted &&
        setBootstrapError(
          'Nest could not open its local database. Please restart the app; if it continues, reinstall the development build.',
        ),
      )
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const refreshMembers = useCallback(async () => {
    if (!family) {
      setMembers([]);
      return [];
    }
    const next = await listMembers(family.id);
    setMembers(next);
    return next;
  }, [family]);

  const loadFamilyIntoSession = useCallback(async (target: Family) => {
    setFamily(target);
    setMembers(await listMembers(target.id));
  }, []);

  const loadStoredFamily = useCallback(async () => {
    const stored = await loadExistingFamily();
    if (stored) await loadFamilyIntoSession(stored);
    return stored;
  }, [loadFamilyIntoSession]);

  const enterAdministrator = useCallback(
    async (administrator: Administrator) => {
      const savedFamily = await findFamily(administrator.id);
      const savedMembers = savedFamily ? await listMembers(savedFamily.id) : [];
      setAdmin(administrator);
      setSessionExpired(false);
      setFamily(savedFamily);
      setMembers(savedMembers);
      setLockedMemberId(null);
      setActiveMember(null);
      try {
        await clearMemberRestrictions();
        setMemberRestrictionWarning('');
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Unknown error';
        console.error('[NestSession] Could not restore apps for administrator access', {
          errorName: cause instanceof Error ? cause.name : 'UnknownError',
          errorMessage: detail,
        });
        setMemberRestrictionWarning(
          `Administrator sign-in succeeded, but Nest could not restore app access from the previous member session: ${detail}`,
        );
      }
    },
    [],
  );

  const register = useCallback(
    async (username: string, password: string): Promise<ActionResult> => {
      try {
        const administrator = await registerAdministrator(username.trim(), password);
        await enterAdministrator(administrator);
        return { ok: true };
      } catch (cause) {
        return { ok: false, error: friendlyError(cause, 'Registration could not be completed.') };
      }
    },
    [enterAdministrator],
  );

  const signInAdministrator = useCallback(
    async (username: string, password: string): Promise<ActionResult> => {
      let stage: 'credential_check' | 'family_load' = 'credential_check';
      try {
        const result = await authenticateAdministrator(username.trim(), password);
        if (result.result !== 'ok' || !result.administrator) {
          return {
            ok: false,
            error: result.result === 'locked' ? 'Too many attempts. Try again in five minutes.' : 'Username or password is incorrect.',
          };
        }
        stage = 'family_load';
        await enterAdministrator(result.administrator);
        return { ok: true };
      } catch (cause) {
        console.error('[NestSession] Administrator sign-in failed', {
          stage,
          errorName: cause instanceof Error ? cause.name : 'UnknownError',
          errorMessage: cause instanceof Error ? cause.message : String(cause),
        });
        return {
          ok: false,
          error:
            stage === 'credential_check'
              ? 'Nest could not verify your account in the local database. Restart the app and try again.'
              : 'Your password was accepted, but Nest could not load the family data on this device. Please try again.',
        };
      }
    },
    [enterAdministrator],
  );

  const createFamily = useCallback(
    async (familyName: string, description: string): Promise<ActionResult> => {
      if (!admin) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        const saved = await createFamilyRecord(admin.id, familyName, description);
        setFamily(saved);
        setMembers([]);
        return { ok: true };
      } catch (cause) {
        return { ok: false, error: friendlyError(cause, 'The family could not be saved. Please try again.') };
      }
    },
    [admin],
  );

  const saveFamilyDetails = useCallback(
    async (familyName: string, description: string): Promise<ActionResult> => {
      if (!admin || !family) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        const saved = await updateFamilyRecord(admin.id, family.id, familyName, description);
        setFamily(saved);
        return { ok: true };
      } catch (cause) {
        if (isAuthRequired(cause)) {
          setSessionExpired(true);
          return { ok: false, error: 'Your administrator session expired. Confirm your password and try again.' };
        }
        return { ok: false, error: friendlyError(cause, 'Family details could not be updated.') };
      }
    },
    [admin, family],
  );

  const addMemberProfile = useCallback(
    async (draft: MemberDraft & { pin: string }): Promise<AddMemberResult> => {
      if (!admin || !family) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        const member = await addMember(admin.id, family.id, draft);
        setMembers((current) =>
          [...current, member].sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
        );
        return { ok: true, member };
      } catch (cause) {
        if (isAuthRequired(cause)) {
          setSessionExpired(true);
          return { ok: false, error: 'Your administrator session expired. Confirm your password and try again.' };
        }
        return { ok: false, error: friendlyError(cause, 'The member profile could not be saved.') };
      }
    },
    [admin, family],
  );

  const updateMemberProfile = useCallback(
    async (memberId: string, draft: MemberDraft): Promise<ActionResult> => {
      if (!admin || !family) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        await updateMember(admin.id, family.id, memberId, draft);
        await refreshMembers();
        return { ok: true };
      } catch (cause) {
        if (isAuthRequired(cause)) {
          setSessionExpired(true);
          return { ok: false, error: 'Your administrator session expired. Confirm your password and try again.' };
        }
        return { ok: false, error: friendlyError(cause, 'The member profile could not be updated.') };
      }
    },
    [admin, family, refreshMembers],
  );

  const removeMemberProfile = useCallback(
    async (memberId: string): Promise<ActionResult> => {
      if (!admin || !family) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        await removeMember(admin.id, family.id, memberId);
        await refreshMembers();
        return { ok: true };
      } catch (cause) {
        if (isAuthRequired(cause)) {
          setSessionExpired(true);
          return { ok: false, error: 'Your administrator session expired. Confirm your password and try again.' };
        }
        return { ok: false, error: friendlyError(cause, 'The member profile could not be removed.') };
      }
    },
    [admin, family, refreshMembers],
  );

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string): Promise<ActionResult> => {
      if (!admin) return { ok: false, error: 'Sign in as an administrator first.' };
      try {
        await changeAdministratorPassword(admin.id, admin.username, currentPassword, nextPassword);
        return { ok: true };
      } catch (cause) {
        if (isAuthRequired(cause)) {
          setSessionExpired(true);
          return { ok: false, error: 'Your administrator session expired. Confirm your password and try again.' };
        }
        return { ok: false, error: friendlyError(cause, 'The password could not be updated.') };
      }
    },
    [admin],
  );

  const signOutAdministrator = useCallback(() => {
    lockAdministrator();
    setAdmin(null);
    setActiveMember(null);
    setLockedMemberId(null);
    setMemberRestrictionWarning('');
    setSessionExpired(false);
    setPendingReauth(null);
    setReauthRun(null);
    setReauthError('');
  }, []);

  const signInMember = useCallback(
    async (memberId: string, pin: string): Promise<ActionResult> => {
      try {
        const result = await authenticateMember(memberId, pin);
        if (result !== 'ok') {
          return {
            ok: false,
            error:
              result === 'locked'
                ? 'This profile is temporarily locked. Try again in five minutes.'
                : result === 'not-configured'
                  ? 'This profile needs an administrator to set a PIN before it can sign in.'
                  : 'That PIN does not match this profile.',
          };
        }
        const pool = members.length ? members : family ? await listMembers(family.id) : [];
        const found = pool.find((item) => item.id === memberId) ?? null;
        if (!found) return { ok: false, error: 'That member profile is no longer available.' };
        if (AppState.currentState !== 'active') {
          setLockedMemberId(memberId);
          return { ok: false, error: 'Nest was interrupted during verification. Enter the PIN again when you return.' };
        }
        if (Platform.OS === 'android') {
          try {
            await applyMemberRestrictions(found.id, found.ageGroup);
          } catch (cause) {
            if (cause instanceof Error && cause.message === 'DEVICE_OWNER_REQUIRED') {
              return {
                ok: false,
                error:
                  'This device is not provisioned for app restrictions. An administrator must set it up as a fully managed Android device before member sign-in.',
              };
            }
            return {
              ok: false,
              error: `App restrictions could not be applied, so this profile was not opened. ${cause instanceof Error ? cause.message : 'Unknown error'}`,
            };
          }
        }
        if (AppState.currentState !== 'active') {
          setLockedMemberId(memberId);
          return { ok: false, error: 'Nest was interrupted during verification. Enter the PIN again when you return.' };
        }
        lockAdministrator();
        setAdmin(null);
        setActiveMember(found);
        setLockedMemberId(null);
        if (found && !members.length) setMembers(pool);
        return { ok: true };
      } catch (cause) {
        return { ok: false, error: friendlyError(cause, 'Verification could not be completed.') };
      }
    },
    [family, members],
  );

  const signOutMember = useCallback(async () => {
    await clearMemberRestrictions();
    setActiveMember(null);
    setLockedMemberId(null);
  }, []);

  const requestReauthentication = useCallback((reason: string, run: () => Promise<void>) => {
    setReauthError('');
    setReauthRun(() => run);
    setPendingReauth({ reason });
  }, []);

  const submitReauthentication = useCallback(
    async (password: string) => {
      if (!admin) {
        setReauthError('No administrator is signed in on this device.');
        return;
      }
      setReauthBusy(true);
      setReauthError('');
      try {
        const result = await authenticateAdministrator(admin.username, password);
        if (result.result !== 'ok') {
          setReauthError(result.result === 'locked' ? 'Too many attempts. Try again in five minutes.' : 'Administrator password is incorrect.');
          return;
        }
        const run = reauthRun;
        setPendingReauth(null);
        setReauthRun(null);
        try {
          await run?.();
        } catch {
          setReauthError('The protected action could not be completed.');
        }
      } catch {
        setReauthError('Verification could not be completed.');
      } finally {
        setReauthBusy(false);
      }
    },
    [admin, reauthRun],
  );

  const cancelReauthentication = useCallback(() => {
    setPendingReauth(null);
    setReauthRun(null);
    setReauthError('');
  }, []);

  const memberNames = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member.fullName])),
    [members],
  );

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      bootstrapError,
      admin,
      family,
      members,
      memberNames,
      activeMember,
      lockedMemberId,
      memberRestrictionWarning,
      sessionExpired,
      reauth: { visible: Boolean(pendingReauth), reason: pendingReauth?.reason ?? '', busy: reauthBusy, error: reauthError },
      registerAdministrator: register,
      signInAdministrator,
      createFamily,
      saveFamilyDetails,
      refreshMembers,
      loadStoredFamily,
      addMemberProfile,
      updateMemberProfile,
      removeMemberProfile,
      changePassword,
      signOutAdministrator,
      signInMember,
      signOutMember,
      requestReauthentication,
      submitReauthentication,
      cancelReauthentication,
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [
      ready, bootstrapError, admin, family, members, memberNames, activeMember, lockedMemberId, memberRestrictionWarning, sessionExpired,
      pendingReauth, reauthBusy, reauthError, register, signInAdministrator, createFamily,
      saveFamilyDetails, refreshMembers, loadStoredFamily, addMemberProfile, updateMemberProfile,
      removeMemberProfile, changePassword, signOutAdministrator, signInMember, signOutMember,
      requestReauthentication, submitReauthentication, cancelReauthentication,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useFamilySession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useFamilySession must be used inside a SessionProvider.');
  return value;
}

export function useMemberById(memberId: string | undefined) {
  const { members } = useFamilySession();
  return useMemo(() => members.find((member) => member.id === memberId) ?? null, [memberId, members]);
}
