import { create } from 'zustand';
import { getDb, getTodayDateString, checkAndUpdatePR } from '../lib/db';

export interface ProfileData {
  name: string;
  step_goal: number;
  water_goal: number;
  calorie_goal: number;
}

export interface BodyWeightLog {
  id: number;
  date: string;
  weight_kg: number;
}

export interface PRRecord {
  id: number;
  exercise_name: string;
  max_weight: number;
  reps: number;
  est_1rm: number;
  date: string;
}

interface AppState {
  profile: ProfileData;
  todayWater: number;
  todayWorkoutMinutes: number;
  todayBurnedKcal: number;
  bodyWeightLogs: BodyWeightLog[];
  prRecords: PRRecord[];
  isBiometricLocked: boolean;
  isBiometricsEnabled: boolean;

  loadInitialData: () => void;
  updateProfileName: (newName: string) => void;
  updateStepGoal: (goal: number) => void;
  addWater: (amountMl: number) => void;
  logWorkoutSession: (routineName: string, durationSeconds: number, calories: number) => void;
  logBodyWeight: (weightKg: number) => void;
  recordSetPR: (exerciseName: string, weightKg: number, reps: number) => boolean;
  setBiometricLock: (locked: boolean) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  profile: {
    name: 'Campionule',
    step_goal: 10000,
    water_goal: 2500,
    calorie_goal: 2200,
  },
  todayWater: 0,
  todayWorkoutMinutes: 0,
  todayBurnedKcal: 0,
  bodyWeightLogs: [],
  prRecords: [],
  isBiometricLocked: false,
  isBiometricsEnabled: false,

  loadInitialData: () => {
    try {
      const db = getDb();
      const today = getTodayDateString();

      // Profil
      const row = db.getFirstSync<ProfileData>(
        'SELECT name, step_goal, water_goal, calorie_goal FROM profile WHERE id = 1'
      );
      if (row) {
        set({ profile: row });
      }

      // Apa de azi
      const waterRow = db.getFirstSync<{ total: number | null }>(
        'SELECT SUM(amount_ml) as total FROM water_logs WHERE date = ?',
        [today]
      );
      const waterTotal = waterRow?.total ?? 0;

      // Antrenamente de azi
      const workoutRow = db.getFirstSync<{ totalSeconds: number | null; totalCalories: number | null }>(
        'SELECT SUM(duration_seconds) as totalSeconds, SUM(calories_burned) as totalCalories FROM workout_sessions WHERE date = ?',
        [today]
      );
      const minutesTotal = Math.round((workoutRow?.totalSeconds ?? 0) / 60);
      const caloriesTotal = workoutRow?.totalCalories ?? 0;

      // Body weight logs
      const weights = db.getAllSync<BodyWeightLog>(
        'SELECT * FROM body_weight_logs ORDER BY id DESC LIMIT 20'
      );

      // PR records
      const prs = db.getAllSync<PRRecord>(
        'SELECT * FROM pr_records ORDER BY est_1rm DESC'
      );

      set({
        todayWater: waterTotal,
        todayWorkoutMinutes: minutesTotal,
        todayBurnedKcal: caloriesTotal,
        bodyWeightLogs: weights || [],
        prRecords: prs || [],
      });
    } catch (e) {
      console.warn('Eroare la incarcarea datelor SQLite:', e);
    }
  },

  updateProfileName: (newName: string) => {
    const db = getDb();
    db.runSync('UPDATE profile SET name = ? WHERE id = 1', [newName]);
    set((state) => ({ profile: { ...state.profile, name: newName } }));
  },

  updateStepGoal: (goal: number) => {
    const db = getDb();
    db.runSync('UPDATE profile SET step_goal = ? WHERE id = 1', [goal]);
    set((state) => ({ profile: { ...state.profile, step_goal: goal } }));
  },

  addWater: (amountMl: number) => {
    const db = getDb();
    const today = getTodayDateString();
    db.runSync('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)', [today, amountMl]);
    set((state) => ({ todayWater: state.todayWater + amountMl }));
  },

  logWorkoutSession: (routineName: string, durationSeconds: number, calories: number) => {
    const db = getDb();
    const today = getTodayDateString();
    db.runSync(
      'INSERT INTO workout_sessions (date, routine_name, duration_seconds, calories_burned) VALUES (?, ?, ?, ?)',
      [today, routineName, durationSeconds, calories]
    );
    const addedMinutes = Math.round(durationSeconds / 60);
    set((state) => ({
      todayWorkoutMinutes: state.todayWorkoutMinutes + addedMinutes,
      todayBurnedKcal: state.todayBurnedKcal + calories,
    }));
  },

  logBodyWeight: (weightKg: number) => {
    const db = getDb();
    const today = getTodayDateString();
    db.runSync('INSERT INTO body_weight_logs (date, weight_kg) VALUES (?, ?)', [today, weightKg]);
    const weights = db.getAllSync<BodyWeightLog>(
      'SELECT * FROM body_weight_logs ORDER BY id DESC LIMIT 20'
    );
    set({ bodyWeightLogs: weights || [] });
  },

  recordSetPR: (exerciseName: string, weightKg: number, reps: number) => {
    const isNewPR = checkAndUpdatePR(exerciseName, weightKg, reps);
    if (isNewPR) {
      const db = getDb();
      const prs = db.getAllSync<PRRecord>('SELECT * FROM pr_records ORDER BY est_1rm DESC');
      set({ prRecords: prs || [] });
    }
    return isNewPR;
  },

  setBiometricLock: (locked: boolean) => set({ isBiometricLocked: locked }),
  setBiometricsEnabled: (enabled: boolean) => set({ isBiometricsEnabled: enabled }),
}));
