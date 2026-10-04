import { useState } from 'react';
import { estimate1RM, formatNum, MAX_1RM_REPS, parseDecimal, weightForReps } from '../../lib/numbers';
import { Panel } from '../../components/ui';


/** 1RM estimat dintr-o serie oarecare și greutatea potrivită pentru 1-12 repetări. */
export function OneRmCalculator() {
  const [weight, setWeight] = useState('100');
  const [reps, setReps] = useState('5');

  const w = parseDecimal(weight);
  const r = parseDecimal(reps);
  const oneRm = w !== null && r !== null && Number.isInteger(r) ? estimate1RM(w, r) : null;
  const tooMany = r !== null && r > MAX_1RM_REPS;

  return (
    <Panel title="Calculator 1RM">
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          Pentru o serie pe care n-ai făcut-o încă: din greutate și repetări, 1RM-ul estimat (formula Epley) și ce greutate
          se potrivește pentru alt număr de repetări.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="orm-weight" className="label">
              Greutate (kg)
            </label>
            <input id="orm-weight" className="field" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label htmlFor="orm-reps" className="label">
              Repetări
            </label>
            <input id="orm-reps" className="field" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
        </div>
        {oneRm === null ? (
          <p className="text-[15px] text-muted">
            {tooMany
              ? `Peste ${MAX_1RM_REPS} repetări estimarea nu mai e de încredere.`
              : 'Scrie o greutate și un număr întreg de repetări.'}
          </p>
        ) : (
          <>
            <p className="text-[15px]">
              1RM estimat: <span className="num text-2xl">{formatNum(oneRm, 1)} kg</span>
            </p>
            <table className="w-full text-[15px] tabular-nums">
              <caption className="sr-only">Greutatea pentru fiecare număr de repetări</caption>
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th scope="col" className="font-normal">Repetări</th>
                  <th scope="col" className="font-normal">Greutate</th>
                  <th scope="col" className="font-normal">% din 1RM</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: MAX_1RM_REPS }, (_, i) => i + 1).map((n) => {
                  const kg = weightForReps(oneRm, n) as number;
                  return (
                    <tr key={n} className={n === r ? 'font-semibold text-workouts' : undefined}>
                      <td>{n}</td>
                      <td>{formatNum(kg, 1)} kg</td>
                      <td>{Math.round((kg / oneRm) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Panel>
  );
}
