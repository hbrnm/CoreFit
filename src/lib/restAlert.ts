/*
 * Anunțul de final de pauză când ecranul e blocat sau aplicația e în fundal.
 * Cu aplicația deschisă, sfârșitul pauzei se aude (voce) și se simte (vibrație) din ActiveWorkout.
 *
 * Limită: o aplicație web nu poate programa o notificare pentru mai târziu. Folosim un timer din
 * pagină și notificarea service worker-ului; pe Android merge și cu ecranul blocat, pe iPhone
 * (aplicația adăugată pe ecranul principal, iOS 16.4+) doar cât timp sistemul nu suspendă pagina.
 */

export type RestAlertPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function restAlertPermission(): RestAlertPermission {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}

/** Cere permisiunea; trebuie apelată dintr-o apăsare (iOS o cere). */
export async function askRestAlertPermission(): Promise<RestAlertPermission> {
  if (restAlertPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return restAlertPermission();
  }
}

async function show(body: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Pauza s-a terminat', {
      body,
      tag: 'corefit-rest',
      silent: false,
      // vibrația din notificare e ignorată pe unele sisteme; nu e o problemă
    } as NotificationOptions);
  } catch {
    /* fără service worker activ (de ex. în dezvoltare): nimic de făcut */
  }
}

/**
 * Programează anunțul pentru `endsAt` (ms). Notifică doar dacă pagina nu e vizibilă atunci,
 * ca să nu dubleze semnalul din aplicație. Întoarce funcția de anulare.
 */
export function scheduleRestAlert(endsAt: number, nextLabel: string | null): () => void {
  if (restAlertPermission() !== 'granted') return () => undefined;
  const timer = window.setTimeout(() => {
    if (document.visibilityState !== 'visible') void show(nextLabel ? `Urmează: ${nextLabel}` : 'Ești gata de seria următoare.');
  }, Math.max(0, endsAt - Date.now()));
  return () => window.clearTimeout(timer);
}
