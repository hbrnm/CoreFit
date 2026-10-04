import { useState, type FormEvent } from 'react';
import type { AuthResult } from '../../hooks/useAuth';
import { cx } from '../../lib/cx';
import { Notice } from '../../components/ui';

interface Props {
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  onReset: (email: string) => Promise<AuthResult>;
  onWithoutAccount: () => void;
  /** fără Supabase configurat, doar modul local are sens */
  cloudAvailable: boolean;
}

type Mode = 'signin' | 'signup';

/** Conectarea, după design/round5/09: un card cu formularul, iar dedesubt „Continuă fără cont”. */
export function AuthScreen({ onSignIn, onSignUp, onReset, onWithoutAccount, cloudAvailable }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (action: () => Promise<AuthResult>, after?: () => void) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else if (result.info) {
        setInfo(result.info);
        after?.();
      }
      // La succes, useAuth trece singur în starea "ready" și acest ecran dispare.
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () => (mode === 'signin' ? onSignIn(email.trim(), password) : onSignUp(email.trim(), password, fullName.trim())),
      () => setMode('signin'),
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <h1 className="text-center font-display text-[56px] font-extrabold leading-none tracking-tight">CoreFit</h1>
      <p className="mx-auto mt-4 max-w-[32ch] text-center text-[17px] leading-snug text-muted">
        Antrenament, coloană și nutriție. Notezi și fără internet, se sincronizează după.
      </p>

      {cloudAvailable && (
        <section className="panel mt-8 p-4">
          <div role="tablist" aria-label="Tip de acces" className="grid grid-cols-2 rounded-xl bg-fg/[0.06] p-0.5">
            {(
              [
                ['signin', 'Conectare'],
                ['signup', 'Cont nou'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={cx(
                  'min-h-[44px] rounded-[10px] text-[17px] font-semibold',
                  mode === value ? 'seg-on' : 'text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="full-name" className="label">
                  Nume
                </label>
                <input id="full-name" className="field" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Parolă
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className="field"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <Notice tone="error">{error}</Notice>}
            {info && <Notice tone="info">{info}</Notice>}

            <button type="submit" className="btn-primary min-h-[52px] text-[17px]" disabled={busy}>
              {busy ? 'Se încarcă...' : mode === 'signin' ? 'Conectează-te' : 'Creează contul'}
            </button>
            {mode === 'signin' && (
              <button
                type="button"
                className="min-h-[44px] text-[17px] font-semibold text-brand-fg"
                disabled={busy}
                onClick={() => void run(() => onReset(email.trim()))}
              >
                Ai uitat parola?
              </button>
            )}
          </form>
        </section>
      )}

      <p className="mx-auto mt-8 max-w-[34ch] text-center text-[15px] leading-snug text-subtle">
        {cloudAvailable
          ? 'Fără cont? Folosește aplicația doar pe acest telefon. Datele rămân aici și nu se mută singure într-un cont creat mai târziu.'
          : 'Aplicația merge pe acest telefon; datele rămân aici.'}
      </p>
      <button type="button" className="mx-auto mt-2 min-h-[44px] px-4 text-[17px] font-semibold text-brand-fg" onClick={onWithoutAccount}>
        Continuă fără cont
      </button>
    </main>
  );
}

/** După linkul din emailul de resetare: parola nouă. */
export function NewPasswordScreen({ onSave }: { onSave: (password: string) => Promise<AuthResult> }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await onSave(password);
      if (r.error) setError(r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center font-display text-[40px] font-extrabold leading-none tracking-tight">Parolă nouă</h1>
      <form onSubmit={submit} className="panel mt-8 flex flex-col gap-4 p-4">
        <div>
          <label htmlFor="new-password" className="label">
            Parola nouă (cel puțin 6 caractere)
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={6}
            className="field"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-primary min-h-[52px] text-[17px]" disabled={busy}>
          {busy ? 'Se salvează...' : 'Salvează parola'}
        </button>
      </form>
    </main>
  );
}
