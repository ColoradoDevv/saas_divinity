import pytest
from rest_framework import status


@pytest.mark.django_db
class TestDashboardSummaryView:
    url = '/api/billing/summary/'

    def test_returns_zeroes_with_no_activity(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['revenue_today'] == '0.00'
        assert resp.data['checkins_today'] == 0
        assert resp.data['new_members_7d'] == 0
        assert resp.data['active_members'] == 0

    def test_counts_todays_revenue_and_checkins(self, admin_client, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, price='500.00')
        admin_client.post('/api/billing/renew/', {
            'member_id': member.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        admin_client.post('/api/attendance/checkin/', {
            'member_id': member.id, 'method': 'manual',
        }, format='json')

        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['revenue_today'] == '500.00'
        assert resp.data['checkins_today'] == 1
        assert resp.data['new_members_7d'] == 1
        assert resp.data['active_members'] == 1
