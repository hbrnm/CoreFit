# Varianta B (python3 build.py). Iconițele și bara de stare vin din ../mockups/build.py.
import importlib.util, math, os
spec = importlib.util.spec_from_file_location('a', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mockups', 'build.py'))
src = open(spec.origin).read().split("for name, fn, title in")[0]
A = {}; exec(src, A)
ic, STATUS, I = A['ic'], A['STATUS'], A['I']
I.update({
 'coffee': '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
 'cookie': '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
 'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
 'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 'more': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
 'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
})
def page(title, body, theme):
    return f'<!doctype html><html lang="ro" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="style.css"><title>{title}</title></head><body>{body}</body></html>'
def tabs(on):
    items = [('house','Acasă'),('dumbbell','Antrenament'),('apple','Nutriție'),('activity','Sănătate'),('user','Profil')]
    return '<nav class="tabs">' + ''.join(f'<a class="{"on" if l==on else ""}">{ic(n)}{l}</a>' for n,l in items) + '</nav>'
def ring(size, stroke, rings, center=''):
    """rings: list of (pct, colour); concentric, outermost first."""
    out = f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" style="flex:none">'
    for i, (pct, c) in enumerate(rings):
        r = size/2 - stroke/2 - i*(stroke+4); C = 2*math.pi*r
        out += f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="var(--track)" stroke-width="{stroke}"/>'
        out += f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{c}" stroke-width="{stroke}" stroke-linecap="round" stroke-dasharray="{C*pct/100:.1f} {C:.1f}" transform="rotate(-90 {size/2} {size/2})"/>'
    return out + center + '</svg>'

def home():
    kc = ring(124, 13, [(77,'var(--nutrition-ring)')], '<text x="62" y="62" text-anchor="middle" font-size="26" font-weight="850" fill="var(--fg)" font-family="Inter" letter-spacing="-1">1 840</text><text x="62" y="82" text-anchor="middle" font-size="12" font-weight="600" fill="var(--subtle)" font-family="Inter">din 2 400 kcal</text>')
    days = [('L','29','done'),('M','30','cardio'),('M','1','done'),('J','2',''),('V','3','today'),('S','4',''),('D','5','')]
    days[4] = ('S','3','today'); days = [('L','28','done'),('M','29','cardio'),('M','30',''),('J','1','done'),('V','2','cardio'),('S','3','today'),('D','4','')]
    week = '<div class="week">' + ''.join(f'<div class="day {c}">{d}<b>{n}</b></div>' for d,n,c in days) + '</div>'
    return STATUS + f'''<main>
<div class="hello"><div><div class="date">Sâmbătă, 3 octombrie</div><h1 class="title">Bună, Andrei</h1></div><div class="avatar">A</div></div>
<section class="card tint" style="--bg:var(--workouts-bg);--accent:var(--workouts)">
  <div class="k">{ic("dumbbell","i s")}Antrenamentul de azi</div>
  <div class="h">Upper A</div>
  <div class="muted">4 exerciții · cam 60 min</div>
  <div style="margin:12px 0 14px"><span class="chip">{ic("alert","i s")}Încă obosite: Piept, Triceps</span></div>
  <button class="btn primary">{ic("dumbbell","i s")}Începe antrenamentul</button>
</section>
<section class="card">
  <div class="row"><div class="k" style="color:var(--nutrition)">{ic("apple","i s")}Azi în nutriție</div><span class="small" style="color:var(--brand-fg);font-weight:700">Jurnal</span></div>
  <div class="rings" style="margin-top:12px">{kc}
    <div class="legend">
      <div class="l"><span><i class="dot" style="background:var(--protein)"></i>Proteine</span><b>128 / 160 g</b></div>
      <div class="l"><span><i class="dot" style="background:var(--carbs)"></i>Carbohidrați</span><b>190 / 260 g</b></div>
      <div class="l"><span><i class="dot" style="background:var(--fat)"></i>Grăsimi</span><b>62 / 75 g</b></div>
    </div></div>
</section>
<div class="grid2">
  <section class="card stat tint" style="--bg:var(--health-bg);--accent:var(--health)"><div class="k">{ic("drop","i s")}Apă</div><div class="v">1,25 <span>/ 2,5 l</span></div><div class="water">{"".join('<i class="f"></i>' if i<5 else '<i></i>' for i in range(10))}</div></section>
  <section class="card stat"><div class="k" style="color:var(--muted)">{ic("down","i s")}Greutate</div><div class="v">82,4 <span>kg</span></div><div class="small" style="color:var(--success);font-weight:700;margin-top:10px">−0,6 kg în 30 de zile</div></section>
</div>
<section class="card">
  <div class="row"><div class="k" style="color:var(--muted)">{ic("flame","i s")}Săptămâna</div><span class="small muted"><b style="color:var(--fg)">95</b>/150 min aerob · <b style="color:var(--fg)">2</b>/3 forță</span></div>
  {week}
</section>
</main>''' + tabs('Acasă')

def setrow(n, kg, rep, st):
    t = f'<span class="tk {"on" if st=="done" else ""}">{ic("check")}</span>'
    return f'<div class="setrow {st}"><span class="n">{n}</span><span class="cell">{kg}<small>kg</small></span><span class="cell">{rep}<small>rep.</small></span>{t}</div>'

def workout():
    return STATUS + f'''<div class="wtop"><span class="round">{ic("x")}</span><div style="text-align:center"><div style="font-weight:800;font-size:17px">Upper A</div><div class="small subtle">32:14 · 7 din 12 seturi</div></div><span class="finish">Termină</span></div>
<div style="margin:6px 16px 0;height:6px;border-radius:99px;background:var(--track);overflow:hidden"><i style="display:block;height:100%;width:58%;background:var(--workouts-ring);border-radius:99px"></i></div>
<main style="padding-top:14px">
<section class="ex"><div class="exhead"><span class="num">1</span><div><h2>Împins cu bara la piept</h2><div class="small subtle">3 × 6–8 · pauză 2:30</div></div></div>
  {setrow(1,80,8,'done')}{setrow(2,80,7,'done')}{setrow(3,80,6,'done')}
  <div class="hint">{ic("trend","i s")}+2,5 kg data viitoare</div></section>
<section class="ex"><div class="exhead"><span class="num">2</span><div><h2>Ramat cu bara</h2><div class="small subtle">3 × 8–10 · pauză 2:00</div></div></div>
  {setrow(1,70,10,'done')}{setrow(2,70,9,'done')}{setrow(3,70,8,'cur')}</section>
<section class="ex"><div class="exhead"><span class="num">3</span><div><h2>Împins deasupra capului</h2><div class="small subtle">3 × 6–8 · pauză 2:00</div></div></div>
  {setrow(1,'47,5','–','')}{setrow(2,'47,5','–','')}{setrow(3,'47,5','–','')}</section>
</main>
<div class="restbar"><div><div class="lbl">Pauză</div><div class="t">1:45</div></div>
  <div class="pb"><div style="height:6px;border-radius:99px;background:rgba(127,127,127,.35);overflow:hidden"><i style="display:block;height:100%;width:30%;background:var(--brand);border-radius:99px"></i></div><div class="small" style="opacity:.75;margin-top:6px">Urmează: Ramat cu bara, setul 3</div></div>
  <div class="ctl"><span>+15</span><span>Sari</span></div></div>'''

def meal(icon, name, desc, kcal, empty=False):
    right = f'<span class="add">{ic("plus","i s")}</span>' if empty else f'<span class="kc">{kcal}</span>'
    return f'<div class="meal"><span class="mi">{ic(icon)}</span><div class="b"><div class="t">{name}</div><div class="d">{desc}</div></div>{right}</div>'

def nutrition():
    rings = ring(112, 10, [(77,'var(--nutrition-ring)'),(80,'var(--protein)'),(73,'var(--carbs)'),(83,'var(--fat)')])
    return STATUS + f'''<main>
<div class="hello"><div><div class="date">Faza: menținere</div><h1 class="title">Nutriție</h1></div><span class="round">{ic("more")}</span></div>
<div class="seg"><span class="on">Jurnal</span><span>Plan</span><span>Rețete</span><span>Progres</span><span>Unelte</span></div>
<section class="card">
  <div class="row"><span class="round" style="width:32px;height:32px">{ic("left","i s")}</span><b>Azi, 3 octombrie</b><span class="round" style="width:32px;height:32px;opacity:.4">{ic("right","i s")}</span></div>
  <div class="rings" style="margin-top:16px">{rings}
    <div class="legend">
      <div><div class="big">1 840</div><div class="small subtle" style="margin-top:4px">din 2 400 kcal · mai ai 560</div></div>
      <div class="l"><span><i class="dot" style="background:var(--protein)"></i>Proteine</span><b>128 / 160 g</b></div>
      <div class="l"><span><i class="dot" style="background:var(--carbs)"></i>Carbohidrați</span><b>190 / 260 g</b></div>
      <div class="l"><span><i class="dot" style="background:var(--fat)"></i>Grăsimi</span><b>62 / 75 g</b></div>
    </div></div>
</section>
<section class="card">
  {meal('coffee','Mic dejun','Iaurt grecesc cu ovăz și afine · 250 g','420')}
  {meal('sun','Prânz','Piept de pui cu orez și salată · 1 porție','680')}
  {meal('cookie','Gustare','Măr și migdale · 1 măr, 20 g','240')}
  {meal('moon','Cină','Nimic notat încă','',True)}
</section>
</main>''' + tabs('Nutriție')

for name, fn, title in [('01-home', home, 'Acasă B'), ('02-workout', workout, 'Antrenament B'), ('03-nutrition', nutrition, 'Nutriție B')]:
    for theme in ('light', 'dark'):
        open(f'{name}-{theme}.html', 'w').write(page(title, fn(), theme))
print('ok')
