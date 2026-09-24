import { useMemo } from 'react';
import { db, type LocalCustomExercise } from '../lib/db';
import type { Exercise } from '../data/exercises';
import { buildCatalog } from '../lib/workoutStats';
import { useLive } from './useLive';

export function useCustomExercises(userId: string): LocalCustomExercise[] {
  const { data } = useLive(
    () =>
      db.customExercises
        .where('user_id')
        .equals(userId)
        .filter((e) => !e.deleted)
        .toArray(),
    [userId],
  );
  return data ?? [];
}

/** Exercițiile create de utilizator, indexate după id. Cele predefinite se caută cu findExercise. */
export function useCatalog(userId: string): Map<string, Exercise> {
  const custom = useCustomExercises(userId);
  return useMemo(() => buildCatalog(custom), [custom]);
}
