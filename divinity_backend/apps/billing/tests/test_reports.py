import pytest
from django.utils import timezone
from rest_framework import status


@pytest.mark.django_db
class TestRevenueByMonthReportView:
    url = '/api/billing/reports/revenue-by-month/'

    def test_includes_current_month_payment(self, admin_client, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org, price='300.00')
        admin_client.post('/api/billing/renew/', {
            'member_id': member.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')

        resp = admin_client.get(f'{self.url}?months=3')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 3
        current_month = timezone.localdate().strftime('%Y-%m')
        row = next(r for r in resp.data if r['month'] == current_month)
        assert row['total'] == '300.00'

    def test_empty_months_are_zero(self, admin_client):
        resp = admin_client.get(f'{self.url}?months=6')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 6
        assert all(row['total'] == '0.00' for row in resp.data)

    def test_months_clamped_to_reasonable_range(self, admin_client):
        resp = admin_client.get(f'{self.url}?months=999')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 24


@pytest.mark.django_db
class TestMembershipStatusReportView:
    url = '/api/billing/reports/membership-status/'

    def test_counts_by_status(self, admin_client, org, make_member, make_plan):
        m1 = make_member(org, email='m1@ex.com')
        m2 = make_member(org, email='m2@ex.com')
        plan = make_plan(org)

        admin_client.post('/api/billing/renew/', {
            'member_id': m1.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        renew2 = admin_client.post('/api/billing/renew/', {
            'member_id': m2.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        sub2_id = renew2.data['subscription']['id']
        admin_client.post(f'/api/billing/subscriptions/{sub2_id}/freeze/')

        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['active'] == 1
        assert resp.data['frozen'] == 1
        assert resp.data['expired'] == 0
        assert resp.data['cancelled'] == 0
