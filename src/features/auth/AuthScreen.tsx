import { useState, type FormEvent } from 'react';
import type { AuthResult } from '../../hooks/useAuth';
import { Notice, Segmented } from '../../components/ui';

interface Props {
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
}

type Mode = 'signin' | 'signup';

export function AuthScreen({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result =
        mode === 'signin'
          ? await onSignIn(email.trim(), password)
          : await onSignUp(email.trim(), password, fullName.trim());
      if (result.error) setError(result.error);
      else if (result.info) {
        setInfo(result.info);
        setMode('signin');
      }
      // La succes, useAuth trece singur în starea "ready" și acest ecran dispare.
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-6xl font-bold leading-none">CoreFit</h1>
      <p className="mt-3 max-w-[30ch] text-lg leading-snug text-fg">
        Antrenament, coloană și nutriție fără zahăr. Notezi și fără internet, se sincronizează după.
      </p>

      <div className="mt-8">
        <Segmented<Mode>
          label="Tip de acces"
          value={mode}
          onChange={setMode}
         
          options={[
            { value: 'signin', label: 'Conectare' },
            { value: 'signup', label: 'Cont nou' },
          ]}
        />
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="full-name" className="label">
              Nume
            </label>
            <input
              id="full-name"
              className="field"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
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

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Se încarcă...' : mode === 'signin' ? 'Conectează-te' : 'Creează contul'}
        </button>
      </form>
    </main>
  );
}
