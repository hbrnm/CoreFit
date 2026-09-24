import { useEffect, useState } from 'react';
import { localDateStr } from '../lib/date';

/** Data locală de azi; se actualizează singură la miezul nopții sau la revenirea în aplicație. */
export function useToday(): string {
  const [today, setToday] = useState(() => localDateStr());

  useEffect(() => {
    const update = () => setToday(localDateStr());
    const id = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return today;
}
