import { Plus } from 'lucide-react';
import { useApp } from '../../context';
import { DOMAIN, PLATE } from '../../lib/domains';
import { startSession } from '../../lib/workoutOps';
import { WeeklyGoals } from '../../components/WeeklyGoals';
import { Panel } from '../../components/ui';
import { PlateCalculator } from './PlateCalculator';
import { TodayCard } from './TodayCard';
import { WeekPlan } from './WeekPlan';

const D = DOMAIN.workouts;

export function StartPanel() {
  const { userId } = useApp();

  const freestyle = async () => {
    try {
      await startSession(userId, 'Antrenament Liber', null);
    } catch {
      window.alert('Nu s-a putut porni antrenamentul.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <TodayCard />

      <Panel edge={D.edge}>
        <button type="button" className={`btn w-full ${D.solid}`} onClick={() => void freestyle()}>
          <Plus size={18} aria-hidden="true" /> Antrenament liber
        </button>
        <p className="mt-2 text-center text-sm text-steel/60">Îți alegi exercițiile pe parcurs.</p>
      </Panel>

      <WeekPlan />
      <WeeklyGoals color={PLATE.red} />
      <PlateCalculator />
    </div>
  );
}
