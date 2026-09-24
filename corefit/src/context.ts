import { createContext, useContext } from 'react';
import type { LocalProfile } from './lib/db';

export type Tab = 'home' | 'workouts' | 'health' | 'nutrition' | 'profile';

export interface SyncInfo {
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  /** câte modificări locale nu au ajuns încă pe server */
  pending: number;
  syncNow: () => Promise<void>;
}

export interface AppContextValue {
  userId: string;
  email: string | null;
  /** true = cont Supabase și sincronizare; false = mod local, doar pe acest dispozitiv */
  cloud: boolean;
  profile: LocalProfile | undefined;
  sync: SyncInfo;
  goTo: (tab: Tab) => void;
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp trebuie folosit în interiorul AppContext.Provider');
  return value;
}
