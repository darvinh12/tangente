import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    assert old in s, old
    s = s.replace(old, new)
rep('const infTex = (v: number) => (v > 0 ? "\\\\infty" : "-\\\\infty");', 'const infTex = (v: number) => (v > 0 ? "+\\\\infty" : "-\\\\infty");')
rep('mientras la exponencial de abajo sigue igual multiplicada por $${k}$. Después de ${n} derivadas queda $\\\\frac{${n === 2 ? 2 : 6}}{${k ** n}${ekx(k)}}$.`',
    'mientras la exponencial de abajo sigue siendo exponencial${k === 1 ? "" : `, multiplicada por $${k}$ cada vez`}. Después de ${n} derivadas queda $\\\\frac{${n === 2 ? 2 : 6}}{${cf(k ** n)}${ekx(k)}}$.`')
rep('el límite es $${mm ? `${m} \\\\cdot ` : ""}${k} = ${m * k}$.`', 'el límite es $${mm ? `${m} \\\\cdot ${k} = ` : ""}${m * k}$.`')
for fam in ['e^{x} - 1 - x}{x(e^{x} - 1)}', '\\\\ln x - (x - 1)}{(x - 1)\\\\ln x}', 'x - \\\\ln(1 + x)}{x\\\\ln(1 + x)}']:
    rep('`Común denominador: $${a}\\\\cdot\\\\dfrac{' + fam, '`Común denominador: $${a === 1 ? "" : `${a}\\\\cdot`}\\\\dfrac{' + fam)
rep('`$\\\\ln y = \\\\dfrac{${a}\\\\ln x}{${b} + \\\\ln x}$', '`$\\\\ln y = \\\\dfrac{${cf(a)}\\\\ln x}{${b} + \\\\ln x}$')
rep('`$\\\\ln y = \\\\dfrac{${a}\\\\ln(e^{x} + x)}{x}$', '`$\\\\ln y = \\\\dfrac{${cf(a)}\\\\ln(e^{x} + x)}{x}$')
rep('`$\\\\ln y = \\\\dfrac{${a}\\\\ln(1 + x^{${k}})}{\\\\ln x}$', '`$\\\\ln y = \\\\dfrac{${cf(a)}\\\\ln(1 + x^{${k}})}{\\\\ln x}$')
open(p, 'w', encoding='utf-8').write(s)
print("ok")
