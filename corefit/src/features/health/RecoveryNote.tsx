import { useDayPicture } from '../../components/LongTermPanels';
import { Notice, Panel } from '../../components/ui';

/** Ce se poate spune din sesiunile și notele de durere, fără evaluare medicală. */
export function RecoveryNote() {
  const picture = useDayPicture();
  if (!picture) return null;

  const body =
    picture.painNotes.length > 0
      ? `${picture.painNotes.join(' ')} Asta nu este un diagnostic. Dacă durerea e intensă, după o lovitură, sau nu se liniștește, discută cu un medic.`
      : picture.healthSessionLast7
        ? 'Ai o sesiune de mobilitate în ultimele 7 zile.'
        : 'Nu ai o sesiune de mobilitate în ultimele 7 zile. Poți începe cu pauza de 3 minute, dacă stai mult jos.';

  return (
    <Panel title="Recuperare">
      <p className="text-[15px] leading-snug">{body}</p>
      {picture.painNotes.length === 0 && (
        <p className="mt-2 text-sm text-steel/60">Durerea se citește doar din ce ai notat tu. Lipsa notelor nu înseamnă că nu există o problemă.</p>
      )}
      {picture.painNotes.length > 0 && (
        <div className="mt-3">
          <Notice tone="warn">{picture.painNotes.join(' ')}</Notice>
        </div>
      )}
    </Panel>
  );
}
