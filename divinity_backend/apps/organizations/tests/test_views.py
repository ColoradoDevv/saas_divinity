import pytest
from rest_framework import status

from conftest import _make_jwt_for


@pytest.mark.django_db
class TestVerticalCatalogView:
    url = '/api/organizations/verticals/'

    def test_returns_catalog_for_known_verticals(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert 'generic' in resp.data
        assert 'gym' in resp.data
        assert resp.data['gym']['label'] == 'Gimnasio'
        keys = {m['key'] for m in resp.data['gym']['modules']}
        assert 'members' in keys

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAddonCatalogView:
    url = '/api/organizations/addons/'

    def test_superuser_sees_addon_catalog(self, superuser_client):
        resp = superuser_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert {'key': 'biometric_devices', 'label': 'Huella digital'} in resp.data

    def test_non_superuser_gets_403(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSuperOrganizationListCreateView:
    url = '/api/organizations/super/'

    def test_superuser_gets_200_with_all_orgs(self, superuser_client, make_org):
        make_org(slug='s1')
        make_org(slug='s2')
        resp = superuser_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 2

    def test_superuser_no_orgs_returns_empty_list(self, superuser_client):
        resp = superuser_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_non_superuser_gets_403(self, api_client, make_user, org, make_membership):
        user = make_user(username='ns@ex.com', email='ns@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_creates_org_and_admin(self, superuser_client):
        resp = superuser_client.post(self.url, {
            'name': 'New Corp',
            'admin_email': 'newadmin@corp.com',
            'admin_password': 'secure1234',
            'plan': 'pro',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert 'organization' in resp.data
        assert resp.data['admin_email'] == 'newadmin@corp.com'

    def test_post_duplicate_slug_auto_increments(self, superuser_client):
        superuser_client.post(self.url, {
            'name': 'Test Corp', 'admin_email': 'a1@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        resp = superuser_client.post(self.url, {
            'name': 'Test Corp', 'admin_email': 'a2@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['organization']['slug'] != 'test-corp'

    def test_post_duplicate_admin_email_returns_400(self, superuser_client):
        superuser_client.post(self.url, {
            'name': 'Corp A', 'admin_email': 'dup@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        resp = superuser_client.post(self.url, {
            'name': 'Corp B', 'admin_email': 'dup@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_missing_required_fields_returns_400(self, superuser_client):
        resp = superuser_client.post(self.url, {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_as_non_superuser_returns_403(self, api_client, make_user, org, make_membership):
        user = make_user(username='nonsup@ex.com', email='nonsup@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.post(self.url, {
            'name': 'Corp X', 'admin_email': 'x@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_post_gym_org_seeds_recommended_member_fields(self, superuser_client):
        from apps.members.defaults import RECOMMENDED_GYM_FIELDS
        from apps.members.models import MemberFieldConfigModel
        from apps.organizations.models import OrganizationModel

        resp = superuser_client.post(self.url, {
            'name': 'Gym Corp', 'admin_email': 'gymadmin@corp.com', 'admin_password': 'secure1234',
            'business_type': 'gym',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        org = OrganizationModel.objects.get(slug=resp.data['organization']['slug'])
        assert MemberFieldConfigModel.objects.filter(organization=org).count() == len(RECOMMENDED_GYM_FIELDS)

    def test_post_non_gym_org_does_not_seed_member_fields(self, superuser_client):
        from apps.members.models import MemberFieldConfigModel
        from apps.organizations.models import OrganizationModel

        resp = superuser_client.post(self.url, {
            'name': 'Generic Corp', 'admin_email': 'genadmin@corp.com', 'admin_password': 'secure1234',
        }, format='json')
        org = OrganizationModel.objects.get(slug=resp.data['organization']['slug'])
        assert MemberFieldConfigModel.objects.filter(organization=org).count() == 0


@pytest.mark.django_db
class TestSuperOrganizationDetailView:
    def url(self, pk):
        return f'/api/organizations/super/{pk}/'

    def test_get_includes_business_type(self, superuser_client, make_org):
        org = make_org(slug='detail-org', business_type='gym')
        resp = superuser_client.get(self.url(org.pk))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['business_type'] == 'gym'

    def test_patch_rejects_module_invalid_for_business_type(self, superuser_client, make_org):
        org = make_org(slug='invalid-mod-org', business_type='gym', enabled_modules=['members'])
        resp = superuser_client.patch(self.url(org.pk), {
            'enabled_modules': ['not_a_real_module'],
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_changing_business_type_trims_enabled_modules(self, superuser_client, make_org):
        org = make_org(slug='switch-org', business_type='generic', enabled_modules=['workers', 'members', 'reports'])
        resp = superuser_client.patch(self.url(org.pk), {
            'business_type': 'gym',
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['business_type'] == 'gym'
        assert set(resp.data['enabled_modules']) <= {'members', 'workers', 'payments', 'attendance', 'reports'}

    def test_patch_changing_business_type_preserves_addon_modules(self, superuser_client, make_org):
        org = make_org(
            slug='switch-org-addon', business_type='generic',
            enabled_modules=['members', 'biometric_devices'],
        )
        resp = superuser_client.patch(self.url(org.pk), {'business_type': 'gym'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert 'biometric_devices' in resp.data['enabled_modules']

    def test_patch_switching_to_gym_seeds_recommended_member_fields(self, superuser_client, make_org):
        from apps.members.defaults import RECOMMENDED_GYM_FIELDS
        from apps.members.models import MemberFieldConfigModel

        org = make_org(slug='to-gym-org', business_type='generic')
        resp = superuser_client.patch(self.url(org.pk), {'business_type': 'gym'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert MemberFieldConfigModel.objects.filter(organization=org).count() == len(RECOMMENDED_GYM_FIELDS)

    def test_patch_already_gym_does_not_reseed(self, superuser_client, make_org):
        from apps.members.models import MemberFieldConfigModel

        org = make_org(slug='already-gym-org', business_type='gym')
        MemberFieldConfigModel.objects.create(
            organization=org, field_name='id_number', is_enabled=False, is_required=False,
        )
        resp = superuser_client.patch(self.url(org.pk), {'name': 'Renamed'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        config = MemberFieldConfigModel.objects.get(organization=org, field_name='id_number')
        assert config.is_enabled is False

    def test_non_superuser_returns_403(self, api_client, make_user, org, make_membership):
        user = make_user(username='sd@ex.com', email='sd@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url(org.pk))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSuperPaymentUpdateView:
    def url(self, pk):
        return f'/api/organizations/super/{pk}/payment/'

    def test_valid_payment_status_update(self, superuser_client, make_org):
        org = make_org(slug='pay-org')
        resp = superuser_client.patch(self.url(org.pk), {'payment_status': 'paid'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['payment_status'] == 'paid'

    def test_nonexistent_org_returns_404(self, superuser_client):
        resp = superuser_client.patch(self.url(999999), {'payment_status': 'paid'}, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_payment_status_returns_400(self, superuser_client, make_org):
        org = make_org(slug='pay-org2')
        resp = superuser_client.patch(self.url(org.pk), {'payment_status': 'invalid'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_dates_saved_correctly(self, superuser_client, make_org):
        org = make_org(slug='pay-date-org')
        resp = superuser_client.patch(self.url(org.pk), {
            'payment_status': 'paid',
            'last_payment_date': '2026-01-01',
            'next_payment_date': '2026-02-01',
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['last_payment_date'] == '2026-01-01'

    def test_non_superuser_returns_403(self, api_client, make_user, org, make_membership, make_org):
        user = make_user(username='nsp@ex.com', email='nsp@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        org2 = make_org(slug='pay-org3')
        resp = api_client.patch(self.url(org2.pk), {'payment_status': 'paid'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestOrganizationDetailView:
    url = '/api/organizations/me/'

    def test_get_own_org_returns_200(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert 'name' in resp.data

    def test_get_without_org_context_returns_403(self, api_client, make_user):
        user = make_user(username='noctx@ex.com', email='noctx@ex.com', password='p!')
        token = _make_jwt_for(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_as_admin_updates_org(self, admin_client):
        resp = admin_client.patch(self.url, {'name': 'Updated Name'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['name'] == 'Updated Name'

    def test_get_includes_default_currency(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['currency'] == 'COP'

    def test_patch_updates_currency(self, admin_client):
        resp = admin_client.patch(self.url, {'currency': 'USD'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['currency'] == 'USD'

    def test_patch_rejects_unsupported_currency(self, admin_client):
        resp = admin_client.patch(self.url, {'currency': 'XXX'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_as_staff_returns_403(self, api_client, make_user, org, make_membership):
        user = make_user(username='staff@ex.com', email='staff@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.patch(self.url, {'name': 'Hack'}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestOnboardingCompleteView:
    url = '/api/organizations/me/onboarding/'

    def test_admin_can_complete_onboarding(self, api_client, make_user, make_org, make_membership):
        org = make_org(slug='onb-org', onboarding_completed=False)
        user = make_user(username='onb@ex.com', email='onb@ex.com', password='p!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.post(self.url, {
            'name': 'Org Name', 'enabled_modules': ['workers'],
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['onboarding_completed'] is True

    def test_staff_cannot_complete_onboarding(self, api_client, make_user, org, make_membership):
        user = make_user(username='stf@ex.com', email='stf@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.post(self.url, {}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_module_choice_returns_400(self, admin_client):
        resp = admin_client.post(self.url, {'enabled_modules': ['invalid']}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_no_org_context_returns_403(self, api_client, make_user):
        user = make_user(username='noorg@ex.com', email='noorg@ex.com', password='p!')
        token = _make_jwt_for(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.post(self.url, {}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestMembershipListView:
    url = '/api/organizations/me/members/'

    def test_get_members_returns_200(self, admin_client):
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)

    def test_get_without_org_context_returns_403(self, api_client, make_user):
        user = make_user(username='noctx2@ex.com', email='noctx2@ex.com', password='p!')
        token = _make_jwt_for(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
