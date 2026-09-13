from datetime import datetime, time, timedelta

import pytest
from django.utils import timezone

from apps.attendance.models import CheckInModel
from apps.billing.daily_stats import get_daily_stats, sync_daily_stats
from apps.billing.models import DailyStatsSnapshotModel, DuesPaymentModel


def _aware_noon(day):
    return timezone.make_aware(datetime.combine(day, time(12, 0)))


def _backdate_member(member, day):
    type(member).objects.filter(pk=member.pk).update(created_at=_aware_noon(day))


def _make_checkin(org, member, day):
    checkin = CheckInModel.objects.create(organization=org, member=member, method='manual')
    CheckInModel.objects.filter(pk=checkin.pk).update(checked_in_at=_aware_noon(day))
    return checkin


def _make_payment(org, member, amount, day):
    return DuesPaymentModel.objects.create(
        organization=org, member=member, amount=amount, method='cash', paid_at=day,
    )


@pytest.mark.django_db
class TestSyncDailyStats:
    def test_computes_and_persists_past_day_from_raw_data(self, org, make_member):
        today = timezone.localdate()
        two_days_ago = today - timedelta(days=2)
        member = make_member(org)
        _backdate_member(member, two_days_ago)
        _make_payment(org, member, '150.00', two_days_ago)
        _make_checkin(org, member, two_days_ago)

        results = get_daily_stats(org.id, two_days_ago, today)

        row = next(r for r in results if r['date'] == two_days_ago)
        assert row['revenue'] == pytest.approx(150.00)
        assert row['checkins'] == 1
        assert row['new_members'] == 1

        snapshot = DailyStatsSnapshotModel.objects.get(organization=org, date=two_days_ago)
        assert snapshot.checkins == 1

    def test_today_is_never_persisted(self, org, make_member):
        today = timezone.localdate()
        member = make_member(org)
        _make_payment(org, member, '50.00', today)

        results = get_daily_stats(org.id, today, today)

        assert any(r['date'] == today for r in results)
        assert not DailyStatsSnapshotModel.objects.filter(organization=org, date=today).exists()

    def test_does_not_recompute_an_already_synced_past_day(self, org, make_member):
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        member = make_member(org)
        _make_payment(org, member, '100.00', yesterday)

        sync_daily_stats(org.id, yesterday, today)
        snapshot = DailyStatsSnapshotModel.objects.get(organization=org, date=yesterday)
        assert snapshot.revenue == pytest.approx(100.00)

        # Nueva transacción para ese mismo día pasado, después de que ya se congeló
        _make_payment(org, member, '999.00', yesterday)
        sync_daily_stats(org.id, yesterday, today)

        snapshot.refresh_from_db()
        assert snapshot.revenue == pytest.approx(100.00)
        assert DailyStatsSnapshotModel.objects.filter(organization=org, date=yesterday).count() == 1

    def test_no_past_days_in_range_is_a_noop(self, org):
        today = timezone.localdate()
        sync_daily_stats(org.id, today, today)
        assert DailyStatsSnapshotModel.objects.filter(organization=org).count() == 0
