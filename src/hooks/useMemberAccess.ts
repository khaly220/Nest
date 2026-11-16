import { useCallback, useEffect, useState } from 'react';

import type { FamilyMember } from '@/data/familyStore';
import { loadMemberAccess } from '@/data/services/accessService';
import type { MemberAppAccess, PermissionSource } from '@/types';

/**
 * Loads the installed application catalog combined with the boundary rules that
 * are already saved for one member profile. Screens own persistence; this hook
 * only keeps the in-memory view in sync so toggles feel instant.
 */
export function useMemberAccess(member: FamilyMember | null) {
  const [apps, setApps] = useState<MemberAppAccess[]>([]);
  const [stored, setStored] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [catalogSupported, setCatalogSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!member) {
      setApps([]);
      setStored({});
      setCatalogSupported(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loadMemberAccess(member.id, member.ageGroup);
      setApps(result.apps);
      setStored(result.stored);
      setCatalogSupported(result.catalogSupported);
    } catch (cause) {
      setApps([]);
      setError(cause instanceof Error ? cause.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  const updateApp = useCallback((appId: string, allowed: boolean, source: PermissionSource = 'custom') => {
    setApps((current) => current.map((app) => (app.id === appId ? { ...app, allowed, source } : app)));
  }, []);

  const setStoredRule = useCallback((key: string, value: boolean | null) => {
    setStored((current) => {
      const next = { ...current };
      if (value === null) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  return { apps, setApps, stored, setStored, setStoredRule, updateApp, loading, catalogSupported, error, reload };
}
