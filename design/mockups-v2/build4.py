# Deciziile 9–14 (python3 build4.py), peste build.py, build2.py și build3.py.
import os, re
here = os.path.dirname(os.path.abspath(__file__))
B = {'__file__': os.path.join(here, 'build3.py')}
src = open(os.path.join(here, 'build3.py')).read()
exec(src.split("\nopen('01-home-light.html'")[0], B)
ic, STATUS, I, page, tabsA, tabsC = B['ic'], B['STATUS'], B['I'], B['page'], B['tabsA'], B['tabsC']
hcard, minibars = B['hcard'], B['minibars']

I['wifioff'] = '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>'
I['move'] = '<circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/>'

def dots(vals, target, lab):
    lo, hi = 1700, 2800; W, H = 330, 110
    y = lambda v: H - (v-lo)/(hi-lo)*H
    pts = ''.join(f'<circle cx="{6 + k*(W-12)/(len(vals)-1):.1f}" cy="{y(v):.1f}" r="{5 if k==len(vals)-1 else 3.5}" fill="{"var(--cc)" if k==len(vals)-1 else "var(--subtle)"}" opacity="{1 if k==len(vals)-1 else .55}"/>' for k,v in enumerate(vals))
    return (f'<svg viewBox="0 0 {W} {H+4}" style="width:100%;margin-top:6px"><line x1="0" x2="{W}" y1="{y(target):.1f}" y2="{y(target):.1f}" stroke="var(--cc)" stroke-width="2" stroke-dasharray="5 4"/>'
            f'<text x="{W}" y="{y(target)-7:.1f}" text-anchor="end" font-family="Inter" font-size="12" font-weight="700" fill="var(--cc)">țintă 2 400</text>{pts}</svg>'
            f'<div class="tl"><span>7 sept.</span><span>azi</span></div>')

def home():
    h = B['home']()
    kcal28 = [2400,2550,2300,2150,2600,2380,2200, 2250,2100,2500,2320,2050,2280,2190, 2350,2120,2480,2210,1990,2300,2240, 2160,2400,2050,2310,2200,2120,1840]
    h = re.sub(r'<div class="trend">.*?</div><div class="tl"><span>7 sept\.</span><span>medie</span></div>', dots(kcal28, 2400, ''), h, count=1, flags=re.S)
    move = hcard("health","move","Mișcare","acum 2 zile",
      '<div class="bd"><div><div class="val" style="font-size:24px">Pauză de 3 minute</div><div class="sub2">Mers, ridicări de pe scaun, mobilitate</div></div></div>'
      '<button class="btn quiet" style="margin-top:12px;width:100%;min-height:44px">Începe pauza</button>')
    return h.replace('<div class="sect">Tendințe</div>', move + '\n<div class="sect">Tendințe</div>')

def home_empty():
    steps = [('ok','Contul e gata','Datele tale se sincronizează pe toate dispozitivele.'),
             ('2','Alege o rutină','Un șablon gata făcut sau una a ta. Apoi o pui pe zilele săptămânii.'),
             ('3','Completează profilul','Sex, an naștere, înălțime: din ele calculăm ținta de calorii.'),
             ('4','Notează greutatea','O dată pe zi, dimineața. Trendul apare după două zile.')]
    rows = ''.join(f'<div class="step"><span class="nr {"ok" if n=="ok" else ""}">{ic("check","i s") if n=="ok" else n}</span><div style="flex:1"><div class="t">{t}</div><div class="d">{d}</div></div>{"" if n=="ok" else ic("right","i s")}</div>' for n,t,d in steps)
    return STATUS + f'''<main style="gap:12px">
<div class="row" style="align-items:center;margin-top:4px"><span class="subtle" style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Sâmbătă, 3 octombrie</span><span class="avatar">A</span></div>
<h1 class="title" style="margin-top:-6px">Bun venit, Andrei</h1>
<div class="sect">Primii pași</div>
<section class="hc" style="padding-top:4px;padding-bottom:4px">{rows}</section>
<div class="sect">Azi</div>
{hcard("workouts","dumbbell","Antrenament","Azi",'<div class="empty">Nicio rutină încă.</div><button class="btn primary" style="margin-top:14px">Alege o rutină</button>')}
{hcard("nutrition","apple","Calorii","Azi",'<div class="bd"><div><div class="val">0<small>kcal</small></div><div class="sub2">Ținta apare după ce completezi profilul</div></div></div>')}
{hcard("body","scale","Greutate","—",'<div class="empty">Notează-o în Nutriție, Jurnal.</div>')}
</main>''' + tabsA('Acasă')

def progress():
    pts = [90, 90, 91.5, 92, 92, 93.5, 95, 97.5]
    W, H = 340, 130; lo, hi = 88, 99
    x = lambda k: 8 + k*(W-16)/(len(pts)-1); y = lambda v: H - 10 - (v-lo)/(hi-lo)*(H-20)
    poly = ' '.join(f'{x(k):.1f},{y(v):.1f}' for k,v in enumerate(pts))
    grid = ''.join(f'<line x1="0" x2="{W}" y1="{y(v):.1f}" y2="{y(v):.1f}" stroke="var(--line)"/><text x="0" y="{y(v)-5:.1f}" font-family="Inter" font-size="11" fill="var(--subtle)">{v} kg</text>' for v in (90, 95))
    dotsv = ''.join(f'<circle cx="{x(k):.1f}" cy="{y(v):.1f}" r="3.5" fill="var(--fg)"/>' for k,v in enumerate(pts[:-1]))
    chart = (f'<svg viewBox="0 0 {W} {H}" style="width:100%;margin-top:16px">{grid}<polyline points="{poly}" fill="none" stroke="var(--fg)" stroke-width="2.5" stroke-linejoin="round"/>{dotsv}'
             f'<circle cx="{x(7):.1f}" cy="{y(97.5):.1f}" r="6" fill="var(--c-workouts)"/></svg>'
             '<div class="tl" style="display:flex;justify-content:space-between;font-size:12px;color:var(--subtle);margin-top:6px"><span>10 aug.</span><span style="color:var(--c-workouts);font-weight:700">săpt. asta · 97,5 kg</span></div>')
    p = B['progress']()
    return re.sub(r'<div class="wk">.*?</div>\s*<div class="tl".*?</div>', chart, p, count=1, flags=re.S)

def workout():
    w = B['B']['C']['workout']()
    add = '<div class="addset">' + ic('plus','i s') + 'Set</div>'
    w = re.sub(r'</table>(\s*<div class="note">.*?</div>)?', lambda m: '</table>' + (m.group(1) or '') + add, w, flags=re.S)
    return w

def nutrition():
    n = B['B']['C']['nutrition']()
    summary = hcard("nutrition","apple","Calorii","Azi",
      f'<div class="bd"><div><div class="val">1 840<small>kcal</small></div><div class="sub2">din 2 400 · mai ai 560</div></div>{minibars([2350,2120,2480,2210,1990,2300,1840])}</div>'
      '<div class="hr"></div>' + B['B']['C']['KV'])
    n = re.sub(r'<section class="first">.*?</section>', f'<section class="first" style="padding-top:16px">{summary}</section>', n, count=1, flags=re.S)
    return n.replace('<div class="lead">Menținere · Azi, 3 octombrie</div>',
      '<div class="lead">Menținere · Azi, 3 octombrie</div><span class="offline">' + ic('wifioff','i s') + 'Fără internet · se sincronizează după</span>')

for name, fn, css in [('01-home', home, 'a.css'), ('01b-home-empty', home_empty, 'a.css'), ('02-workout', workout, 'c.css'), ('03-nutrition', nutrition, 'c.css'), ('06-progress', progress, 'c.css')]:
    for t in ('light', 'dark'):
        open(f'{name}-{t}.html', 'w').write(page(name, fn(), t, css))
print('ok')
