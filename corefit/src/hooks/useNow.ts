import { useEffect, useState } from 'react';

/** Ora curentă în milisecunde, actualizată la interval (pentru cronometre și timpi scurși). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
