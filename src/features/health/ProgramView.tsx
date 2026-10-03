import { ChevronLeft, Play } from 'lucide-react';
import { EVIDENCE_LABELS, GENERAL_DISCLAIMER, type HealthProgram } from '../../data/health';
import { DOMAIN } from '../../lib/domains';
import { Notice, Panel } from '../../components/ui';
import { McGillBigThree } from '../spine-health/McGillBigThree';
import { SpineAssessment } from '../spine-health/SpineAssessment';

const D = DOMAIN.health;

interface Props {
  program: HealthProgram;
  onBack: () => void;
  onStart: () => void;
}

export function ProgramView({ program, onBack, onStart }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="-ml-1 flex min-h-[44px] items-center gap-1 self-start font-semibold text-health" onClick={onBack}>
        <ChevronLeft size={20} />
        Programe
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold leading-tight">{program.title}</h1>
        <p className="mt-1 text-[15px] text-fg">{program.forWhom}</p>
        <p className="mt-2 inline-block rounded bg-health/10 px-2 py-0.5 text-sm font-semibold text-health">
          {EVIDENCE_LABELS[program.evidence]}
        </p>
      </div>

      <Panel title="Ce spune dovada" edge={D.edge}>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug">
          {program.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {program.notRecommended && (
          <div className="mt-3">
            <Notice tone="info" title="Ce nu e recomandat">
              <ul className="list-disc pl-5">
                {program.notRecommended.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Notice>
          </div>
        )}
      </Panel>

      {program.special === 'mcgill' ? (
        <>
          <McGillBigThree />
          <SpineAssessment />
        </>
      ) : (
        <>
          <Panel title="Planul">
            <p className="text-[15px]">
              <strong>Cât de des:</strong> {program.frequency}
            </p>
            <p className="mt-2 text-[15px]">
              <strong>Regula durerii:</strong> {program.painRule}
            </p>
            <ol className="mt-4 flex flex-col gap-4">
              {program.exercises.map((ex, i) => (
                <li key={ex.id} className="border-t border-line pt-3">
                  <p className="font-semibold">
                    {i + 1}. {ex.name}
                  </p>
                  <p className="text-sm text-muted">
                    {ex.sets} {ex.sets === 1 ? 'serie' : 'serii'} x{' '}
                    {ex.kind === 'hold' ? `${ex.holdS} secunde` : `${ex.reps} repetări`}
                    {ex.perSide ? ', pe fiecare parte' : ''}
                  </p>
                  <p className="mt-1 text-[15px] leading-snug">{ex.how}</p>
                  {ex.progress && <p className="mt-1 text-sm text-muted">{ex.progress}</p>}
                </li>
              ))}
            </ol>
            <button type="button" className={`btn mt-4 w-full ${D.solid}`} onClick={onStart}>
              <Play size={18} />
              Începe programul
            </button>
          </Panel>
        </>
      )}

      <Notice tone="warn" title="Când să ceri un consult medical">
        <ul className="list-disc pl-5">
          {program.redFlags.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Notice>

      <Panel title="Surse">
        <ul className="flex flex-col gap-3 text-[15px]">
          {program.sources.map((s) => (
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

      <p className="text-sm text-muted">{GENERAL_DISCLAIMER}</p>
    </div>
  );
}
