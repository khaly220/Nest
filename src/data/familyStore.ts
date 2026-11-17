import bcrypt from 'bcryptjs';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export type Administrator = { id: string; username: string };
export type Family = { id: string; administratorId: string; familyName: string; description: string; createdAt: string };
export type FamilyMember = {
  id: string;
  familyId: string;
  fullName: string;
  ageGroup: 'child' | 'teen' | 'adult';
  avatar: string;
  authMethod: 'pin' | 'face';
  createdAt: string;
  hasCredential: boolean;
};
export type AuthResult = 'ok' | 'invalid' | 'locked' | 'not-configured';

const DB_NAME = 'nest.db';
const DB_VERSION = 3;
const DB_KEY_NAME = 'nest.sqlcipher.key.v2';
const BCRYPT_COST = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const ADMIN_SESSION_MS = 10 * 60 * 1000;
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let authorizedAdministrator: { id: string; expiresAt: number } | null = null;
let authorizedMemberPinReset: {
  administratorId: string;
  familyId: string;
  memberId: string;
  expiresAt: number;
} | null = null;

type DiagnosticDetails = Record<string, string | number | boolean | string[]>;

function diagnostic(event: string, details: DiagnosticDetails = {}) {
  // Deliberately omit passwords, PINs, hashes, database keys, and SQL parameters.
  console.info(`[NestStore] ${event}`, details);
}

function diagnosticError(event: string, cause: unknown, details: DiagnosticDetails = {}) {
  const error = cause instanceof Error ? cause : new Error(String(cause));
  console.error(`[NestStore] ${event}`, { ...details, errorName: error.name, errorMessage: error.message });
}

// bcryptjs expects a synchronous CSPRNG. React Native does not provide Node's
// crypto module or Web Crypto globally, so use Expo's native CSPRNG explicitly.
bcrypt.setRandomFallback((byteCount) =>
  Array.from(Crypto.getRandomValues(new Uint8Array(byteCount)))
);

export function passwordIsStrong(password: string) {
  return password.length >= 8;
}

async function hashSecret(secret: string) {
  // bcryptjs generates a unique, cryptographically secure salt before hashing.
  const salt = await bcrypt.genSalt(BCRYPT_COST);
  return bcrypt.hash(secret, salt);
}

function requireAdministrator(administratorId: string) {
  if (!authorizedAdministrator || authorizedAdministrator.id !== administratorId || authorizedAdministrator.expiresAt <= Date.now()) {
    authorizedAdministrator = null;
    throw new Error('ADMIN_AUTH_REQUIRED');
  }
}

export function lockAdministrator() {
  authorizedAdministrator = null;
  authorizedMemberPinReset = null;
}

/** Allows one member PIN reset after the caller has verified the device credential. */
export function authorizeMemberPinResetWithDeviceCredential(
  administratorId: string,
  familyId: string,
  memberId: string,
) {
  authorizedMemberPinReset = {
    administratorId,
    familyId,
    memberId,
    expiresAt: Date.now() + 30_000,
  };
}

function requireMemberPinResetAuthorization(administratorId: string, familyId: string, memberId: string) {
  try {
    requireAdministrator(administratorId);
    authorizedMemberPinReset = null;
    return;
  } catch (cause) {
    const grant = authorizedMemberPinReset;
    if (
      cause instanceof Error &&
      cause.message === 'ADMIN_AUTH_REQUIRED' &&
      grant?.administratorId === administratorId &&
      grant.familyId === familyId &&
      grant.memberId === memberId &&
      grant.expiresAt > Date.now()
    ) {
      authorizedMemberPinReset = null;
      return;
    }
    if (grant && grant.expiresAt <= Date.now()) authorizedMemberPinReset = null;
    throw cause;
  }
}

async function initializeDatabase() {
  diagnostic('database.initialize.start', { platform: Platform.OS });
  let key: string | null = null;
  if (Platform.OS !== 'web') {
    key = await SecureStore.getItemAsync(DB_KEY_NAME);
    if (!key) {
      // Never delete a database to recover a missing key or migration marker.
      // A fresh install receives a new key; an unreadable legacy encrypted
      // database fails visibly and remains untouched for recovery.
      const bytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(DB_KEY_NAME, key);
      diagnostic('database.key.created');
    }
  }
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    if (Platform.OS !== 'web') {
      // SQLCipher builds consume this key; standard SQLite safely ignores it.
      await db.execAsync(`PRAGMA key = '${key}'`);
      await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    }
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = versionRow?.user_version ?? 0;
    diagnostic('database.opened', { version });

    if (version === 0) {
      await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS administrators (
          id TEXT PRIMARY KEY NOT NULL,
          username TEXT NOT NULL COLLATE NOCASE UNIQUE,
          password_hash TEXT NOT NULL,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS families (
          id TEXT PRIMARY KEY NOT NULL,
          administrator_id TEXT NOT NULL UNIQUE REFERENCES administrators(id) ON DELETE CASCADE,
          family_name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY NOT NULL,
          family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
          full_name TEXT NOT NULL,
          age_group TEXT NOT NULL CHECK (age_group IN ('child', 'teen', 'adult')),
          avatar TEXT NOT NULL DEFAULT 'sprout',
          auth_method TEXT NOT NULL CHECK (auth_method IN ('pin', 'face')),
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS member_credentials (
          member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          pin_hash TEXT,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS permission_rules (
          id TEXT PRIMARY KEY NOT NULL,
          family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
          member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
          rule_key TEXT NOT NULL,
          rule_value TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY NOT NULL,
          family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
          actor_id TEXT,
          event_type TEXT NOT NULL,
          subject_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS authentication_attempts (
          id TEXT PRIMARY KEY NOT NULL,
          identity_type TEXT NOT NULL CHECK (identity_type IN ('administrator', 'member')),
          identity_id TEXT NOT NULL,
          successful INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
        await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
      });
      diagnostic('database.schema.created', { version: DB_VERSION });
    } else if (version < DB_VERSION) {
      await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
      diagnostic('database.schema.version.updated', { from: version, to: DB_VERSION });
    }
    await validateSchema(db);
    return db;
  } catch (cause) {
    diagnosticError('database.initialize.failed', cause);
    throw cause;
  }
}

async function validateSchema(db: SQLite.SQLiteDatabase) {
  const required: Record<string, string[]> = {
    administrators: ['id', 'username', 'password_hash', 'failed_attempts', 'locked_until', 'created_at'],
    families: ['id', 'administrator_id', 'family_name', 'description', 'created_at'],
    members: ['id', 'family_id', 'full_name', 'age_group', 'avatar', 'auth_method', 'created_at'],
    member_credentials: ['member_id', 'pin_hash', 'failed_attempts', 'locked_until', 'updated_at'],
    permission_rules: ['id', 'family_id', 'member_id', 'rule_key', 'rule_value', 'created_at'],
    audit_events: ['id', 'family_id', 'actor_id', 'event_type', 'subject_id', 'created_at'],
    authentication_attempts: ['id', 'identity_type', 'identity_id', 'successful', 'created_at'],
  };
  const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  const tableNames = new Set(tables.map((table) => table.name));
  const invalidTables: string[] = [];
  for (const [table, columns] of Object.entries(required)) {
    if (!tableNames.has(table)) {
      invalidTables.push(`${table}:missing`);
      continue;
    }
    const currentColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    const currentNames = new Set(currentColumns.map((column) => column.name));
    const missing = columns.filter((column) => !currentNames.has(column));
    if (missing.length) invalidTables.push(`${table}:${missing.join(',')}`);
  }
  diagnostic('database.schema.checked', { tables: [...tableNames].sort(), valid: invalidTables.length === 0 });
  if (invalidTables.length) {
    diagnostic('database.schema.incompatible', { invalidTables });
    throw new Error('DATABASE_SCHEMA_INCOMPATIBLE');
  }
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((cause) => {
      databasePromise = undefined;
      throw cause;
    });
  }
  return databasePromise;
}

export async function prepareLocalStore() {
  await getDatabase();
  diagnostic('database.ready');
}

export async function registerAdministrator(username: string, password: string): Promise<Administrator> {
  const normalized = username.trim();
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(normalized)) {
    diagnostic('administrator.registration.rejected', { reason: 'username_policy', usernameLength: normalized.length });
    throw new Error('USERNAME_POLICY');
  }
  if (!passwordIsStrong(password)) {
    diagnostic('administrator.registration.rejected', { reason: 'password_policy', passwordLength: password.length });
    throw new Error('PASSWORD_POLICY');
  }
  const db = await getDatabase();
  const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  diagnostic('administrator.registration.hashing', { usernameLength: normalized.length });
  let passwordHash: string;
  try {
    passwordHash = await hashSecret(password);
  } catch (cause) {
    diagnosticError('administrator.registration.hash_failed', cause, { usernameLength: normalized.length });
    throw new Error('PASSWORD_HASH_FAILED');
  }
  try {
    await db.runAsync('INSERT INTO administrators (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)', id, normalized, passwordHash, new Date().toISOString());
  } catch (cause) {
    diagnosticError('administrator.registration.insert_failed', cause, { usernameLength: normalized.length });
    const message = cause instanceof Error ? cause.message.toLowerCase() : '';
    if (message.includes('unique constraint') && message.includes('administrators.username')) throw new Error('USERNAME_TAKEN');
    throw new Error('ADMINISTRATOR_INSERT_FAILED');
  }
  authorizedAdministrator = { id, expiresAt: Date.now() + ADMIN_SESSION_MS };
  diagnostic('administrator.registration.created', { administratorId: id });
  return { id, username: normalized };
}

export async function authenticateAdministrator(username: string, password: string): Promise<{ result: AuthResult; administrator?: Administrator }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; username: string; password_hash: string; failed_attempts: number; locked_until: number }>(
    'SELECT id, username, password_hash, failed_attempts, locked_until FROM administrators WHERE username = ? COLLATE NOCASE', username.trim(),
  );
  if (!row) return { result: 'invalid' };
  if (row.locked_until > Date.now()) return { result: 'locked' };
  const matches = await bcrypt.compare(password, row.password_hash);
  if (matches) {
    await db.runAsync('UPDATE administrators SET failed_attempts = 0, locked_until = 0 WHERE id = ?', row.id);
    await writeAuthenticationAttempt(db, 'administrator', row.id, true);
    authorizedAdministrator = { id: row.id, expiresAt: Date.now() + ADMIN_SESSION_MS };
    return { result: 'ok', administrator: { id: row.id, username: row.username } };
  }
  const attempts = row.failed_attempts + 1;
  await db.runAsync('UPDATE administrators SET failed_attempts = ?, locked_until = ? WHERE id = ?', attempts, attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0, row.id);
  await writeAuthenticationAttempt(db, 'administrator', row.id, false);
  return { result: attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid' };
}

export async function changeAdministratorPassword(administratorId: string, username: string, currentPassword: string, nextPassword: string) {
  requireAdministrator(administratorId);
  if (!passwordIsStrong(nextPassword)) throw new Error('PASSWORD_POLICY');
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ password_hash: string }>('SELECT password_hash FROM administrators WHERE id = ? AND username = ? COLLATE NOCASE', administratorId, username);
  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) throw new Error('AUTH_FAILED');
  const hash = await hashSecret(nextPassword);
  await db.runAsync('UPDATE administrators SET password_hash = ? WHERE id = ?', hash, administratorId);
}

export async function findFamily(administratorId: string): Promise<Family | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; administrator_id: string; family_name: string; description: string; created_at: string }>(
    'SELECT id, administrator_id, family_name, description, created_at FROM families WHERE administrator_id = ?', administratorId,
  );
  return row ? { id: row.id, administratorId: row.administrator_id, familyName: row.family_name, description: row.description, createdAt: row.created_at } : null;
}

export async function loadExistingFamily(): Promise<Family | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; administrator_id: string; family_name: string; description: string; created_at: string }>(
    'SELECT id, administrator_id, family_name, description, created_at FROM families ORDER BY created_at LIMIT 1',
  );
  return row ? { id: row.id, administratorId: row.administrator_id, familyName: row.family_name, description: row.description, createdAt: row.created_at } : null;
}

export async function updateFamily(administratorId: string, familyId: string, familyName: string, description: string): Promise<Family> {
  requireAdministrator(administratorId);
  const db = await getDatabase();
  await db.runAsync('UPDATE families SET family_name = ?, description = ? WHERE id = ? AND administrator_id = ?', familyName.trim(), description.trim(), familyId, administratorId);
  const family = await findFamily(administratorId);
  if (!family) throw new Error('FAMILY_NOT_FOUND');
  await writeAudit(db, familyId, administratorId, 'family_updated', familyId);
  return family;
}

export async function createFamily(administratorId: string, familyName: string, description: string): Promise<Family> {
  requireAdministrator(administratorId);
  const db = await getDatabase();
  const family: Family = { id: `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, administratorId, familyName: familyName.trim(), description: description.trim(), createdAt: new Date().toISOString() };
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO families (id, administrator_id, family_name, description, created_at) VALUES (?, ?, ?, ?, ?)', family.id, administratorId, family.familyName, family.description, family.createdAt);
      await writeAudit(db, family.id, administratorId, 'family_created', family.id);
    });
  } catch (cause) {
    diagnosticError('family.create.failed', cause, { administratorId });
    throw cause;
  }
  diagnostic('family.created', { familyId: family.id, administratorId });
  return family;
}

export async function listMembers(familyId: string): Promise<FamilyMember[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; family_id: string; full_name: string; age_group: FamilyMember['ageGroup']; avatar: string; auth_method: FamilyMember['authMethod']; created_at: string; has_credential: number }>(
    `SELECT m.id, m.family_id, m.full_name, m.age_group, m.avatar, m.auth_method, m.created_at,
      CASE WHEN c.pin_hash IS NOT NULL THEN 1 ELSE 0 END AS has_credential
     FROM members m LEFT JOIN member_credentials c ON c.member_id = m.id
     WHERE m.family_id = ? ORDER BY m.created_at`, familyId,
  );
  return rows.map((row) => ({ id: row.id, familyId: row.family_id, fullName: row.full_name, ageGroup: row.age_group, avatar: row.avatar, authMethod: row.auth_method, createdAt: row.created_at, hasCredential: Boolean(row.has_credential) }));
}

export async function addMember(administratorId: string, familyId: string, input: { fullName: string; ageGroup: FamilyMember['ageGroup']; avatar: string; pin: string }): Promise<FamilyMember> {
  requireAdministrator(administratorId);
  if (!/^\d{6,8}$/.test(input.pin)) throw new Error('PIN_POLICY');
  const db = await getDatabase();
  if (await pinIsInUse(db, input.pin)) throw new Error('PIN_TAKEN');
  const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const pinHash = await hashSecret(input.pin);
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO members (id, family_id, full_name, age_group, avatar, auth_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, familyId, input.fullName.trim(), input.ageGroup, input.avatar, 'pin', now);
    await db.runAsync('INSERT INTO member_credentials (member_id, pin_hash, updated_at) VALUES (?, ?, ?)', id, pinHash, now);
    await writeAudit(db, familyId, administratorId, 'member_created', id);
  });
  return { id, familyId, fullName: input.fullName.trim(), ageGroup: input.ageGroup, avatar: input.avatar, authMethod: 'pin', createdAt: now, hasCredential: true };
}

export async function updateMember(administratorId: string, familyId: string, memberId: string, input: { fullName: string; ageGroup: FamilyMember['ageGroup']; avatar: string; pin?: string }) {
  requireAdministrator(administratorId);
  if (input.pin && !/^\d{6,8}$/.test(input.pin)) throw new Error('PIN_POLICY');
  const db = await getDatabase();
  if (input.pin && await pinIsInUse(db, input.pin, memberId)) throw new Error('PIN_TAKEN');
  await db.runAsync('UPDATE members SET full_name = ?, age_group = ?, avatar = ? WHERE id = ? AND family_id = ?', input.fullName.trim(), input.ageGroup, input.avatar, memberId, familyId);
  if (input.pin) {
    const pinHash = await hashSecret(input.pin);
    await db.runAsync('UPDATE member_credentials SET pin_hash = ?, failed_attempts = 0, locked_until = 0, updated_at = ? WHERE member_id = ?', pinHash, new Date().toISOString(), memberId);
  }
  await writeAudit(db, familyId, administratorId, input.pin ? 'member_updated_pin_reset' : 'member_updated', memberId);
}

export async function authenticateMember(memberId: string, pin: string): Promise<AuthResult> {
  const db = await getDatabase();
  const credential = await db.getFirstAsync<{ pin_hash: string | null; failed_attempts: number; locked_until: number }>('SELECT pin_hash, failed_attempts, locked_until FROM member_credentials WHERE member_id = ?', memberId);
  if (!credential?.pin_hash) return 'not-configured';
  if (credential.locked_until > Date.now()) return 'locked';
  const matches = await bcrypt.compare(pin, credential.pin_hash);
  if (matches) {
    await db.runAsync('UPDATE member_credentials SET failed_attempts = 0, locked_until = 0 WHERE member_id = ?', memberId);
    await writeAuthenticationAttempt(db, 'member', memberId, true);
    return 'ok';
  }
  const attempts = credential.failed_attempts + 1;
  await db.runAsync('UPDATE member_credentials SET failed_attempts = ?, locked_until = ? WHERE member_id = ?', attempts, attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0, memberId);
  await writeAuthenticationAttempt(db, 'member', memberId, false);
  return attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid';
}

export async function resetMemberPin(administratorId: string, familyId: string, memberId: string, pin: string) {
  if (!/^\d{6,8}$/.test(pin)) throw new Error('PIN_POLICY');
  const db = await getDatabase();
  if (await pinIsInUse(db, pin, memberId)) throw new Error('PIN_TAKEN');
  requireMemberPinResetAuthorization(administratorId, familyId, memberId);
  const pinHash = await hashSecret(pin);
  const result = await db.runAsync('UPDATE member_credentials SET pin_hash = ?, failed_attempts = 0, locked_until = 0, updated_at = ? WHERE member_id = ? AND EXISTS (SELECT 1 FROM members WHERE id = ? AND family_id = ?)', pinHash, new Date().toISOString(), memberId, memberId, familyId);
  if (result.changes !== 1) throw new Error('MEMBER_NOT_FOUND');
  await writeAudit(db, familyId, administratorId, 'member_pin_reset', memberId);
}

export async function removeMember(administratorId: string, familyId: string, memberId: string) {
  requireAdministrator(administratorId);
  const db = await getDatabase();
  await db.runAsync('DELETE FROM members WHERE id = ? AND family_id = ?', memberId, familyId);
  await writeAudit(db, familyId, administratorId, 'member_removed', memberId);
}

export async function savePermission(administratorId: string, familyId: string, memberId: string, permission: string, allowed: boolean) {
  requireAdministrator(administratorId);
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM permission_rules WHERE family_id = ? AND member_id = ? AND rule_key = ?', familyId, memberId, permission);
  if (row) await db.runAsync('UPDATE permission_rules SET rule_value = ? WHERE id = ?', allowed ? 'allow' : 'deny', row.id);
  else await db.runAsync('INSERT INTO permission_rules (id, family_id, member_id, rule_key, rule_value, created_at) VALUES (?, ?, ?, ?, ?, ?)', `permission-${Date.now()}`, familyId, memberId, permission, allowed ? 'allow' : 'deny', new Date().toISOString());
}

export async function loadPermissions(memberId: string): Promise<Record<string, boolean>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ rule_key: string; rule_value: string }>('SELECT rule_key, rule_value FROM permission_rules WHERE member_id = ?', memberId);
  return Object.fromEntries(rows.map((row) => [row.rule_key, row.rule_value === 'allow']));
}

/** Drops a stored rule so the member falls back to the recommended default. */
export async function clearPermission(administratorId: string, familyId: string, memberId: string, permission: string) {
  requireAdministrator(administratorId);
  const db = await getDatabase();
  await db.runAsync('DELETE FROM permission_rules WHERE family_id = ? AND member_id = ? AND rule_key = ?', familyId, memberId, permission);
}

export type AuditEventRecord = {
  id: string;
  eventType: string;
  actorId: string | null;
  subjectId: string | null;
  createdAt: string;
};

/** Read-only history of the events recorded locally for a family. */
export async function listAuditEvents(familyId: string, limit = 60): Promise<AuditEventRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; event_type: string; actor_id: string | null; subject_id: string | null; created_at: string }>(
    `SELECT id, event_type, actor_id, subject_id, created_at
       FROM audit_events WHERE family_id = ?
     UNION ALL
     SELECT id,
       CASE
         WHEN identity_type = 'administrator' AND successful = 1 THEN 'administrator_sign_in_succeeded'
         WHEN identity_type = 'administrator' THEN 'administrator_sign_in_failed'
         WHEN successful = 1 THEN 'member_sign_in_succeeded'
         ELSE 'member_sign_in_failed'
       END AS event_type,
       NULL AS actor_id, identity_id AS subject_id, created_at
       FROM authentication_attempts
      WHERE (identity_type = 'administrator' AND identity_id = (SELECT administrator_id FROM families WHERE id = ?))
         OR (identity_type = 'member' AND identity_id IN (SELECT id FROM members WHERE family_id = ?))
     ORDER BY created_at DESC LIMIT ?`,
    familyId,
    familyId,
    familyId,
    limit,
  );
  return rows.map((row) => ({ id: row.id, eventType: row.event_type, actorId: row.actor_id, subjectId: row.subject_id, createdAt: row.created_at }));
}

async function writeAudit(db: SQLite.SQLiteDatabase, familyId: string, actorId: string, eventType: string, subjectId: string) {
  await db.runAsync('INSERT INTO audit_events (id, family_id, actor_id, event_type, subject_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, familyId, actorId, eventType, subjectId, new Date().toISOString());
}

async function pinIsInUse(db: SQLite.SQLiteDatabase, pin: string, exceptMemberId?: string) {
  const hashes = await db.getAllAsync<{ member_id: string; pin_hash: string | null }>(
    'SELECT member_id, pin_hash FROM member_credentials WHERE pin_hash IS NOT NULL',
  );
  for (const record of hashes) {
    if (record.member_id !== exceptMemberId && record.pin_hash && await bcrypt.compare(pin, record.pin_hash)) return true;
  }
  return false;
}

async function writeAuthenticationAttempt(db: SQLite.SQLiteDatabase, identityType: 'administrator' | 'member', identityId: string, successful: boolean) {
  await db.runAsync('INSERT INTO authentication_attempts (id, identity_type, identity_id, successful, created_at) VALUES (?, ?, ?, ?, ?)', `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, identityType, identityId, successful ? 1 : 0, new Date().toISOString());
}
