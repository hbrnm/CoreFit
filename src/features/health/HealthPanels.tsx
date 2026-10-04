import Dexie from 'dexie';
import { ChevronRight, Play } from 'lucide-react';
import {
  EVIDENCE_LABELS,
  GENERAL_DISCLAIMER,
  PROGRAMS,
  REGIONS,
  programById,
  programsForRegion,
} from '../../data/health';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db } from '../../lib/db';
import { formatDateTime } from '../../lib/date';
import { DOMAIN, tone } from '../../lib/domains';
import { Notice, Panel, SyncMark } from '../../components/ui';
import { WeeklyGoals } from '../../components/WeeklyGoals';
import { RecoveryNote } from './RecoveryNote';

const D = DOMAIN.health;

interface HomeProps {
  onOpen: (programId: string) => void;
  onStart: (programId: string) => void;
}

export function HealthHome({ onOpen, onStart }: HomeProps) {
  const { userId } = useApp();
  const { data: sessions } = useLive(
    () =>
      db.healthSessions
        .where('[user_id+completed_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .reverse()
        .filter((s) => !s.deleted)
        .limit(6)
        .toArray(),
    [userId],
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <p className="font-display text-xl font-bold">Pauză de mișcare, 3 minute</p>
        <p className="mt-1 text-[15px] text-fg">Pentru cine stă mult jos. Mers, ridicări de pe scaun și mobilitate.</p>
        <button type="button" className={`btn mt-3 w-full ${D.solid}`} onClick={() => onStart('desk-break')}>
          <Play size={18} />
          Începe pauza
        </button>
      </Panel>

      <WeeklyGoals color={tone('health')} />

      <RecoveryNote />

      <Panel title="Ultimele sesiuni">
        {sessions && sessions.length === 0 && (
          <p className="text-muted">Nicio sesiune încă. Alege un program din secțiunea Programe.</p>
        )}
        <ul className="divide-y divide-line">
          {sessions?.map((s) => {
            const program = programById(s.program_id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="truncate text-left font-semibold"
                    onClick={() => program && onOpen(program.id)}
                  >
                    {program?.title ?? s.program_id}
                  </button>
                  <p className="text-sm text-muted">
                    {formatDateTime(s.completed_at)}, {Math.max(1, Math.round(s.duration_s / 60))} min
                    {s.pain_before !== null && s.pain_after !== null
                      ? `, durere ${s.pain_before}, apoi ${s.pain_after}`
                      : ''}
                    {s.stopped_for_pain ? ', oprită pentru durere' : ''}
                  </p>
                </div>
                <SyncMark status={s.sync_status} />
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

export function ProgramsPanel({ onOpen }: { onOpen: (programId: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {REGIONS.map((region) => {
        const programs = programsForRegion(region.id);
        if (programs.length === 0) return null;
        return (
          <Panel key={region.id} title={region.label}>
            <ul className="divide-y divide-line">
              {programs.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="flex min-h-[56px] w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.title}</span>
                      <span className="block text-sm text-muted">{EVIDENCE_LABELS[p.evidence]}</span>
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

export function InfoPanel() {
  const sources = new Map<string, { label: string; detail: string; url?: string }>();
  for (const p of PROGRAMS) for (const s of p.sources) sources.set(s.label, s);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Cum să folosești programele">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug">
          <li>Durerea nu înseamnă automat leziune. Dar dacă durerea crește clar sau apar simptome noi, oprește-te.</li>
          <li>
            Regula practică pentru exerciții: un disconfort ușor (până la 4 din 10) e acceptabil dacă se liniștește în 24
            de ore. Pentru tendonul lui Ahile, modelul studiat permite până la 5 din 10.
          </li>
          <li>Progresia contează: adaugă încărcare sau repetări încet, când exercițiul devine ușor.</li>
          <li>Constanța bate intensitatea. Un program făcut regulat ajută mai mult decât unul făcut rar și tare.</li>
          <li>Notează durerea înainte și după fiecare sesiune ca să vezi tendința, nu doar ziua de azi.</li>
        </ul>
      </Panel>

      <Panel title="Ce nu poate face această aplicație">
        <p className="text-[15px] leading-snug">{GENERAL_DISCLAIMER}</p>
        <div className="mt-3">
          <Notice tone="warn" title="Sună la 112 sau mergi la urgențe">
            Durere în piept, lipsă de aer, pierderea bruscă a forței sau a sensibilității, dificultăți de vorbire,
            durere de cap explozivă, sau probleme noi cu urinarea împreună cu amorțeală în zona dintre picioare.
          </Notice>
        </div>
      </Panel>

      <Panel title="Toate sursele">
        <ul className="flex flex-col gap-3 text-[15px]">
          {[...sources.values()].map((s) => (
            <li key={s.label}>
              <p className="font-semibold">{s.label}</p>
              <p className="text-muted">{s.detail}</p>
              {s.url && (
                <a className="text-health underline" href={s.url} target="_blank" rel="noreferrer">
                  Deschide sursa
                </a>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
