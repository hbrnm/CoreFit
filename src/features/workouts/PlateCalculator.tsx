import { useState } from 'react';
import { formatNum, parseDecimal } from '../../lib/numbers';
import { platesPerSide } from '../../lib/plates';
import { Panel } from '../../components/ui';

export function PlateCalculator() {
  const [target, setTarget] = useState('100');
  const [bar, setBar] = useState('20');

  const t = parseDecimal(target);
  const b = parseDecimal(bar);
  const result = t !== null && b !== null && t >= b ? platesPerSide(t, b) : null;

  return (
    <Panel title="Calculator de discuri">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="plate-target" className="label">
              Greutate totală (kg)
            </label>
            <input
              id="plate-target"
              className="field"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="plate-bar" className="label">
              Bara (kg)
            </label>
            <input
              id="plate-bar"
              className="field"
              inputMode="decimal"
              value={bar}
              onChange={(e) => setBar(e.target.value)}
            />
          </div>
        </div>
        {result ? (
          <p className="text-[15px]">
            {result.plates.length === 0 ? (
              'Doar bara.'
            ) : (
              <>
                Pe fiecare parte: <strong>{result.plates.map((p) => formatNum(p, 2)).join(', ')}</strong> kg.
              </>
            )}
            {result.leftover > 0 && (
              <span className="text-steel/70"> Rămân {formatNum(result.leftover, 2)} kg care nu se pot încărca.</span>
            )}
          </p>
        ) : (
          <p className="text-[15px] text-steel/70">Greutatea totală trebuie să fie cel puțin cât bara.</p>
        )}
      </div>
    </Panel>
  );
}
