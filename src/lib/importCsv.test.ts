import { describe, expect, it } from 'vitest';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { guessEquipment, matchExercise, muscleFromCategory } from './exerciseMatch';
import { detectSource, num, parseCsv, parseDate, parseDurationSeconds, parseImport, stableId, type ParsedImport } from './importCsv';

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push Day","15 Sep 2024, 18:02","15 Sep 2024, 19:10","Bine","Bench Press (Barbell)",,"",0,"warmup",40,10,,,
"Push Day","15 Sep 2024, 18:02","15 Sep 2024, 19:10","Bine","Bench Press (Barbell)",,"",1,"normal",80,5,,,8
"Push Day","15 Sep 2024, 18:02","15 Sep 2024, 19:10","Bine","Plank",,"",0,"normal",,,,60,
"Push Day","15 Sep 2024, 18:02","15 Sep 2024, 19:10","Bine","Treadmill",,"",0,"normal",,,2.5,,
"Legs","17 Sep 2024, 07:30","17 Sep 2024, 08:20","","Squat (Barbell)",,"",0,"normal",100,5,,,
`;

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-01-15 18:30:00,"Evening, heavy",1h 5m,Deadlift (Barbell),W,135,5,0,0,,,
2024-01-15 18:30:00,"Evening, heavy",1h 5m,Deadlift (Barbell),1,225,5,0,0,,,9
2024-01-15 18:30:00,"Evening, heavy",1h 5m,Pull Up,1,0,8,0,0,,,
`;

const FITNOTES = `Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time
2024-02-01,Flat Barbell Bench Press,Chest,60.0,kgs,8,,,
2024-02-01,Cable Fly Crossover,Chest,15.0,kgs,12,,,
2024-02-03,Barbell Squat,Legs,225.0,lbs,5,,,
`;

const ok = (r: ParsedImport | string): ParsedImport => {
  if (typeof r === 'string') throw new Error(r);
  return r;
};

describe('CSV', () => {
  it('respectă ghilimelele, virgulele din câmpuri și BOM-ul', () => {
    expect(parseCsv('﻿a,b\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });

  it('ghicește separatorul punct și virgulă (exporturi în setări europene)', () => {
    expect(parseCsv('a;b\n1,5;2\n')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
    expect(num('1,5')).toBe(1.5);
  });

  it('recunoaște sursa după antet', () => {
    expect(detectSource(parseCsv(HEVY)[0])).toBe('hevy');
    expect(detectSource(parseCsv(STRONG)[0])).toBe('strong');
    expect(detectSource(parseCsv(FITNOTES)[0])).toBe('fitnotes');
    expect(detectSource(['foo', 'bar'])).toBeNull();
  });
});

describe('date și durate', () => {
  it('citește formatele celor trei aplicații ca oră locală', () => {
    expect(parseDate('15 Sep 2024, 18:02')).toEqual(new Date(2024, 8, 15, 18, 2));
    expect(parseDate('2024-01-15 18:30:00')).toEqual(new Date(2024, 0, 15, 18, 30));
    expect(parseDate('2024-02-01')).toEqual(new Date(2024, 1, 1, 12, 0));
    expect(parseDate('2024-02-30')).toBeNull();
    expect(parseDate('ieri')).toBeNull();
  });

  it('citește durata Strong', () => {
    expect(parseDurationSeconds('1h 5m')).toBe(3900);
    expect(parseDurationSeconds('45m')).toBe(2700);
    expect(parseDurationSeconds('90')).toBe(90);
    expect(parseDurationSeconds('')).toBeNull();
  });
});

describe('Hevy', () => {
  const r = ok(parseImport(HEVY));

  it('grupează seriile pe antrenamente, în ordine cronologică', () => {
    expect(r.source).toBe('hevy');
    expect(r.workouts.map((w) => w.name)).toEqual(['Push Day', 'Legs']);
    expect(r.workouts[0].endedAt).toEqual(new Date(2024, 8, 15, 19, 10));
    expect(r.workouts[0].notes).toBe('Bine');
  });

  it('păstrează încălzirea, RPE-ul și seriile cronometrate; sare peste cardio pe distanță', () => {
    const sets = r.workouts[0].sets;
    expect(sets.map((s) => `${s.exerciseName} ${s.setType} ${s.weightKg}x${s.reps}${s.timed ? 's' : ''}`)).toEqual([
      'Bench Press (Barbell) warmup 40x10',
      'Bench Press (Barbell) work 80x5',
      'Plank work 0x60s',
    ]);
    expect(sets[1].rpe).toBe(8);
    expect(r.skippedRows).toBe(1);
    expect(r.unitFromUser).toBe(false);
  });
});

describe('Strong', () => {
  it('fără unitate în fișier: folosește alegerea utilizatorului și convertește livrele', () => {
    const r = ok(parseImport(STRONG, 'lb'));
    expect(r.unitFromUser).toBe(true);
    const [w] = r.workouts;
    expect(w.name).toBe('Evening, heavy');
    expect(w.sets.map((s) => s.weightKg)).toEqual([61.23, 102.06, 0]);
    expect(w.sets[0].setType).toBe('warmup');
    expect(w.sets[1].rpe).toBe(9);
    expect(w.endedAt.getTime() - w.startedAt.getTime()).toBe(3900 * 1000);
  });

  it('în kg, greutățile rămân cum sunt', () => {
    expect(ok(parseImport(STRONG, 'kg')).workouts[0].sets[1].weightKg).toBe(225);
  });
});

describe('FitNotes', () => {
  const r = ok(parseImport(FITNOTES, 'kg'));

  it('o zi = un antrenament, unitatea pe rând', () => {
    expect(r.workouts).toHaveLength(2);
    expect(r.unitFromUser).toBe(false);
    expect(r.workouts[1].sets[0].weightKg).toBe(102.06);
    expect(r.workouts[0].categories['Flat Barbell Bench Press']).toBe('Chest');
  });

  it('estimează durata când fișierul nu o are', () => {
    const w = r.workouts[0];
    expect(w.endedAt.getTime() - w.startedAt.getTime()).toBe(20 * 60 * 1000);
  });
});

describe('fișiere greșite', () => {
  it('explică ce nu merge', () => {
    expect(parseImport('')).toMatch(/gol/);
    expect(parseImport('a,b\n1,2\n')).toMatch(/Nu recunosc/);
  });
});

describe('id-uri stabile', () => {
  it('același text dă același UUID valid; alt text, alt UUID', async () => {
    const a = await stableId('hevy', 'u1', 'x');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await stableId('hevy', 'u1', 'x')).toBe(a);
    expect(await stableId('hevy', 'u2', 'x')).not.toBe(a);
  });
});

describe('potrivirea exercițiilor', () => {
  const id = (name: string) => matchExercise(name, BUILTIN_EXERCISES)?.id ?? null;

  it('numele din Hevy și Strong', () => {
    expect(id('Bench Press (Barbell)')).toBe('bench-press');
    expect(id('Bench Press (Dumbbell)')).toBe('db-bench');
    expect(id('Incline Bench Press (Barbell)')).toBe('incline-bench');
    expect(id('Squat (Barbell)')).toBe('back-squat');
    expect(id('Deadlift (Barbell)')).toBe('deadlift');
    expect(id('Romanian Deadlift (Barbell)')).toBe('romanian-deadlift');
    expect(id('Pull Up')).toBe('pull-up');
    expect(id('Chin Up')).toBe('chin-up');
    expect(id('Push Up')).toBe('push-up');
    expect(id('Lat Pulldown (Cable)')).toBe('lat-pulldown');
    expect(id('Lateral Raise (Dumbbell)')).toBe('lateral-raise');
    expect(id('Hammer Curl (Dumbbell)')).toBe('hammer-curl');
    expect(id('Bicep Curl (Barbell)')).toBe('barbell-curl');
    expect(id('Plank')).toBe('plank');
  });

  it('numele din FitNotes', () => {
    expect(id('Flat Barbell Bench Press')).toBe('bench-press');
    expect(id('Barbell Squat')).toBe('back-squat');
    expect(id('Deadlift')).toBe('deadlift');
    expect(id('Dumbbell Curl')).toBe('db-curl');
  });

  it('fără potrivire clară: null, nu un exercițiu greșit', () => {
    expect(id('Calf Raise')).toBeNull(); // în picioare sau așezat? nu ghicim
    expect(id('Zercher Carry')).toBeNull();
    expect(id('')).toBeNull();
  });

  it('echipamentul și grupa pentru exercițiile proprii', () => {
    expect(guessEquipment('Zercher Squat (Barbell)')).toBe('barbell');
    expect(guessEquipment('Sled Push')).toBe('other');
    expect(muscleFromCategory('Legs')).toBe('quads');
    expect(muscleFromCategory('Cardio')).toBeNull();
  });
});
