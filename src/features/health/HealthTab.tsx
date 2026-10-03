import { useState } from 'react';
import { programById } from '../../data/health';
import { DOMAIN } from '../../lib/domains';
import { Segmented } from '../../components/ui';
import { HealthHome, InfoPanel, ProgramsPanel } from './HealthPanels';
import { PainTracker } from './PainTracker';
import { ProgramPlayer } from './ProgramPlayer';
import { ProgramView } from './ProgramView';
import { PreventionPanel } from './PreventionPanel';

const D = DOMAIN.health;

type Sub = 'today' | 'programs' | 'pain' | 'info' | 'prevent';

const SUBS: ReadonlyArray<{ value: Sub; label: string }> = [
  { value: 'today', label: 'Azi' },
  { value: 'programs', label: 'Programe' },
  { value: 'pain', label: 'Durere' },
  { value: 'info', label: 'Ghid' },
  { value: 'prevent', label: 'Prevenție' },
];

export function HealthTab() {
  const [sub, setSub] = useState<Sub>('today');
  const [openId, setOpenId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playing = playingId ? programById(playingId) : undefined;
  const open = openId ? programById(openId) : undefined;

  if (playing) {
    return <ProgramPlayer key={playing.id} program={playing} onExit={() => setPlayingId(null)} />;
  }

  if (open) {
    return <ProgramView program={open} onBack={() => setOpenId(null)} onStart={() => setPlayingId(open.id)} />;
  }

  const openProgram = (id: string) => {
    setSub('programs');
    setOpenId(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight">Sănătate</h1>
        <p className="text-muted">Mișcare pe baza ghidurilor și a studiilor.</p>
      </div>
      <Segmented<Sub>
        label="Secțiuni sănătate"
        options={SUBS}
        value={sub}
        onChange={setSub}
        activeClass={D.solid}
        columns={2}
      />
      {sub === 'today' && <HealthHome onOpen={openProgram} onStart={setPlayingId} />}
      {sub === 'programs' && <ProgramsPanel onOpen={setOpenId} />}
      {sub === 'pain' && <PainTracker />}
      {sub === 'info' && <InfoPanel />}
      {sub === 'prevent' && <PreventionPanel />}
    </div>
  );
}
