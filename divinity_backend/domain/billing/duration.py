"""
Aritmética de duración de planes de membresía — sin dependencias externas
(no usamos python-dateutil por una sola función).

_add_months usa el patrón estándar de "clamp al último día del mes destino"
para que, por ejemplo, 31 de enero + 1 mes dé 28/29 de febrero en vez de
reventar con un día inválido.
"""

import calendar
from datetime import date, timedelta

DURATION_UNIT_CHOICES = [
    ('day', 'Día'),
    ('week', 'Semana'),
    ('month', 'Mes'),
    ('year', 'Año'),
]
VALID_DURATION_UNITS = {key for key, _ in DURATION_UNIT_CHOICES}


def add_duration(start: date, value: int, unit: str) -> date:
    if unit == 'day':
        return start + timedelta(days=value)
    if unit == 'week':
        return start + timedelta(weeks=value)
    if unit == 'month':
        return _add_months(start, value)
    if unit == 'year':
        return _add_months(start, value * 12)
    raise ValueError(f'Unidad de duración desconocida: {unit}')


def _add_months(start: date, months: int) -> date:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
