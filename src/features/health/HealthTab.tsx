import { useEffect, useState } from 'react';
import { programById } from '../../data/health';
import { onHealthProgramRequest } from '../../lib/intents';
import { Segmented } from '../../components/ui';
import { HealthHome, InfoPanel, ProgramsPanel } from './HealthPanels';
import { PainTracker } from './PainTracker';
import { ProgramPlayer } from './ProgramPlayer';
import { ProgramView } from './ProgramView';
import { PreventionPanel } from './PreventionPanel';


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

  // „Începe pauza” de pe Acasă pornește programul aici
  useEffect(() => onHealthProgramRequest((id) => setPlayingId(programById(id) ? id : null)), []);

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
