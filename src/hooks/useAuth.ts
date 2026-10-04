import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** a venit din linkul de resetare a parolei: cere parola nouă */
  | { status: 'recovery' }
  | { status: 'ready'; userId: string; email: string | null; mode: 'cloud' | 'local' };

export interface AuthResult {
  error: string | null;
  /** mesaj de informare (ex. "confirmă emailul") când nu e nici succes complet, nici eroare */
  info?: string;
}

const LOCAL_ID_KEY = 'corefit_local_user_id';
const CACHED_USER_KEY = 'corefit_cached_user';
/** „Continuă fără cont” cu Supabase configurat: aplicația merge în mod local pe acest dispozitiv. */
const GUEST_KEY = 'corefit_guest';

function localUserId(): string {
  let id = localStorage.getItem(LOCAL_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_ID_KEY, id);
  }
  return id;
}

interface CachedUser {
  id: string;
  email: string | null;
}

function readCachedUser(): CachedUser | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as CachedUser) : null;
  } catch {
    return null;
  }
}

function toMessage(err: { message?: string } | null | undefined): string {
  const m = (err?.message ?? '').toLowerCase();
  if (m.includes('invalid login')) return 'Email sau parolă incorecte.';
  if (m.includes('email not confirmed')) return 'Confirmă adresa de email din mesajul primit, apoi conectează-te.';
  if (m.includes('already registered')) return 'Există deja un cont cu acest email.';
  if (m.includes('password should be')) return 'Parola trebuie să aibă cel puțin 6 caractere.';
  if (m.includes('rate limit')) return 'Prea multe încercări. Așteaptă puțin și încearcă din nou.';
  if (m.includes('fetch') || m.includes('network')) {
    return 'Nu ai conexiune la internet. Încearcă din nou când ești online.';
  }
  return err?.message || 'Ceva nu a mers. Încearcă din nou.';
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const client = supabase;

    // Mod local: fără Supabase configurat, un id anonim stabil pe acest dispozitiv.
    if (!client || localStorage.getItem(GUEST_KEY)) {
      setState({ status: 'ready', userId: localUserId(), email: null, mode: 'local' });
      if (!client) return;
    }

    let cancelled = false;

    const applyUser = (user: User) => {
      localStorage.removeItem(GUEST_KEY);
      const email = user.email ?? null;
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify({ id: user.id, email } satisfies CachedUser));
      setState({ status: 'ready', userId: user.id, email, mode: 'cloud' });
    };

    // Fără internet, sesiunea expirată nu se poate reînnoi: folosim ultimul utilizator cunoscut,
    // ca antrenamentul să poată fi înregistrat în sală fără semnal.
    const fallbackOrSignedOut = () => {
      if (localStorage.getItem(GUEST_KEY)) return; // rămâne în modul local ales
      const cached = readCachedUser();
      if (cached && !navigator.onLine) {
        setState({ status: 'ready', userId: cached.id, email: cached.email, mode: 'cloud' });
      } else {
        setState({ status: 'signedOut' });
      }
    };

    client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) applyUser(data.session.user);
        else fallbackOrSignedOut();
      })
      .catch(() => {
        if (!cancelled) fallbackOrSignedOut();
      });

    // Atenție: în acest callback nu se apelează alte metode Supabase (risc de blocaj); doar setăm starea.
    const { data: listener } = client.auth.onAuthStateChange((event, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState({ status: 'recovery' });
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(CACHED_USER_KEY);
        if (!localStorage.getItem(GUEST_KEY)) setState({ status: 'signedOut' });
      } else if (session) {
        applyUser(session.user);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase nu este configurat.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? toMessage(error) : null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      if (!supabase) return { error: 'Supabase nu este configurat.' };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: toMessage(error) };
      if (!data.session) {
        return {
          error: null,
          info: 'Cont creat. Ți-am trimis un email de confirmare; după ce îl confirmi, conectează-te.',
        };
      }
      return { error: null };
    },
    [],
  );

  const continueWithoutAccount = useCallback(() => {
    localStorage.setItem(GUEST_KEY, '1');
    setState({ status: 'ready', userId: localUserId(), email: null, mode: 'local' });
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase nu este configurat.' };
    if (!email) return { error: 'Scrie întâi adresa de email.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    if (error) return { error: toMessage(error) };
    return { error: null, info: 'Ți-am trimis un email cu linkul pentru parola nouă. Deschide-l pe acest dispozitiv.' };
  }, []);

  const setNewPassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase nu este configurat.' };
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) return { error: toMessage(error) };
    if (data.user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify({ id: data.user.id, email: data.user.email ?? null } satisfies CachedUser));
      setState({ status: 'ready', userId: data.user.id, email: data.user.email ?? null, mode: 'cloud' });
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(GUEST_KEY);
    if (supabase) {
      // scope "local": funcționează și fără internet. Datele rămân pe dispozitiv.
      await supabase.auth.signOut({ scope: 'local' });
    }
    setState({ status: 'signedOut' });
  }, []);

  return { state, signIn, signUp, signOut, continueWithoutAccount, resetPassword, setNewPassword, cloudAvailable: supabase !== null };
}
