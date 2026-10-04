/*
 * Modul de culoare: urmează telefonul (implicit) sau e fixat din Profil pe deschis sau închis.
 * Alegerea ține de dispozitiv, nu de cont: stă în localStorage, nu se sincronizează.
 * index.html aplică același atribut înainte de prima afișare, ca pagina să nu clipească.
 */

export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'corefit-theme';

/** Culoarea barei de sistem (theme-color): fundalul paginii, pentru că aplicația nu mai are antet. */
export const THEME_COLOR: Record<Theme, string> = { light: '#F2F2F7', dark: '#000000' };

export const THEME_LABELS: Record<ThemePref, string> = { system: 'Automat', light: 'Deschis', dark: 'Închis' };

export function parseThemePref(value: string | null | undefined): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'dark' : 'light';
  return pref;
}

export function readThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Aplică modul pe <html> și pe bara de sistem, apoi ține minte alegerea. */
export function applyThemePref(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);

  const color = THEME_COLOR[resolveTheme(pref, systemPrefersDark())];
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    // „Automat” lasă fiecare meta pe media query-ul ei; un mod fixat le suprascrie pe amândouă.
    meta.content = pref === 'system' ? THEME_COLOR[meta.media.includes('dark') ? 'dark' : 'light'] : color;
  }

  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // stocare indisponibilă (navigare privată): modul rămâne doar pentru sesiunea asta
  }
}
