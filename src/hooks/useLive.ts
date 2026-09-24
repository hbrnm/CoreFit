import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

export function useLive<T>(
  querier: () => T | Promise<T>,
  deps: readonly unknown[],
): { data: T | undefined; loaded: boolean } {
  // Wrap in useMemo to ensure deps are correctly passed
  const memoDeps = useMemo(() => deps, deps); // eslint-disable-line react-hooks/exhaustive-deps
  
  const result = useLiveQuery(
    () => Promise.resolve(querier()).then(val => ({ val })),
    memoDeps as any[]
  );

  return { 
    data: result?.val, 
    loaded: result !== undefined 
  };
}
