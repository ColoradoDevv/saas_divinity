from datetime import time, timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from conftest import _make_jwt_for


@pytest.fixture
def gym_org(make_org):
    return make_org(
        slug='gym-classes-org',
        enabled_modules=['workers', 'members', 'payments', 'attendance', 'classes'],
    )


@pytest.fixture
def gym_admin_client(api_client, make_user, gym_org, make_membership):
    user = make_user(username='classadmin@ex.com', email='classadmin@ex.com', password='p!')
    make_membership(user, gym_org, role='admin')
    token = _make_jwt_for(user, org=gym_org, role='admin')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def class_type(gym_admin_client, gym_org):
    resp = gym_admin_client.post('/api/classes/types/', {
        'name': 'Yoga', 'duration_minutes': 60, 'capacity': 2,
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.data


@pytest.fixture
def schedule(gym_admin_client, class_type):
    resp = gym_admin_client.post('/api/classes/schedules/', {
        'class_type_id': class_type['id'], 'weekday': 0, 'start_time': '07:00:00',
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.data


def _next_monday():
    today = timezone.localdate()
    days_ahead = (0 - today.weekday()) % 7
    return today + timedelta(days=days_ahead)


@pytest.fixture
def session(gym_admin_client, schedule):
    target = _next_monday()
    resp = gym_admin_client.get(f'/api/classes/sessions/?date_from={target.isoformat()}&date_to={target.isoformat()}')
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.data) == 1
    return resp.data[0]


@pytest.mark.django_db
class TestClassTypeViewSet:
    url = '/api/classes/types/'

    def test_admin_can_create_and_list(self, gym_admin_client):
        resp = gym_admin_client.post(self.url, {'name': 'Spinning', 'capacity': 10}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

        resp = gym_admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_manager_cannot_create(self, api_client, make_user, gym_org, make_membership):
        user = make_user(username='mgr@ex.com', email='mgr@ex.com', password='p!')
        make_membership(user, gym_org, role='manager')
        token = _make_jwt_for(user, org=gym_org, role='manager')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        resp = api_client.post(self.url, {'name': 'X'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_org_without_classes_module_returns_403(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_destroy_deactivates(self, gym_admin_client, class_type):
        resp = gym_admin_client.delete(f'{self.url}{class_type["id"]}/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        resp = gym_admin_client.get(self.url)
        assert resp.data[0]['is_active'] is False


@pytest.mark.django_db
class TestScheduleViewSet:
    url = '/api/classes/schedules/'

    def test_admin_can_create_schedule(self, gym_admin_client, class_type):
        resp = gym_admin_client.post(self.url, {
            'class_type_id': class_type['id'], 'weekday': 2, 'start_time': '18:30:00',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['weekday'] == 2

    def test_invalid_class_type_returns_404(self, gym_admin_client):
        resp = gym_admin_client.post(self.url, {
            'class_type_id': 999999, 'weekday': 0, 'start_time': '07:00:00',
        }, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSessionListView:
    url = '/api/classes/sessions/'

    def test_generates_session_from_active_schedule(self, gym_admin_client, schedule):
        target = _next_monday()
        resp = gym_admin_client.get(f'{self.url}?date_from={target.isoformat()}&date_to={target.isoformat()}')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]['status'] == 'scheduled'
        assert resp.data[0]['enrolled_count'] == 0

    def test_default_range_is_current_week(self, gym_admin_client, schedule):
        resp = gym_admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestSessionDetailView:
    def test_includes_enrollments(self, gym_admin_client, session, gym_org, make_member):
        member = make_member(gym_org)
        gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json')

        resp = gym_admin_client.get(f'/api/classes/sessions/{session["id"]}/')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data['enrollments']) == 1
        assert resp.data['enrollments'][0]['member_id'] == member.id


@pytest.mark.django_db
class TestSessionEnrollView:
    def test_enrolls_member(self, gym_admin_client, session, gym_org, make_member):
        member = make_member(gym_org)
        resp = gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['status'] == 'booked'

    def test_rejects_when_full(self, gym_admin_client, session, gym_org, make_member):
        m1 = make_member(gym_org, first_name='Ana', last_name='Uno')
        m2 = make_member(gym_org, first_name='Bea', last_name='Dos')
        m3 = make_member(gym_org, first_name='Cami', last_name='Tres')
        gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': m1.id}, format='json')
        gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': m2.id}, format='json')

        resp = gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': m3.id}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_duplicate(self, gym_admin_client, session, gym_org, make_member):
        member = make_member(gym_org)
        gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json')
        resp = gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestEnrollmentActions:
    def test_cancel_then_attend_flow(self, gym_admin_client, session, gym_org, make_member):
        member = make_member(gym_org)
        enroll_resp = gym_admin_client.post(
            f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json'
        )
        enrollment_id = enroll_resp.data['id']

        attend_resp = gym_admin_client.post(f'/api/classes/enrollments/{enrollment_id}/attend/')
        assert attend_resp.status_code == status.HTTP_200_OK
        assert attend_resp.data['status'] == 'attended'

    def test_cancel_enrollment(self, gym_admin_client, session, gym_org, make_member):
        member = make_member(gym_org)
        enroll_resp = gym_admin_client.post(
            f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json'
        )
        enrollment_id = enroll_resp.data['id']

        cancel_resp = gym_admin_client.post(f'/api/classes/enrollments/{enrollment_id}/cancel/')
        assert cancel_resp.status_code == status.HTTP_200_OK
        assert cancel_resp.data['status'] == 'cancelled'


@pytest.mark.django_db
class TestSessionCancelView:
    def test_cancels_session_and_emails_booked_members(self, gym_admin_client, session, gym_org, make_member, mailoutbox):
        member = make_member(gym_org, email='miembro@example.com')
        gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/enroll/', {'member_id': member.id}, format='json')

        resp = gym_admin_client.post(f'/api/classes/sessions/{session["id"]}/cancel/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'cancelled'

        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ['miembro@example.com']
        assert 'cancelada' in mailoutbox[0].subject.lower()

    def test_not_found_returns_404(self, gym_admin_client):
        resp = gym_admin_client.post('/api/classes/sessions/999999/cancel/')
        assert resp.status_code == status.HTTP_404_NOT_FOUND
