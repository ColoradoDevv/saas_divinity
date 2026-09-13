import pytest
from django.utils import timezone
from rest_framework import status


@pytest.mark.django_db
class TestAttendanceByWeekdayReportView:
    url = '/api/attendance/reports/by-weekday/'

    def test_returns_seven_days_with_todays_checkin_counted(self, admin_client, org, make_member):
        member = make_member(org)
        admin_client.post('/api/attendance/checkin/', {
            'member_id': member.id, 'method': 'manual',
        }, format='json')

        resp = admin_client.get(f'{self.url}?days=30')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 7
        assert sum(row['count'] for row in resp.data) == 1
        today_weekday = timezone.localdate().weekday()
        today_row = next(r for r in resp.data if r['weekday'] == today_weekday)
        assert today_row['count'] == 1

    def test_empty_when_no_checkins(self, admin_client):
        resp = admin_client.get(f'{self.url}?days=30')
        assert resp.status_code == status.HTTP_200_OK
        assert sum(row['count'] for row in resp.data) == 0
