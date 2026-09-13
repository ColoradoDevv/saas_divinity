import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.attendance.models import BiometricDeviceModel, CheckInModel, MemberBiometricEnrollmentModel
from conftest import _make_jwt_for


@pytest.fixture
def bio_org(make_org):
    return make_org(
        slug='bio-devices-org',
        enabled_modules=['workers', 'members', 'payments', 'attendance', 'biometric_devices'],
    )


@pytest.fixture
def bio_admin_client(api_client, make_user, bio_org, make_membership):
    user = make_user(username='bioadmin@ex.com', email='bioadmin@ex.com', password='p!')
    make_membership(user, bio_org, role='admin')
    token = _make_jwt_for(user, org=bio_org, role='admin')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def device_with_key(bio_admin_client):
    resp = bio_admin_client.post('/api/attendance/devices/', {'name': 'Recepción'}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.data  # incluye 'device_key' (id:secreto), solo disponible acá


def _device_client(device_key: str) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {device_key}')
    return client


@pytest.mark.django_db
class TestModuleGating:
    def test_org_without_addon_gets_403(self, admin_client):
        # `org`/`admin_client` (fixtures base) no incluyen 'biometric_devices' por defecto
        resp = admin_client.get('/api/attendance/devices/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_org_admin_cannot_self_grant_addon_via_settings(self, admin_client, org):
        resp = admin_client.patch('/api/organizations/me/', {
            'enabled_modules': list(org.enabled_modules) + ['biometric_devices'],
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_superuser_can_grant_addon(self, superuser_client, make_org):
        target_org = make_org(slug='to-be-granted-org', enabled_modules=['members'])
        resp = superuser_client.patch(f'/api/organizations/super/{target_org.pk}/', {
            'enabled_modules': ['members', 'biometric_devices'],
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert 'biometric_devices' in resp.data['enabled_modules']


@pytest.mark.django_db
class TestBiometricDeviceViewSet:
    url = '/api/attendance/devices/'

    def test_admin_can_create_device_and_gets_key_once(self, bio_admin_client):
        resp = bio_admin_client.post(self.url, {'name': 'Recepción'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert 'device_key' in resp.data
        assert resp.data['device_key'].split(':')[0] == str(resp.data['id'])

        list_resp = bio_admin_client.get(self.url)
        assert list_resp.status_code == status.HTTP_200_OK
        assert 'device_key' not in list_resp.data[0]

    def test_manager_cannot_create_device(self, api_client, make_user, bio_org, make_membership):
        user = make_user(username='biomgr@ex.com', email='biomgr@ex.com', password='p!')
        make_membership(user, bio_org, role='manager')
        token = _make_jwt_for(user, org=bio_org, role='manager')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        resp = api_client.post(self.url, {'name': 'X'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_rotate_key_invalidates_old_key(self, bio_admin_client, device_with_key):
        old_key = device_with_key['device_key']
        resp = bio_admin_client.post(f'{self.url}{device_with_key["id"]}/rotate-key/')
        assert resp.status_code == status.HTTP_200_OK
        new_key = resp.data['device_key']
        assert new_key != old_key

        old_key_resp = _device_client(old_key).post(
            '/api/attendance/devices/events/', {'external_user_id': 'x'}, format='json'
        )
        assert old_key_resp.status_code == status.HTTP_403_FORBIDDEN

    def test_deactivate_device_blocks_events(self, bio_admin_client, device_with_key):
        bio_admin_client.patch(f'{self.url}{device_with_key["id"]}/', {'is_active': False}, format='json')
        resp = _device_client(device_with_key['device_key']).post(
            '/api/attendance/devices/events/', {'external_user_id': 'x'}, format='json'
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEnrollments:
    def test_enroll_and_list(self, bio_admin_client, bio_org, make_member, device_with_key):
        member = make_member(bio_org)
        resp = bio_admin_client.post(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/',
            {'member_id': member.id, 'external_user_id': '42'}, format='json',
        )
        assert resp.status_code == status.HTTP_201_CREATED

        list_resp = bio_admin_client.get(f'/api/attendance/members/{member.id}/enrollments/')
        assert list_resp.status_code == status.HTTP_200_OK
        assert len(list_resp.data) == 1
        assert list_resp.data[0]['external_user_id'] == '42'

    def test_duplicate_external_user_id_rejected(self, bio_admin_client, bio_org, make_member, device_with_key):
        m1 = make_member(bio_org, first_name='Ana', last_name='Uno')
        m2 = make_member(bio_org, first_name='Bea', last_name='Dos')
        bio_admin_client.post(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/',
            {'member_id': m1.id, 'external_user_id': '99'}, format='json',
        )
        resp = bio_admin_client.post(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/',
            {'member_id': m2.id, 'external_user_id': '99'}, format='json',
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_destroy_enrollment(self, bio_admin_client, bio_org, make_member, device_with_key):
        member = make_member(bio_org)
        create_resp = bio_admin_client.post(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/',
            {'member_id': member.id, 'external_user_id': '7'}, format='json',
        )
        enrollment_id = create_resp.data['id']

        del_resp = bio_admin_client.delete(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/{enrollment_id}/'
        )
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT
        assert not MemberBiometricEnrollmentModel.objects.filter(pk=enrollment_id).exists()


@pytest.mark.django_db
class TestDeviceEventIngestView:
    url = '/api/attendance/devices/events/'

    def test_enrolled_event_creates_checkin_and_updates_last_seen(
        self, bio_admin_client, bio_org, make_member, device_with_key,
    ):
        member = make_member(bio_org)
        bio_admin_client.post(
            f'/api/attendance/devices/{device_with_key["id"]}/enrollments/',
            {'member_id': member.id, 'external_user_id': 'finger-1'}, format='json',
        )

        resp = _device_client(device_with_key['device_key']).post(
            self.url, {'external_user_id': 'finger-1'}, format='json',
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['method'] == 'fingerprint'
        assert resp.data['member_id'] == member.id

        checkin = CheckInModel.objects.get(member=member)
        assert checkin.method == 'fingerprint'
        assert checkin.registered_by_id is None

        device = BiometricDeviceModel.objects.get(pk=device_with_key['id'])
        assert device.last_seen_at is not None

    def test_unenrolled_external_id_returns_404(self, device_with_key):
        resp = _device_client(device_with_key['device_key']).post(
            self.url, {'external_user_id': 'unknown'}, format='json',
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_device_key_rejected(self):
        resp = _device_client('999999:not-a-real-secret').post(
            self.url, {'external_user_id': 'x'}, format='json',
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_missing_key_returns_403(self):
        client = APIClient()
        resp = client.post(self.url, {'external_user_id': 'x'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSecurityBoundary:
    """Un token de un mundo nunca debe funcionar en el otro."""

    def test_device_key_rejected_on_staff_members_endpoint(self, device_with_key):
        client = _device_client(device_with_key['device_key'])
        resp = client.get('/api/members/')
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_staff_jwt_rejected_on_device_event_endpoint(self, bio_admin_client):
        resp = bio_admin_client.post(
            '/api/attendance/devices/events/', {'external_user_id': 'x'}, format='json',
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_device_key_rejected_on_member_portal_endpoint(self, device_with_key):
        client = _device_client(device_with_key['device_key'])
        resp = client.get('/api/member-portal/me/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN
