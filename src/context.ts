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
  /**
   * Ecran de lucru pe tot ecranul (antrenamentul în curs, un program ghidat) în tabul dat:
   * cât e pornit, bara de jos nu apare în acel tab. În celelalte taburi rămâne.
   */
  setImmersive: (tab: Tab, on: boolean) => void;
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp trebuie folosit în interiorul AppContext.Provider');
  return value;
}
