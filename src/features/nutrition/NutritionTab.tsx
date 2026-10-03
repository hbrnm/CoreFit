import { useState } from 'react';
import { useApp } from '../../context';
import { DOMAIN } from '../../lib/domains';
import { PHASE_LABELS } from '../../lib/labels';
import { Segmented } from '../../components/ui';
import { Diary } from './Diary';
import { ProgressPanel } from './ProgressPanel';
import { RecipesPanel } from './RecipesPanel';
import { ToolsPanel } from './ToolsPanel';
import { WeekPlanPanel } from './WeekPlanPanel';

const D = DOMAIN.nutrition;

type Sub = 'diary' | 'plan' | 'recipes' | 'progress' | 'tools';

const SUBS: ReadonlyArray<{ value: Sub; label: string }> = [
  { value: 'diary', label: 'Jurnal' },
  { value: 'plan', label: 'Plan' },
  { value: 'recipes', label: 'Rețete' },
  { value: 'progress', label: 'Progres' },
  { value: 'tools', label: 'Unelte' },
];

export function NutritionTab() {
  const { profile } = useApp();
  const [sub, setSub] = useState<Sub>('diary');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight">Nutriție</h1>
        {profile && <p className="text-muted">Faza: {PHASE_LABELS[profile.nutrition_phase]}</p>}
      </div>
      <Segmented<Sub> label="Secțiuni nutriție" options={SUBS} value={sub} onChange={setSub} activeClass={D.solid} columns={5} />
      {sub === 'diary' && <Diary />}
      {sub === 'plan' && <WeekPlanPanel />}
      {sub === 'recipes' && <RecipesPanel />}
      {sub === 'progress' && <ProgressPanel />}
      {sub === 'tools' && <ToolsPanel />}
    </div>
  );
}
