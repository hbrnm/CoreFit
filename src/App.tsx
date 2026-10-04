import { useCallback, useState } from 'react';
import { Activity, Apple, Dumbbell, Home, RefreshCw, User, WifiOff } from 'lucide-react';
import { AppContext, useApp, type AppContextValue, type Tab } from './context';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useSync } from './hooks/useSync';
import { AuthScreen, NewPasswordScreen } from './features/auth/AuthScreen';
import { HomeTab } from './features/home/HomeTab';
import { WorkoutsTab } from './features/workouts/WorkoutsTab';
import { HealthTab } from './features/health/HealthTab';
import { NutritionTab } from './features/nutrition/NutritionTab';
import { ProfileTab } from './features/profile/ProfileTab';
import { DOMAIN } from './lib/domains';
import { cx } from './lib/cx';

const TABS: ReadonlyArray<{ id: Tab; icon: typeof Dumbbell }> = [
  { id: 'home', icon: Home },
  { id: 'workouts', icon: Dumbbell },
  { id: 'nutrition', icon: Apple },
  { id: 'health', icon: Activity },
  { id: 'profile', icon: User },
];

export function App() {
  const auth = useAuth();
  const { state } = auth;

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-display text-4xl font-bold">CoreFit</span>
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <AuthScreen
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onReset={auth.resetPassword}
        onWithoutAccount={auth.continueWithoutAccount}
        cloudAvailable={auth.cloudAvailable}
      />
    );
  }

  if (state.status === 'recovery') {
    return <NewPasswordScreen onSave={auth.setNewPassword} />;
  }

  return (
    <Shell
      key={state.userId}
      userId={state.userId}
      email={state.email}
      cloud={state.mode === 'cloud'}
      onSignOut={auth.signOut}
    />
  );
}

interface ShellProps {
  userId: string;
  email: string | null;
  cloud: boolean;
  onSignOut: () => Promise<void>;
}

function Shell({ userId, email, cloud, onSignOut }: ShellProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [immersiveTabs, setImmersiveTabs] = useState<ReadonlySet<Tab>>(new Set());
  const profile = useProfile(userId);
  const sync = useSync(userId, cloud);

  const goTo = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const setImmersive = useCallback((which: Tab, on: boolean) => {
    setImmersiveTabs((cur) => {
      if (cur.has(which) === on) return cur;
      const next = new Set(cur);
      if (on) next.add(which);
      else next.delete(which);
      return next;
    });
  }, []);
  const immersive = immersiveTabs.has(tab);

  const ctx: AppContextValue = { userId, email, cloud, profile, sync, goTo, setImmersive, signOut: onSignOut };

  return (
    <AppContext.Provider value={ctx}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <SyncProblem />

        {/* Toate ecranele rămân montate: un antrenament sau un cronometru pornit nu se pierde la schimbarea tabului. */}
        <main className={cx('flex-1 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]', immersive ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]')}>
          <div className={tab === 'home' ? '' : 'hidden'}>
            <HomeTab />
          </div>
          <div className={tab === 'workouts' ? '' : 'hidden'}>
            <WorkoutsTab />
          </div>
          <div className={tab === 'health' ? '' : 'hidden'}>
            <HealthTab />
          </div>
          <div className={tab === 'nutrition' ? '' : 'hidden'}>
            <NutritionTab />
          </div>
          <div className={tab === 'profile' ? '' : 'hidden'}>
            <ProfileTab />
          </div>
        </main>

        {/* Bara de jos plutitoare, ca în Apple Health (iOS 26): capsulă de sticlă mată peste conținut. */}
        <nav
          hidden={immersive}
          aria-label="Secțiuni"
          className="tabbar fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-20 w-[calc(100%-1.75rem)] max-w-[25rem] -translate-x-1/2"
        >
          <ul className="grid grid-cols-5 p-1.5">
            {TABS.map(({ id, icon: Icon }) => {
              const active = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => goTo(id)}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex h-[54px] w-full flex-col items-center justify-center gap-0.5 rounded-[28px] text-[10.5px] font-semibold',
                      active ? 'bg-fg/[0.07] text-brand-fg' : 'text-subtle',
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                    {DOMAIN[id].label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </AppContext.Provider>
  );
}

/**
 * Sincronizarea se arată doar când e o problemă (fără internet, eroare), ca o pastilă sus.
 * Când totul merge, nu e nimic de văzut; detaliile și „Sincronizează acum” sunt în Profil.
 */
function SyncProblem() {
  const { cloud, sync } = useApp();
  if (!cloud || (sync.isOnline && !sync.lastError)) return null;

  const text = !sync.isOnline
    ? sync.pending > 0
      ? `Fără internet · ${sync.pending} de trimis când revine`
      : 'Fără internet · se sincronizează după'
    : 'Sincronizarea n-a mers';

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 flex justify-center px-4">
      <div role="status" className="mt-2 flex items-center gap-1.5 rounded-full bg-raised py-1 pl-3 pr-1 text-[13px] font-semibold text-muted shadow-sm">
        {!sync.isOnline && <WifiOff size={15} aria-hidden="true" />}
        <span>{text}</span>
        <button
          type="button"
          onClick={() => void sync.syncNow()}
          disabled={sync.isSyncing || !sync.isOnline}
          aria-label="Încearcă din nou"
          className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
        >
          <RefreshCw size={15} className={sync.isSyncing ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
