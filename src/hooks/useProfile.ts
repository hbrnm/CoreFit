import { useEffect } from 'react';
import { db, ensureProfile, type LocalProfile } from '../lib/db';
import { useLive } from './useLive';

export function useProfile(userId: string): LocalProfile | undefined {
  useEffect(() => {
    void ensureProfile(userId);
  }, [userId]);

  const { data } = useLive(() => db.profiles.get(userId), [userId]);
  return data;
}
