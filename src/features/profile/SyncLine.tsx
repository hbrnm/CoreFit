import { RefreshCw } from 'lucide-react';
import { useApp } from '../../context';
import { formatTime } from '../../lib/date';

/** Starea sincronizării, sub titlul din Profil (aplicația nu mai are antet; problemele apar ca pastilă sus). */
export function SyncLine() {
  const { cloud, email, sync } = useApp();
  if (!cloud) return <p className="text-[15px] text-muted">Mod local · datele rămân pe acest dispozitiv</p>;

  let state: string;
  if (!sync.isOnline) state = 'Fără internet';
  else if (sync.lastError) state = 'Sincronizarea n-a mers';
  else if (sync.pending > 0) state = `${sync.pending} de trimis`;
  else state = sync.lastSyncedAt ? `Sincronizat la ${formatTime(sync.lastSyncedAt)}` : 'Sincronizat';

  return (
    <div className="flex items-center justify-between gap-2 text-[15px] text-muted">
      <span className="min-w-0 truncate">
        {email ? `${email} · ` : ''}
        {state}
      </span>
      <button
        type="button"
        onClick={() => void sync.syncNow()}
        disabled={sync.isSyncing || !sync.isOnline}
        aria-label="Sincronizează acum"
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
      >
        <RefreshCw size={16} className={sync.isSyncing ? 'animate-spin' : ''} aria-hidden="true" />
      </button>
    </div>
  );
}
