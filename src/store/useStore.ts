import { create } from 'zustand';
import { getDb, getTodayDateString } from '../lib/db';

interface ProfileData {
  name: string;
  step_goal: number;
  water_goal: number;
  calorie_goal: number;
}

interface AppState {
  profile: ProfileData;
  todayWater: number;
  todayWorkoutMinutes: number;
  todayBurnedKcal: number;
  
  loadInitialData: () => void;
  updateProfileName: (newName: string) => void;
  updateStepGoal: (goal: number) => void;
  addWater: (amountMl: number) => void;
  logWorkoutSession: (routineName: string, durationSeconds: number, calories: number) => void;
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

      set({
        todayWater: waterTotal,
        todayWorkoutMinutes: minutesTotal,
        todayBurnedKcal: caloriesTotal,
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
}));
