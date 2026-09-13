import pytest
from rest_framework import status

from conftest import _make_jwt_for


@pytest.mark.django_db
class TestCheckInView:
    url = '/api/attendance/checkin/'

    def test_checkin_by_code(self, admin_client, org, make_member):
        member = make_member(org, member_code='ABC123')
        resp = admin_client.post(self.url, {'member_code': 'ABC123', 'method': 'code'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['checkin']['member_id'] == member.id
        assert resp.data['subscription_status'] == 'no_subscription'

    def test_checkin_by_member_id(self, admin_client, org, make_member):
        member = make_member(org)
        resp = admin_client.post(self.url, {'member_id': member.id, 'method': 'manual'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

    def test_checkin_reports_active_subscription(self, admin_client, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        admin_client.post('/api/billing/renew/', {
            'member_id': member.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        resp = admin_client.post(self.url, {'member_id': member.id, 'method': 'manual'}, format='json')
        assert resp.data['subscription_status'] == 'active'

    def test_unknown_code_returns_404(self, admin_client, org):
        resp = admin_client.post(self.url, {'member_code': 'NOPE', 'method': 'code'}, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_identifier_returns_400(self, admin_client, org):
        resp = admin_client.post(self.url, {'method': 'manual'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_org_without_attendance_module_returns_403(self, api_client, make_user, make_org, make_membership):
        org = make_org(slug='no-attendance', enabled_modules=['workers'])
        user = make_user(username='na@ex.com', email='na@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.post(self.url, {'member_id': 1, 'method': 'manual'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTodayAttendanceView:
    url = '/api/attendance/today/'

    def test_lists_todays_checkins(self, admin_client, org, make_member):
        member1 = make_member(org, first_name='A', last_name='A', email='a@ex.com')
        member2 = make_member(org, first_name='B', last_name='B', email='b@ex.com')
        admin_client.post('/api/attendance/checkin/', {'member_id': member1.id, 'method': 'manual'}, format='json')
        admin_client.post('/api/attendance/checkin/', {'member_id': member2.id, 'method': 'manual'}, format='json')

        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2


@pytest.mark.django_db
class TestMemberAttendanceHistoryView:
    def test_returns_history_for_member(self, admin_client, org, make_member):
        member = make_member(org)
        admin_client.post('/api/attendance/checkin/', {'member_id': member.id, 'method': 'manual'}, format='json')
        admin_client.post('/api/attendance/checkin/', {'member_id': member.id, 'method': 'code'}, format='json')

        resp = admin_client.get(f'/api/attendance/members/{member.id}/history/')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2
