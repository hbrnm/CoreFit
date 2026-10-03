# Decizia 8 (python3 build3.py): Acasă în stil Apple Health; Progres cu bare pe săptămâni.
import os
here = os.path.dirname(os.path.abspath(__file__))
B = {'__file__': os.path.join(here, 'build2.py')}
exec(open(os.path.join(here, 'build2.py')).read().rsplit("\nfor name, fn, title, css in", 1)[0], B)
ic, STATUS, I, page, tabsA, tabsC, TOPC = B['ic'], B['STATUS'], B['I'], B['page'], B['tabsA'], B['tabsC'], B['TOPC']
I['flame'] = '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
I['scale'] = '<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/>'

def hcard(color, icon, label, when, body):
    return (f'<section class="hc" style="--cc:var(--c-{color})"><div class="hd"><span class="lab">{ic(icon)}{label}</span>'
            f'<span class="when">{when}{ic("right")}</span></div>{body}</section>')
def minibars(vals, hi_last=True):
    m = max(vals)
    return '<div class="minibars">' + ''.join(f'<i class="{"hi" if hi_last and k==len(vals)-1 else ""}" style="height:{max(4,v/m*44):.0f}px"></i>' for k,v in enumerate(vals)) + '</div>'
def trend(vals, avg, lab, left, right):
    m = max(vals)*1.08; y = 96 - avg/m*96
    bars = ''.join(f'<i style="height:{v/m*96:.0f}px"></i>' for v in vals)
    return (f'<div class="trend">{bars}<span class="avg" style="top:{y:.0f}px"></span><span class="avgl" style="top:{y-20:.0f}px">{lab}</span></div>'
            f'<div class="tl"><span>{left}</span><span>{right}</span></div>')

def home():
    kcal7 = [2350, 2120, 2480, 2210, 1990, 2300, 1840]
    w30 = '<svg width="120" height="44" viewBox="0 0 120 44"><polyline fill="none" stroke="var(--track)" stroke-width="2.5" stroke-linejoin="round" points="0,10 15,13 30,8 45,16 60,14 75,20 90,19 105,26 120,30"/><circle cx="118" cy="30" r="4" fill="var(--c-body)"/></svg>'
    kcal28 = [2400,2550,2300,2150,2600,2380,2200, 2250,2100,2500,2320,2050,2280,2190, 2350,2120,2480,2210,1990,2300,2240, 2160,2400,2050,2310,2200,2120,1840]
    return STATUS + f'''<main style="gap:12px">
<div class="row" style="align-items:center;margin-top:4px"><span class="date subtle" style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Sâmbătă, 3 octombrie</span><span class="avatar">A</span></div>
<h1 class="title" style="margin-top:-6px">Bună, Andrei</h1>
<div class="sect">Azi</div>
{hcard("workouts","dumbbell","Antrenament","Azi",
  '<div style="margin-top:10px"><div class="val" style="font-size:28px">Upper A</div><div class="sub2">4 exerciții · cam 60 min</div><div class="sub2" style="display:flex;gap:6px;align-items:center">' + ic("alert","i s") + 'Încă obosite: piept, triceps</div></div>'
  '<button class="btn primary" style="margin-top:14px">Începe antrenamentul</button>')}
{hcard("nutrition","apple","Calorii","Azi",
  f'<div class="bd"><div><div class="val">1 840<small>kcal</small></div><div class="sub2">din 2 400 · mai ai 560</div></div>{minibars(kcal7)}</div>')}
{hcard("water","drop","Apă","Azi",
  '<div class="bd"><div><div class="val">1 250<small>ml</small></div><div class="sub2">din 2 500</div></div><button class="btn quiet" style="min-height:40px">+ 250 ml</button></div>')}
{hcard("body","scale","Greutate","Azi, 7:40",
  f'<div class="bd"><div><div class="val">82,4<small>kg</small></div><div class="sub2">−0,6 kg în 30 de zile</div></div>{w30}</div>')}
<div class="sect">Tendințe</div>
{hcard("nutrition","apple","Calorii","4 săpt.",
  '<div class="txt">În ultimele 4 săptămâni ai mâncat în medie 2 250 kcal pe zi, cu 150 sub țintă.</div><div class="hr"></div>' + trend(kcal28, 2250, '2 250', '7 sept.', 'medie'))}
{hcard("workouts","flame","Forță","8 săpt.",
  '<div class="txt">Ai ținut ritmul: 3 antrenamente de forță pe săptămână, 8 săptămâni la rând.</div><div class="hr"></div>' + trend([3,3,2,3,3,3,3,2], 2.75, '2,8', '10 aug.', 'medie / săpt.'))}
</main>''' + tabsA('Acasă')

def progress():
    pts = [90, 90, 91.5, 92, 92, 93.5, 95, 97.5]
    bars = ''.join(f'<i class="{"hi" if k==len(pts)-1 else ""}" style="height:{(v-80)/20*120:.0f}px"></i>' for k,v in enumerate(pts))
    fat = [('Piept','Obosit',78),('Triceps','Obosit',64),('Umeri','Parțial',41),('Spate','Parțial',33),('Picioare','Odihnit',8),('Abdomen','Odihnit',5)]
    frows = ''.join(f'<div class="li"><b style="font-weight:600">{m}</b><div class="mini"><span class="d" style="width:56px;text-align:right">{s}</span><span class="bar"><i style="width:{p}%"></i></span></div></div>' for m,s,p in fat)
    return STATUS + TOPC + f'''<main>
<div class="display" style="font-size:40px">Antrenament</div>
<div class="useg"><span>Start</span><span>Galerie</span><span>Istoric</span><span class="on">Progres</span></div>
<section class="first">
  <div class="cap" style="color:var(--c-workouts)">1RM estimat</div>
  <div class="pick">Împins cu bara la piept {ic("down2","i s")}</div>
  <div class="mega" style="margin-top:18px">97,5<small>kg</small></div>
  <div class="small muted" style="margin-top:6px">Ai crescut 7,5 kg în 8 săptămâni, cam un kilogram pe săptămână.</div>
  <div class="wk">{bars}</div>
  <div class="tl" style="display:flex;justify-content:space-between;font-size:12px;color:var(--subtle);margin-top:8px"><span>10 aug.</span><span style="color:var(--c-workouts);font-weight:700">săpt. asta</span></div>
</section>
<section>
  <div class="row"><div class="cap">Oboseala pe grupe</div><span class="small subtle">acum</span></div>
  <div class="list" style="margin-top:6px">{frows}</div>
</section>
</main>''' + tabsC('Antrenament')

open('01-home-light.html','w').write(page('Acasă', home(), 'light', 'a.css'))
open('01-home-dark.html','w').write(page('Acasă', home(), 'dark', 'a.css'))
for t in ('light','dark'):
    open(f'06-progress-{t}.html','w').write(page('Progres', progress(), t, 'c.css'))
print('ok')
