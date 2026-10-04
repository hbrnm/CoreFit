// Capturi de ecran ale aplicației reale, în modul local, cu datele demo din src/dev/seedDemo.ts.
// Folosire: pornește `npx vite --port 5199` (fără VITE_SUPABASE_* în mediu), apoi
//   node scripts/screenshots.mjs <folder> [scenariu...]
// Scenariile sunt funcțiile din SCENES de mai jos; implicit toate. Fiecare iese în modul
// deschis și închis, la 390 × 844 (iPhone), 2x. Playwright nu e dependență a proiectului:
// scriptul folosește Chromium-ul și pachetul instalate pe mașina care face capturile.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.SCREENS_URL ?? 'http://127.0.0.1:5199/';
const [out = 'screens', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const tab = (name) => async (p) => {
  await p.getByRole('navigation', { name: 'Secțiuni' }).getByRole('button', { name }).click();
  await p.waitForTimeout(500);
};

const sub = (tabName, name) => async (p) => {
  await tab(tabName)(p);
  await p.getByRole('tab', { name }).click();
  await p.waitForTimeout(500);
};
const startWorkout = async (p) => {
  await tab('Acasă')(p);
  await p.getByRole('button', { name: 'Începe antrenamentul' }).first().click();
  await p.waitForTimeout(700);
};
const tickSets = (n) => async (p) => {
  for (let i = 0; i < n; i += 1) {
    // după fiecare bifare se deschide pauza pe tot ecranul; ultima rămâne deschisă
    const back = p.getByRole('button', { name: 'Înapoi la serii' });
    if (await back.count()) await back.click();
    await p.getByRole('button', { name: 'Bifează seria' }).first().click();
    await p.waitForTimeout(300);
  }
};

export const SCENES = {
  '01-home': { seed: 'full', go: tab('Acasă') },
  '01b-home-empty': { seed: 'empty', go: tab('Acasă') },
  '03-nutrition': { seed: 'full', go: tab('Nutriție') },
  '03b-entry': {
    seed: 'full',
    go: async (p) => {
      await tab('Nutriție')(p);
      await p.getByRole('button', { name: /Iaurt grecesc.*Schimbă/ }).first().click();
      await p.waitForTimeout(400);
    },
  },
  '03c-add': {
    seed: 'full',
    go: async (p) => {
      await tab('Nutriție')(p);
      await p.getByRole('button', { name: /Adaugă la cină/ }).click();
      await p.waitForTimeout(500);
    },
  },
  '03d-plan': { seed: 'full', go: sub('Nutriție', 'Plan') },
  '03e-recipes': { seed: 'full', go: sub('Nutriție', 'Rețete') },
  '03f-progress': { seed: 'full', go: sub('Nutriție', 'Progres') },
  '03g-tools': { seed: 'full', go: sub('Nutriție', 'Unelte') },
  '05b-gallery': { seed: 'full', go: sub('Antrenament', 'Galerie') },
  '05c-history': { seed: 'full', go: sub('Antrenament', 'Istoric') },
  '05d-progress': { seed: 'full', go: sub('Antrenament', 'Progres') },
  '05-start': { seed: 'full', go: tab('Antrenament') },
  '02-workout': {
    seed: 'full',
    go: async (p) => {
      await startWorkout(p);
      await tickSets(2)(p);
      const back = p.getByRole('button', { name: 'Înapoi la serii' });
      if (await back.count()) await back.click();
      await p.waitForTimeout(300);
    },
  },
  '04-rest': { seed: 'full', go: async (p) => { await startWorkout(p); await tickSets(2)(p); await p.waitForTimeout(1200); } },
  '07-health': {
    seed: 'full',
    go: async (p) => {
      await tab('Sănătate')(p);
      // programul McGill pe tot ecranul, ca în machetă: câteva secunde în primul curl-up
      await p.getByRole('tab', { name: 'Programe' }).click();
      await p.getByRole('button', { name: /Big 3 McGill/ }).first().click();
      await p.getByRole('button', { name: 'Start' }).click();
      await p.waitForTimeout(3200);
    },
  },
  '07b-spine': { seed: 'full', go: tab('Sănătate') },
  '07c-library': { seed: 'full', go: sub('Sănătate', 'Programe') },
  '07d-program': {
    seed: 'full',
    go: async (p) => {
      await tab('Sănătate')(p);
      await p.getByRole('button', { name: 'Începe pauza' }).click();
      await p.getByRole('button', { name: 'Începe', exact: true }).click();
      await p.waitForTimeout(500);
    },
  },
  '05e-warning': {
    seed: 'full',
    go: async (p) => {
      await startWorkout(p);
    },
  },
  '08-profile': { seed: 'full', go: tab('Profil') },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
for (const [name, scene] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('corefit_local_user_id', 'demo-user'));
    await p.evaluate(async (seed) => {
      const { seedDemo } = await import('/src/dev/seedDemo.ts');
      await seedDemo('demo-user', seed);
    }, scene.seed);
    await p.reload();
    await p.waitForTimeout(800);
    await scene.go(p);
    await p.screenshot({ path: `${out}/${name}-${scheme}.png` });
    await p.addStyleTag({ content: 'nav.tabbar{position:absolute!important} body{position:relative}' });
    await p.screenshot({ path: `${out}/${name}-${scheme}-full.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
console.log('capturi în', out);
