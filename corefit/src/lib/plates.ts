const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Discurile de pe fiecare parte a barei, pentru greutatea dorită. */
export function platesPerSide(target: number, bar: number): { plates: number[]; leftover: number } {
  let remaining = Math.max(0, (target - bar) / 2);
  const plates: number[] = [];
  for (const p of PLATES) {
    while (remaining + 1e-9 >= p) {
      plates.push(p);
      remaining -= p;
    }
  }
  return { plates, leftover: Math.round(remaining * 2 * 100) / 100 };
}
