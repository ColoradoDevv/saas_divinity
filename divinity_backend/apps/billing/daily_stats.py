"""
Histórico diario de estadísticas (ingresos, check-ins, miembros nuevos).

No hay scheduler en este proyecto, así que el histórico se completa de forma
perezosa: cada vez que se pide un rango, se generan los snapshots de los días
pasados que falten (mismo patrón que
apps/notifications/services.py::sync_expiring_notifications). El día de hoy
nunca se persiste — todavía puede cambiar, así que se calcula en caliente
igual que DashboardSummaryView.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import DailyStatsSnapshotModel, DuesPaymentModel


def _compute_day_stats(organization_id: int, day: date) -> dict:
    from apps.attendance.models import CheckInModel
    from apps.members.models import MemberModel

    revenue = DuesPaymentModel.objects.filter(
        organization_id=organization_id, paid_at=day,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    checkins = CheckInModel.objects.filter(
        organization_id=organization_id, checked_in_at__date=day,
    ).count()
    new_members = MemberModel.objects.filter(
        organization_id=organization_id, created_at__date=day,
    ).count()
    return {'revenue': revenue, 'checkins': checkins, 'new_members': new_members}


def sync_daily_stats(organization_id: int, date_from: date, date_to: date) -> None:
    """Crea los snapshots faltantes para los días ya cerrados (< hoy) del rango."""
    today = timezone.localdate()
    past_end = min(date_to, today - timedelta(days=1))
    if date_from > past_end:
        return

    existing_dates = set(
        DailyStatsSnapshotModel.objects.filter(
            organization_id=organization_id, date__gte=date_from, date__lte=past_end,
        ).values_list('date', flat=True)
    )

    to_create = []
    day = date_from
    while day <= past_end:
        if day not in existing_dates:
            stats = _compute_day_stats(organization_id, day)
            to_create.append(DailyStatsSnapshotModel(organization_id=organization_id, date=day, **stats))
        day += timedelta(days=1)

    if to_create:
        DailyStatsSnapshotModel.objects.bulk_create(to_create, ignore_conflicts=True)


def get_daily_stats(organization_id: int, date_from: date, date_to: date) -> list[dict]:
    """
    Serie diaria para [date_from, date_to]. Completa primero el histórico
    pasado que falte; si "hoy" cae en el rango, lo agrega calculado en vivo
    (sin persistir).
    """
    sync_daily_stats(organization_id, date_from, date_to)

    today = timezone.localdate()
    persisted_to = min(date_to, today - timedelta(days=1))

    results = []
    if date_from <= persisted_to:
        rows = DailyStatsSnapshotModel.objects.filter(
            organization_id=organization_id, date__gte=date_from, date__lte=persisted_to,
        ).order_by('date')
        results = [
            {'date': r.date, 'revenue': r.revenue, 'checkins': r.checkins, 'new_members': r.new_members}
            for r in rows
        ]

    if date_from <= today <= date_to:
        results.append({'date': today, **_compute_day_stats(organization_id, today)})

    return results
