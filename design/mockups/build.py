# Generează machetele HTML din runda 1 (python3 build.py). Iconițele: căi Lucide, inline.
I = {
 'house': '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
 'dumbbell': '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>',
 'apple': '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
 'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 'user': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
 'check': '<path d="M20 6 9 17l-5-5"/>',
 'alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 'drop': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
 'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
 'left': '<path d="m15 18-6-6 6-6"/>', 'right': '<path d="m9 18 6-6-6-6"/>',
 'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 'down': '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
 'trend': '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
}
def ic(n, cls='i', style=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" style="{style}">{I[n]}</svg>'

STATUS = '''<div class="status"><span>9:41</span><span class="icons">
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0zM3.6 7a6.2 6.2 0 0 1 8.8 0l1.5-1.5a8.3 8.3 0 0 0-11.8 0zM.7 4.1a10.3 10.3 0 0 1 14.6 0L16 3.3a11.3 11.3 0 0 0-16 0z" fill="currentColor"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2" fill="currentColor" opacity=".45"/></svg>
</span></div>'''
HEADER = f'<div class="header"><span class="brand">CoreFit</span><span class="sync">{ic("check","i s")}Sincronizat</span></div>'
def tabs(on):
    items = [('house','Acasă'),('dumbbell','Antrenament'),('apple','Nutriție'),('activity','Sănătate'),('user','Profil')]
    return '<nav class="tabs">' + ''.join(f'<a class="{"on" if l==on else ""}">{ic(n)}{l}</a>' for n,l in items) + '</nav>'
def page(title, body, theme):
    return f'''<!doctype html><html lang="ro" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=390">
<link rel="stylesheet" href="style.css"><title>{title}</title></head><body>{body}</body></html>'''
def bar(pct, c='var(--brand)', cls=''):
    return f'<div class="bar {cls}" style="--c:{c}"><i style="width:{pct}%"></i></div>'
def macro(k, v, t, pct, c):
    return f'<div><div class="k">{k}</div><div class="v num">{v} <span>/ {t} g</span></div>{bar(pct, c, "thin")}</div>'
MACROS = '<div class="macros">' + macro('Proteine',128,160,80,'var(--nutrition)') + macro('Carbohidrați',190,260,73,'var(--nutrition)') + macro('Grăsimi',62,75,83,'var(--nutrition)') + '</div>'

def home():
    spark = '<svg viewBox="0 0 300 64" style="width:100%;height:64px;margin-top:10px"><line x1="0" x2="300" y1="62" y2="62" stroke="var(--line)"/><polyline fill="none" stroke="var(--nutrition)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="0,14 25,18 50,12 75,22 100,20 125,26 150,24 175,32 200,30 225,38 250,36 275,44 300,46"/><circle cx="300" cy="46" r="4" fill="var(--nutrition)"/></svg>'
    return STATUS + HEADER + f'''<main>
<div><h1 class="title">Bună, Andrei</h1><div class="sub">Sâmbătă, 3 octombrie</div></div>
<section class="card edge" style="--edge:var(--workouts)">
  <div class="eyebrow">{ic("dumbbell","i s")}Antrenamentul de azi</div>
  <h2 style="font-size:24px">Upper A</h2>
  <div class="muted" style="margin-top:2px">4 exerciții · cam 60 min</div>
  <div class="warn">{ic("alert","i s")}Încă obosite: Piept, Triceps</div>
  <button class="btn primary" style="margin-top:14px">Începe antrenamentul</button>
</section>
<section class="card edge" style="--edge:var(--nutrition)">
  <div class="row"><h2>Azi în nutriție</h2><span class="link small">Jurnal</span></div>
  <div class="row" style="margin:12px 0 8px;justify-content:flex-start;align-items:baseline;gap:8px"><span class="big num">1 840</span><span class="muted">din 2 400 kcal</span></div>
  {bar(77,'var(--nutrition)')}
  {MACROS}
  <div class="divider"></div>
  <div class="row" style="align-items:center"><span style="display:flex;gap:6px;align-items:center;font-weight:600">{ic("drop","i s","color:var(--brand-fg)")}Apă</span><span class="num muted">1 250 / 2 500 ml</span></div>
  <div style="display:flex;gap:12px;align-items:center;margin-top:8px"><div style="flex:1">{bar(50)}</div><button class="btn quiet">{ic("plus","i s")}250 ml</button></div>
</section>
<section class="card">
  <h2>Săptămâna aceasta</h2>
  <div class="row" style="margin-top:12px"><span>Efort aerob</span><span class="num muted">95 / 150 min</span></div>
  <div style="margin-top:6px">{bar(63,'var(--health)')}</div>
  <div class="row" style="margin-top:14px"><span>Zile de forță</span><span class="num muted">2 / 3</span></div>
  <div style="margin-top:6px">{bar(67,'var(--workouts)')}</div>
</section>
<section class="card">
  <div class="row"><h2>Greutate, 30 de zile</h2></div>
  <div class="row" style="justify-content:flex-start;gap:10px;margin-top:8px"><span class="num" style="font-size:28px;font-weight:800;letter-spacing:-.03em">82,4 kg</span><span class="num" style="color:var(--success-text);font-weight:650;display:flex;gap:4px;align-items:center">{ic("down","i s")}−0,6 kg</span></div>
  {spark}
</section>
</main>''' + tabs('Acasă')

def sets_table(rows):
    out = '<table class="sets"><tr><th>Set</th><th>kg</th><th>Rep.</th><th></th></tr>'
    for r in rows:
        n, kg, rep, state = r
        if state == 'cur':
            out += f'<tr class="cur"><td>{n}</td><td><span class="field num">{kg}</span></td><td><span class="field num">{rep}</span></td><td><span class="tick">{ic("check")}</span></td></tr>'
        elif state == 'todo':
            out += f'<tr><td>{n}</td><td class="subtle">{kg}</td><td class="subtle">{rep}</td><td><span class="tick">{ic("check")}</span></td></tr>'
        else:
            out += f'<tr class="done"><td>{n}</td><td>{kg}</td><td>{rep}</td><td><span class="tick on">{ic("check")}</span></td></tr>'
    return out + '</table>'

def workout():
    return STATUS + f'''<div class="topbar"><div><h1 class="title" style="font-size:28px;margin:0">Upper A</h1>
<div class="sub" style="display:flex;gap:6px;align-items:center">{ic("clock","i s")}<span class="num">32 min · 7 din 12 seturi</span></div></div>
<span class="link" style="font-size:17px;padding-top:6px">Termină</span></div>
<div class="progress"><i></i></div>
<main style="padding-top:14px">
<section class="card">
  <h2>Împins cu bara la piept</h2><div class="muted small" style="margin-top:2px">3 × 6–8 · pauză 2:30</div>
  <span class="pill">{ic("trend","i s")}+2,5 kg data viitoare</span>
  {sets_table([(1,80,8,'done'),(2,80,7,'done'),(3,80,6,'done')])}
</section>
<section class="card">
  <h2>Ramat cu bara</h2><div class="muted small" style="margin-top:2px">3 × 8–10 · pauză 2:00</div>
  {sets_table([(1,70,10,'done'),(2,70,9,'done'),(3,70,8,'cur')])}
</section>
<section class="card">
  <h2>Împins deasupra capului</h2><div class="muted small" style="margin-top:2px">3 × 6–8 · pauză 2:00</div>
  {sets_table([(1,'47,5','–','todo'),(2,'47,5','–','todo'),(3,'47,5','–','todo')])}
</section>
<button class="btn outline">{ic("plus","i s")}Adaugă exercițiu</button>
<div style="height:24px"></div>
</main>'''

def meal(name, kcal, items):
    body = ''.join(f'<div class="food"><div><div class="n">{n}</div><div class="subtle small">{q}</div></div><span class="num muted">{k} kcal</span></div>' for n,q,k in items)
    if not items:
        body = f'<div class="food"><span class="subtle">Nimic notat încă</span><span class="link" style="display:flex;gap:4px;align-items:center">{ic("plus","i s")}Adaugă</span></div>'
    return f'<section class="card"><div class="row"><h2 style="font-size:17px">{name}</h2><span class="num muted">{kcal} kcal</span></div>{body}</section>'

def nutrition():
    return STATUS + HEADER + f'''<main>
<div><h1 class="title">Nutriție</h1><div class="sub">Faza: Menținere</div></div>
<div class="seg"><span class="on">Jurnal</span><span>Plan</span><span>Rețete</span><span>Progres</span><span>Unelte</span></div>
<div class="daterow">{ic("left")}<span>Azi, 3 octombrie</span>{ic("right","i off")}</div>
<section class="card edge" style="--edge:var(--nutrition)">
  <div class="row" style="justify-content:flex-start;align-items:baseline;gap:8px"><span class="big num">1 840</span><span class="muted">din 2 400 kcal</span></div>
  <div style="margin-top:10px">{bar(77,'var(--nutrition)')}</div>
  <div class="muted small" style="margin-top:6px">Mai ai 560 kcal pentru azi</div>
  {MACROS}
</section>
{meal('Mic dejun',420,[('Iaurt grecesc cu ovăz și afine','250 g',420)])}
{meal('Prânz',680,[('Piept de pui cu orez și salată','1 porție',680)])}
{meal('Gustare',240,[('Măr și migdale','1 măr, 20 g',240)])}
{meal('Cină',0,[])}
</main>''' + tabs('Nutriție')

for name, fn, title in [('01-home', home, 'Acasă'), ('02-workout', workout, 'Antrenament activ'), ('03-nutrition', nutrition, 'Nutriție')]:
    for theme in ('light', 'dark'):
        open(f'{name}-{theme}.html', 'w').write(page(title, fn(), theme))
print('ok')
