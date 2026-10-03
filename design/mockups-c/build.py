# Varianta C (python3 build.py). Iconițele și bara de stare vin din ../mockups/build.py.
import importlib.util, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mockups', 'build.py')
A = {}; exec(open(p).read().split("for name, fn, title in")[0], A)
ic, STATUS = A['ic'], A['STATUS']
def page(title, body, theme):
    return f'<!doctype html><html lang="ro" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="style.css"><title>{title}</title></head><body>{body}</body></html>'
def tabs(on):
    items = [('house','Acasă'),('dumbbell','Antrenament'),('apple','Nutriție'),('activity','Sănătate'),('user','Profil')]
    return '<nav class="tabs">' + ''.join(f'<a class="{"on" if l==on else ""}">{ic(n)}{l}</a>' for n,l in items) + '</nav>'
TOP = f'<div class="top"><b>CoreFit</b><span style="display:flex;gap:5px;align-items:center">{ic("check","i s")}Sincronizat</span></div>'
STACK = '<div class="stack"><i style="width:27%;background:var(--brand)"></i><i style="width:32%;background:var(--fg);opacity:.55"></i><i style="width:18%;background:var(--fg);opacity:.25"></i></div>'
KV = '<div class="kv"><div><div class="v">128<span> / 160 g</span></div><div class="k"><i style="--c:var(--brand)"></i>Proteine</div></div><div><div class="v">190<span> / 260 g</span></div><div class="k"><i style="--c:var(--fg);opacity:.55"></i>Carbohidrați</div></div><div><div class="v">62<span> / 75 g</span></div><div class="k"><i style="--c:var(--fg);opacity:.25"></i>Grăsimi</div></div></div>'

def home():
    return STATUS + TOP + f'''<main>
<div class="display">Bună,<br>Andrei.</div>
<div class="lead">Sâmbătă, 3 octombrie. Azi e zi de forță.</div>
<section style="margin-top:22px">
  <div class="cap"><i style="--c:var(--workouts)"></i>Antrenamentul de azi</div>
  <div class="h">Upper A</div>
  <div class="muted">4 exerciții · cam 60 min</div>
  <div class="small subtle" style="margin:6px 0 16px">Încă obosite: Piept, Triceps</div>
  <button class="btn">Începe antrenamentul {ic("right")}</button>
</section>
<section>
  <div class="row"><div class="cap"><i style="--c:var(--nutrition)"></i>Azi în nutriție</div><span class="link small">Jurnal</span></div>
  <div class="mega" style="margin-top:12px">1 840<small>/ 2 400 kcal</small></div>
  {STACK}{KV}
</section>
<section>
  <div class="cap" style="margin-bottom:4px">Pe scurt</div>
  <div class="line2"><span>Apă</span><span class="v">1 250 <span class="subtle" style="font-weight:500">/ 2 500 ml</span></span></div>
  <div class="line2"><span>Greutate</span><span class="v">82,4 kg <span class="subtle" style="font-weight:500">· −0,6 în 30 de zile</span></span></div>
  <div class="line2"><span>Efort aerob</span><span class="v">95 <span class="subtle" style="font-weight:500">/ 150 min</span></span></div>
  <div class="line2"><span>Zile de forță</span><span class="v">2 <span class="subtle" style="font-weight:500">/ 3</span></span></div>
</section>
</main>''' + tabs('Acasă')

def sets(rows):
    o = '<table class="sets">'
    for n, kg, rep, st in rows:
        tick = f'<span class="c {"on" if st=="done" else ""}">{ic("check")}</span>'
        if st == 'cur':
            o += f'<tr class="cur"><td class="n">{n}</td><td><span class="box">{kg}</span></td><td class="u">kg</td><td class="x">×</td><td><span class="box">{rep}</span></td><td class="u">rep.</td><td class="ok">{tick}</td></tr>'
        else:
            o += f'<tr class="{st}"><td class="n">{n}</td><td>{kg}</td><td class="u">kg</td><td class="x">×</td><td>{rep}</td><td class="u">rep.</td><td class="ok">{tick}</td></tr>'
    return o + '</table>'

def workout():
    return STATUS + f'''<div class="wtop"><span class="link">Închide</span><span class="timer">{ic("clock","i s")}32:14</span><span class="link">Termină</span></div>
<main style="padding-top:4px">
<div class="display" style="font-size:40px;margin-top:14px">Upper A</div>
<div class="lead">7 din 12 seturi</div>
<div class="ticks">{"".join('<i class="f"></i>' if i<7 else '<i></i>' for i in range(12))}</div>
<div class="ex" style="margin-top:22px"><div class="t">Împins cu bara la piept</div><div class="small subtle">3 × 6–8 · pauză 2:30</div>
  {sets([(1,80,8,'done'),(2,80,7,'done'),(3,80,6,'done')])}
  <div class="note">{ic("trend","i s")}Data viitoare: 82,5 kg</div></div>
<div class="ex"><div class="t">Ramat cu bara</div><div class="small subtle">3 × 8–10 · pauză 2:00</div>
  {sets([(1,70,10,'done'),(2,70,9,'done'),(3,70,8,'cur')])}</div>
<div class="ex"><div class="t">Împins deasupra capului</div><div class="small subtle">3 × 6–8 · pauză 2:00</div>
  {sets([(1,'47,5','–',''),(2,'47,5','–',''),(3,'47,5','–','')])}</div>
</main>
<div class="dock"><div class="rest"><div class="cap">Pauză</div><b>1:45</b> <span class="subtle small">· apoi Ramat, setul 3</span></div><span class="go">Set gata</span></div>'''

def meal(name, kcal, item):
    body = f'<div class="item"><span>{item[0]}</span><span>{item[1]}</span></div>' if item else f'<div class="item"><span class="subtle">Nimic notat încă</span><span class="link">+ Adaugă</span></div>'
    return f'<div class="meal"><div class="row"><b>{name}</b><span class="subtle">{kcal} kcal</span></div>{body}</div>'

def nutrition():
    return STATUS + TOP + f'''<main>
<div class="display" style="font-size:40px">Nutriție</div>
<div class="lead">Menținere · Azi, 3 octombrie</div>
<div class="seg"><span class="on">Jurnal</span><span>Plan</span><span>Rețete</span><span>Progres</span><span>Unelte</span></div>
<section class="first">
  <div class="mega">1 840<small>/ 2 400 kcal</small></div>
  <div class="small subtle" style="margin-top:8px">Mai ai 560 kcal pentru azi</div>
  {STACK}{KV}
</section>
<section style="padding-top:6px">
  {meal('Mic dejun',420,('Iaurt grecesc cu ovăz și afine · 250 g','420'))}
  {meal('Prânz',680,('Piept de pui cu orez și salată · 1 porție','680'))}
  {meal('Gustare',240,('Măr și migdale · 1 măr, 20 g','240'))}
  {meal('Cină',0,None)}
</section>
</main>''' + tabs('Nutriție')

for name, fn, title in [('01-home', home, 'Acasă C'), ('02-workout', workout, 'Antrenament C'), ('03-nutrition', nutrition, 'Nutriție C')]:
    for theme in ('light', 'dark'):
        open(f'{name}-{theme}.html', 'w').write(page(title, fn(), theme))
print('ok')
