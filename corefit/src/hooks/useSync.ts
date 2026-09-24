import { useCallback, useEffect, useRef, useState } from 'react';
import type { Table } from 'dexie';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { describeError, syncAll } from '../lib/sync';
import type { SyncInfo } from '../context';
import { useLive } from './useLive';

/** Câte rânduri locale așteaptă (sau au eșuat) să ajungă pe server. */
function usePendingCount(userId: string): number {
  const { data } = useLive(async () => {
    const mine = (r: { user_id: string }) => r.user_id === userId;
    const tables = [
      db.profiles,
      db.workoutSessions,
      db.workoutLogs,
      db.routines,
      db.customExercises,
      db.spineAssessments,
      db.painLogs,
      db.healthSessions,
      db.nutritionLogs,
      db.foodEntries,
      db.customFoods,
      db.recipes,
    ] as unknown as Array<Table<{ user_id: string }, unknown>>;
    const counts = await Promise.all(
      tables.map((t) => t.where('sync_status').anyOf('pending', 'error').and(mine).count()),
    );
    return counts.reduce((a, b) => a + b, 0);
  }, [userId]);
  return data ?? 0;
}

export function useSync(userId: string, enabled: boolean): SyncInfo {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const pending = usePendingCount(userId);

  // Ref-uri, nu state: nu vrem ca schimbarea lor să declanșeze alt ciclu de sincronizare.
  const runningRef = useRef(false);
  const queuedRef = useRef(false);
  const latestSyncRef = useRef<() => Promise<void>>(async () => {});

  const syncNow = useCallback(async (): Promise<void> => {
    if (!supabase || !enabled || !navigator.onLine) return;
    if (runningRef.current) {
      queuedRef.current = true;
      return;
    }

    runningRef.current = true;
    setIsSyncing(true);
    try {
      const errors = await syncAll(supabase, userId);
      setLastError(errors[0] ?? null);
      if (errors.length === 0) setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      setLastError(describeError(e));
    } finally {
      runningRef.current = false;
      setIsSyncing(false);
      if (queuedRef.current) {
        queuedRef.current = false;
        void latestSyncRef.current();
      }
    }
  }, [userId, enabled]);

  useEffect(() => {
    latestSyncRef.current = syncNow;
  }, [syncNow]);

  // Declanșatoare: pornire, revenirea online, revenirea în aplicație, la 2 minute.
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const onOffline = () => setIsOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => void syncNow(), 120_000);
    void syncNow();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [syncNow]);

  // După o modificare locală, trimitem la scurt timp (grupăm salvările apropiate).
  // Depinde de numărul de rânduri în așteptare, nu de rezultatul sincronizării, deci nu poate face buclă.
  useEffect(() => {
    if (pending === 0 || !isOnline) return;
    const timer = window.setTimeout(() => void syncNow(), 1500);
    return () => window.clearTimeout(timer);
  }, [pending, isOnline, syncNow]);

  return { isOnline, isSyncing, lastError, lastSyncedAt, pending, syncNow };
}
