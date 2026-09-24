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
