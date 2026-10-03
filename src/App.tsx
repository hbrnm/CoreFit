import { useState } from 'react';
import { Activity, Apple, Dumbbell, Home, RefreshCw, User, WifiOff } from 'lucide-react';
import { AppContext, useApp, type AppContextValue, type Tab } from './context';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useSync } from './hooks/useSync';
import { AuthScreen } from './features/auth/AuthScreen';
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
    return <AuthScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;
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
  const profile = useProfile(userId);
  const sync = useSync(userId, cloud);

  const goTo = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const ctx: AppContextValue = { userId, email, cloud, profile, sync, goTo, signOut: onSignOut };

  return (
    <AppContext.Provider value={ctx}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] text-fg backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-display text-2xl font-bold leading-none">CoreFit</span>
            <SyncStatus />
          </div>
          <div className={cx('h-1', DOMAIN[tab].bar)} aria-hidden="true" />
        </header>

        {/* Toate ecranele rămân montate: un antrenament sau un cronometru pornit nu se pierde la schimbarea tabului. */}
        <main className="flex-1 px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
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

        <nav
          aria-label="Secțiuni"
          className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-line bg-surface/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-5">
            {TABS.map(({ id, icon: Icon }) => {
              const active = tab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => goTo(id)}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-[13px] font-semibold',
                      active ? DOMAIN[id].text : 'text-subtle',
                    )}
                  >
                    {active && <span className={cx('absolute inset-x-4 top-0 h-1', DOMAIN[id].bar)} aria-hidden="true" />}
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
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

function SyncStatus() {
  const { cloud, sync } = useApp();

  if (!cloud) {
    return <span className="text-sm text-muted">Datele rămân pe acest dispozitiv</span>;
  }

  let text: string;
  if (!sync.isOnline) {
    text = sync.pending > 0 ? `Fără internet, ${sync.pending} de trimis` : 'Fără internet';
  } else if (sync.lastError) {
    text = 'Eroare de sincronizare';
  } else if (sync.pending > 0) {
    text = `${sync.pending} de trimis`;
  } else {
    text = 'Sincronizat';
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {!sync.isOnline && <WifiOff size={16} className="text-warning" aria-hidden="true" />}
      <span className={cx(sync.lastError && sync.isOnline ? 'text-warning' : 'text-muted')}>{text}</span>
      <button
        type="button"
        onClick={() => void sync.syncNow()}
        disabled={sync.isSyncing || !sync.isOnline}
        aria-label="Sincronizează acum"
        className="-mr-2 flex h-11 w-11 items-center justify-center text-muted disabled:opacity-40"
      >
        <RefreshCw size={16} className={sync.isSyncing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
