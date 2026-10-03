# Runda 1, varianta finală (python3 build.py): Acasă din A fără dungă, Antrenament și Nutriție din C.
import os
here = os.path.dirname(os.path.abspath(__file__))
def load(folder):
    path = os.path.join(here, '..', folder, 'build.py')
    g = {'__file__': path}; exec(open(path).read().rsplit("\nfor name, fn, title in", 1)[0], g); return g
A, C = load('mockups'), load('mockups-c')
def page(title, body, theme, css):
    return f'<!doctype html><html lang="ro" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="{css}"><title>{title}</title></head><body>{body}</body></html>'
for name, fn, title, css in [('01-home', A['home'], 'Acasă', 'a.css'), ('02-workout', C['workout'], 'Antrenament activ', 'c.css'), ('03-nutrition', C['nutrition'], 'Nutriție', 'c.css')]:
    for theme in ('light', 'dark'):
        open(f'{name}-{theme}.html', 'w').write(page(title, fn(), theme, css))
print('ok')
