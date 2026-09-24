import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('corefit.db');
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      step_goal INTEGER NOT NULL DEFAULT 10000,
      water_goal INTEGER NOT NULL DEFAULT 2500,
      calorie_goal INTEGER NOT NULL DEFAULT 2200
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      routine_name TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      calories_burned INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pr_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_name TEXT UNIQUE NOT NULL,
      max_weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      est_1rm REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL
    );
  `);

  // Asiguram un profil implicit daca nu exista deja
  const existingProfile = db.getFirstSync<{ count: number }>('SELECT count(*) as count FROM profile WHERE id = 1');
  if (!existingProfile || existingProfile.count === 0) {
    db.runSync(
      'INSERT INTO profile (id, name, step_goal, water_goal, calorie_goal) VALUES (?, ?, ?, ?, ?)',
      [1, 'Campionule', 10000, 2500, 2200]
    );
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Calculeaza 1RM conform formulei Epley (standard OpenGym / Strong)
export function calculate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// Salveaza sau actualizeaza un Personal Record (PR)
export function checkAndUpdatePR(exerciseName: string, weightKg: number, reps: number): boolean {
  if (weightKg <= 0 || reps <= 0) return false;
  const db = getDb();
  const est1rm = calculate1RM(weightKg, reps);
  const today = getTodayDateString();

  const existing = db.getFirstSync<{ max_weight: number; est_1rm: number }>(
    'SELECT max_weight, est_1rm FROM pr_records WHERE exercise_name = ?',
    [exerciseName]
  );

  if (!existing) {
    db.runSync(
      'INSERT INTO pr_records (exercise_name, max_weight, reps, est_1rm, date) VALUES (?, ?, ?, ?, ?)',
      [exerciseName, weightKg, reps, est1rm, today]
    );
    return true;
  }

  if (est1rm > existing.est_1rm || weightKg > existing.max_weight) {
    db.runSync(
      'UPDATE pr_records SET max_weight = ?, reps = ?, est_1rm = ?, date = ? WHERE exercise_name = ?',
      [Math.max(weightKg, existing.max_weight), reps, Math.max(est1rm, existing.est_1rm), today, exerciseName]
    );
    return true;
  }

  return false;
}

// Exporta toate datele aplicatiei in format JSON (openGym & backup standard)
export function exportAllDataAsJson(): string {
  const db = getDb();
  const profile = db.getAllSync('SELECT * FROM profile');
  const workouts = db.getAllSync('SELECT * FROM workout_sessions ORDER BY id DESC');
  const water = db.getAllSync('SELECT * FROM water_logs ORDER BY id DESC');
  const bodyWeight = db.getAllSync('SELECT * FROM body_weight_logs ORDER BY id DESC');
  const prs = db.getAllSync('SELECT * FROM pr_records ORDER BY est_1rm DESC');

  return JSON.stringify(
    {
      app: 'CoreFit-Mobile',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      profile,
      workout_sessions: workouts,
      water_logs: water,
      body_weight_logs: bodyWeight,
      pr_records: prs,
    },
    null,
    2
  );
}

