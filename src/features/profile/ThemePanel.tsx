import { useState } from 'react';
import { applyThemePref, readThemePref, THEME_LABELS, type ThemePref } from '../../lib/theme';
import { Panel, Segmented } from '../../components/ui';

const OPTIONS = (Object.keys(THEME_LABELS) as ThemePref[]).map((value) => ({ value, label: THEME_LABELS[value] }));

/** Aspectul aplicației: urmează telefonul sau rămâne fixat pe deschis/închis, doar pe acest dispozitiv. */
export function ThemePanel() {
  const [pref, setPref] = useState<ThemePref>(readThemePref);

  const choose = (next: ThemePref) => {
    setPref(next);
    applyThemePref(next);
  };

  return (
    <Panel title="Aspect">
      <Segmented<ThemePref> label="Aspect" options={OPTIONS} value={pref} onChange={choose} columns={3} />
      <p className="mt-2 text-sm text-muted">
        {pref === 'system' ? 'Urmează setarea telefonului: închis seara, deschis ziua, dacă așa e setat.' : 'Doar pe acest dispozitiv.'}
      </p>
    </Panel>
  );
}
