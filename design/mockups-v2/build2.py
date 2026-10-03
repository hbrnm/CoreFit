# Runda 2 (python3 build2.py): Pauză, Antrenament Start, Progres, Sănătate (C); Profil, Conectare (carduri).
import os
here = os.path.dirname(os.path.abspath(__file__))
def load(folder):
    path = os.path.join(here, '..', folder, 'build.py')
    g = {'__file__': path}; exec(open(path).read().rsplit("\nfor name, fn, title in", 1)[0], g); return g
A, C = load('mockups'), load('mockups-c')
ic, STATUS, I = A['ic'], A['STATUS'], A['I']
I.update({'pause': '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
          'down2': '<path d="m6 9 6 6 6-6"/>', 'download': '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
          'upload': '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'})
TOPC, tabsC, tabsA, HEADERA = C['TOP'], C['tabs'], A['tabs'], A['HEADER']
def page(title, body, theme, css):
    return f'<!doctype html><html lang="ro" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="{css}"><title>{title}</title></head><body>{body}</body></html>'
def ring(size, stroke, pct, inner):
    import math; r = size/2 - stroke/2; L = 2*math.pi*r
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" style="display:block;margin:0 auto">'
            f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="var(--fill)" stroke-width="{stroke}"/>'
            f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="var(--fg)" stroke-width="{stroke}" stroke-linecap="round" stroke-dasharray="{L*pct/100:.1f} {L:.1f}" transform="rotate(-90 {size/2} {size/2})"/>{inner}</svg>')
def txt(x, y, s, size, w, fill='var(--fg)'):
    return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Inter" font-size="{size}" font-weight="{w}" fill="{fill}" letter-spacing="{-size*0.04:.1f}">{s}</text>'

def rest():
    inner = txt(140, 150, '1:45', 72, 800) + txt(140, 186, 'din 2:00', 16, 600, 'var(--subtle)')
    return STATUS + f'''<div class="fullscreen"><div class="wtop"><span class="link">Înapoi la seturi</span><span class="timer">{ic("clock","i s")}33:59</span><span></span></div>
<main style="flex:1;display:flex;flex-direction:column">
<div class="cap" style="margin-top:28px;justify-content:center">Pauză</div>
<div style="margin-top:22px">{ring(280, 10, 87.5, inner)}</div>
<div style="text-align:center;margin-top:28px"><div class="small subtle">Urmează</div><div style="font-size:22px;font-weight:800;letter-spacing:-.02em;margin-top:4px">Ramat cu bara · setul 3</div><div class="muted" style="margin-top:2px">70 kg × 8 rep.</div></div>
<div style="flex:1"></div>
<div class="ctrls"><span>−15 s</span><span>+15 s</span></div>
<button class="btn center" style="margin-top:10px">Sari peste pauză</button>
</main></div>'''

def start():
    plan = [('Lun','Upper A','făcut'),('Mar','Cardio, 30 min','făcut'),('Mie','Odihnă',''),('Joi','Lower A','făcut'),('Vin','Cardio, 25 min','făcut'),('Sâm','Upper A','azi'),('Dum','Odihnă','')]
    rows = ''.join(f'<div class="li"><div style="display:flex;gap:14px;align-items:baseline"><span class="d" style="width:30px">{d}</span><b style="font-weight:{800 if s=="azi" else 600}">{r}</b></div><span class="d">{"Azi" if s=="azi" else ("" if not s else ic("check","i s"))}</span></div>' for d,r,s in plan)
    ex = ''.join(f'<div class="li"><span>{n}</span><span class="d">{s}</span></div>' for n,s in [('Împins cu bara la piept','3 × 6–8 · 80 kg'),('Ramat cu bara','3 × 8–10 · 70 kg'),('Împins deasupra capului','3 × 6–8 · 47,5 kg'),('Tracțiuni + Flotări la paralele','superset · 3 runde')])
    return STATUS + TOPC + f'''<main>
<div class="display" style="font-size:40px">Antrenament</div>
<div class="useg"><span class="on">Start</span><span>Galerie</span><span>Istoric</span><span>Progres</span></div>
<section class="first" style="padding-bottom:16px">
  <div class="cap"><i></i>Azi</div>
  <div class="h">Upper A</div>
  <div class="muted">cam 60 min · Încă obosite: Piept, Triceps</div>
  <div class="list" style="margin:10px 0 16px">{ex}</div>
  <button class="btn">Începe antrenamentul {ic("right")}</button>
  <button class="btn ghost" style="margin-top:10px">Antrenament liber</button>
</section>
<section>
  <div class="row"><div class="cap">Planul săptămânii</div><span class="link small">Modifică</span></div>
  <div class="list" style="margin-top:8px">{rows}</div>
</section>
</main>''' + tabsC('Antrenament')

def progress():
    pts = [(0,90),(1,90),(2,91.5),(3,92),(4,92),(5,93.5),(6,95),(7,95),(8,96),(9,97.5)]
    xs = lambda i: 4 + i*(332/9); ys = lambda v: 112 - (v-89)/9*96
    poly = ' '.join(f'{xs(i):.1f},{ys(v):.1f}' for i,v in pts)
    chart = (f'<svg viewBox="0 0 340 130" style="width:100%;margin-top:14px"><line x1="0" x2="340" y1="112" y2="112" stroke="var(--line)"/><line x1="0" x2="340" y1="16" y2="16" stroke="var(--line)" stroke-dasharray="3 4"/>'
             f'<polyline points="{poly}" fill="none" stroke="var(--fg)" stroke-width="2.5" stroke-linejoin="round"/><circle cx="{xs(9):.1f}" cy="{ys(97.5):.1f}" r="4.5" fill="var(--fg)"/>'
             f'<text x="0" y="128" font-family="Inter" font-size="11" fill="var(--subtle)">8 aug</text><text x="340" y="128" text-anchor="end" font-family="Inter" font-size="11" fill="var(--subtle)">3 oct</text></svg>')
    fat = [('Piept','Obosit',78),('Triceps','Obosit',64),('Umeri','Parțial',41),('Spate','Parțial',33),('Picioare','Odihnit',8),('Abdomen','Odihnit',5)]
    frows = ''.join(f'<div class="li"><b style="font-weight:600">{m}</b><div class="mini"><span class="d" style="width:56px;text-align:right">{s}</span><span class="bar"><i style="width:{p}%"></i></span></div></div>' for m,s,p in fat)
    return STATUS + TOPC + f'''<main>
<div class="display" style="font-size:40px">Antrenament</div>
<div class="useg"><span>Start</span><span>Galerie</span><span>Istoric</span><span class="on">Progres</span></div>
<section class="first">
  <div class="cap">1RM estimat</div>
  <div class="pick">Împins cu bara la piept {ic("down2","i s")}</div>
  <div class="mega" style="margin-top:18px">97,5<small>kg</small></div>
  <div class="small muted" style="margin-top:6px">+7,5 kg în 8 săptămâni · din 80 kg × 8</div>
  {chart}
</section>
<section>
  <div class="row"><div class="cap">Oboseala pe grupe</div><span class="small subtle">acum</span></div>
  <div class="list" style="margin-top:6px">{frows}</div>
</section>
</main>''' + tabsC('Antrenament')

def health():
    inner = txt(140, 140, '0:07', 64, 800) + txt(140, 176, 'Ține', 18, 650, 'var(--muted)')
    steps = ''.join(f'<i class="{"f" if i<4 else ""}"></i>' for i in range(12))
    return STATUS + f'''<div class="fullscreen"><div class="wtop"><span class="link">Închide</span><span class="timer">{ic("clock","i s")}4:12</span><span class="link">{ic("pause","i s")}</span></div>
<main style="flex:1;display:flex;flex-direction:column">
<div class="display" style="font-size:36px;margin-top:14px">McGill Big 3</div>
<div class="lead">Pasul 4 din 12</div>
<div class="ticks">{steps}</div>
<div style="margin-top:34px">{ring(280, 10, 70, inner)}</div>
<div style="text-align:center;margin-top:26px"><div style="font-size:24px;font-weight:800;letter-spacing:-.02em">Curl-up modificat</div><div class="muted" style="margin-top:4px">Repetarea 2 din 5 · 10 s fiecare</div><div class="small subtle" style="margin-top:10px;padding:0 12px">Un genunchi îndoit, mâinile sub zona lombară. Ridică doar capul și umerii.</div></div>
<div style="flex:1"></div>
<button class="btn ghost" style="margin-bottom:24px">Mă doare, opresc</button>
</main></div>'''

def profile():
    row = lambda k, v, chev=True: f'<div class="li"><span>{k}</span><span class="v">{v}{ic("right") if chev else ""}</span></div>'
    return STATUS + HEADERA + f'''<main>
<div><h1 class="title">Profil</h1><div class="sub">andrei@exemplu.ro</div></div>
<section class="card group"><div class="gh">Aspect</div><div class="seg3"><span class="on">Automat</span><span>Deschis</span><span>Închis</span></div></section>
<section class="card group"><div class="gh">Date personale</div>
  {row('Nume','Andrei')}{row('Sex','Bărbat')}{row('An naștere','1990')}{row('Înălțime','182 cm')}{row('Activitate','Moderată')}</section>
<section class="card group"><div class="gh">Antrenament și nutriție</div>
  {row('Program','Upper / Lower')}{row('Faza','Menținere')}{row('Scală de efort','RIR')}{row('Săptămâna începe','Luni')}</section>
<section class="card group"><div class="gh">Date și cont</div>
  {row('Descarcă o copie', ic('download'), False)}{row('Importă din Hevy, Strong, FitNotes', ic('upload'), False)}
  <div class="li"><span class="danger">Deconectare</span><span></span></div></section>
</main>''' + tabsA('Profil')

def login():
    return STATUS + f'''<main style="padding-top:56px">
<div style="text-align:center"><div style="font-size:44px;font-weight:850;letter-spacing:-.045em">CoreFit</div>
<div class="sub" style="font-size:16px;max-width:30ch;margin:8px auto 0">Antrenament, coloană și nutriție. Notezi și fără internet, se sincronizează după.</div></div>
<section class="card" style="margin-top:28px">
  <div class="seg2"><span class="on">Conectare</span><span>Cont nou</span></div>
  <div class="lbl">Email</div><div class="input">andrei@exemplu.ro</div>
  <div class="lbl">Parolă</div><div class="input ph">••••••••••</div>
  <button class="btn primary" style="margin-top:18px">Conectează-te</button>
  <div style="text-align:center;margin-top:14px"><span class="link small">Ai uitat parola?</span></div>
</section>
<div class="small subtle" style="text-align:center;margin-top:18px;padding:0 20px">Fără cont? Folosește aplicația doar pe acest telefon. Datele rămân aici.</div>
<div style="text-align:center;margin-top:8px"><span class="link small">Continuă fără cont</span></div>
</main>'''

for name, fn, title, css in [('04-rest', rest, 'Pauză', 'c.css'), ('05-start', start, 'Antrenament', 'c.css'), ('06-progress', progress, 'Progres', 'c.css'),
                             ('07-health', health, 'Program ghidat', 'c.css'), ('08-profile', profile, 'Profil', 'a.css'), ('09-login', login, 'Conectare', 'a.css')]:
    for theme in ('light', 'dark'):
        open(f'{name}-{theme}.html', 'w').write(page(title, fn(), theme, css))
print('ok')
