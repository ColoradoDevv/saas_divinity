"""
Monedas soportadas para mostrar montos en toda la app (planes, cuotas,
reportes). Códigos ISO 4217 — lista estable, a diferencia del catálogo de
verticales no hace falta una fuente dinámica ni un endpoint propio.
"""

DEFAULT_CURRENCY = 'COP'

CURRENCY_CHOICES = [
    ('COP', 'Peso colombiano (COP)'),
    ('USD', 'Dólar estadounidense (USD)'),
    ('EUR', 'Euro (EUR)'),
    ('MXN', 'Peso mexicano (MXN)'),
    ('ARS', 'Peso argentino (ARS)'),
    ('CLP', 'Peso chileno (CLP)'),
    ('PEN', 'Sol peruano (PEN)'),
    ('BRL', 'Real brasileño (BRL)'),
]
