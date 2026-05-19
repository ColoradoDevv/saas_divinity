import pytest
from django.urls import reverse
from rest_framework import status

from conftest import _make_jwt_for


@pytest.mark.django_db
class TestLoginView:
    url = '/api/auth/login'

    def test_valid_credentials_returns_200(self, api_client, make_user, make_org, make_membership):
        user = make_user(username='admin@ex.com', email='admin@ex.com', password='pass1234!')
        org = make_org()
        make_membership(user, org, role='admin')
        resp = api_client.post(self.url, {'email': 'admin@ex.com', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_200_OK
        assert 'tokens' in resp.data
        assert 'user' in resp.data

    def test_invalid_password_returns_401(self, api_client, make_user):
        make_user(username='u@ex.com', email='u@ex.com', password='correct!')
        resp = api_client.post(self.url, {'email': 'u@ex.com', 'password': 'wrong!'})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonexistent_user_returns_401(self, api_client):
        resp = api_client.post(self.url, {'email': 'ghost@ex.com', 'password': 'pass!'})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_fields_returns_400(self, api_client):
        resp = api_client.post(self.url, {})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_with_no_membership_returns_403(self, api_client, make_user):
        make_user(username='lonely@ex.com', email='lonely@ex.com', password='pass1234!')
        resp = api_client.post(self.url, {'email': 'lonely@ex.com', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_user_gets_position_and_modules(self, api_client, make_user, make_org,
                                                   make_membership, make_worker):
        user = make_user(username='staff@ex.com', email='staff@ex.com', password='pass1234!')
        org = make_org(enabled_modules=['workers', 'clients'])
        make_membership(user, org, role='staff')
        make_worker(org, user=user, position='Barbero', allowed_modules=['workers'])
        resp = api_client.post(self.url, {'email': 'staff@ex.com', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership']['position'] == 'Barbero'
        assert resp.data['membership']['allowed_modules'] == ['workers']

    def test_staff_user_without_worker_model_falls_back_to_org_modules(
            self, api_client, make_user, make_org, make_membership):
        user = make_user(username='staffb@ex.com', email='staffb@ex.com', password='pass1234!')
        org = make_org(enabled_modules=['clients', 'reports'])
        make_membership(user, org, role='staff')
        resp = api_client.post(self.url, {'email': 'staffb@ex.com', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_200_OK
        assert set(resp.data['membership']['allowed_modules']) == {'clients', 'reports'}
        assert resp.data['membership']['position'] is None

    def test_admin_user_has_null_position_and_modules(self, api_client, make_user, make_org,
                                                       make_membership):
        user = make_user(username='adm@ex.com', email='adm@ex.com', password='pass1234!')
        org = make_org()
        make_membership(user, org, role='admin')
        resp = api_client.post(self.url, {'email': 'adm@ex.com', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership']['position'] is None
        assert resp.data['membership']['allowed_modules'] is None

    def test_empty_body_returns_400(self, api_client):
        resp = api_client.post(self.url, data='', content_type='application/json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_by_username_works(self, api_client, make_user, make_org, make_membership):
        user = make_user(username='juan.perez1', email='jp@ex.com', password='pass1234!')
        org = make_org(slug='org-jp')
        make_membership(user, org, role='admin')
        resp = api_client.post(self.url, {'email': 'juan.perez1', 'password': 'pass1234!'})
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestMeView:
    url = '/api/auth/me'

    def test_authenticated_returns_200(self, api_client, make_user, org, make_membership):
        user = make_user(username='me@ex.com', email='me@ex.com', password='pass!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['user']['email'] == 'me@ex.com'

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_user_returns_null_allowed_modules(self, api_client, make_user, org,
                                                      make_membership):
        user = make_user(username='adm2@ex.com', email='adm2@ex.com', password='pass!')
        make_membership(user, org, role='admin')
        token = _make_jwt_for(user, org=org, role='admin')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership']['allowed_modules'] is None
        assert resp.data['membership']['position'] is None

    def test_staff_user_with_worker_returns_modules(self, api_client, make_user, org,
                                                     make_membership, make_worker):
        user = make_user(username='st@ex.com', email='st@ex.com', password='pass!')
        make_membership(user, org, role='staff')
        make_worker(org, user=user, position='Cajero', allowed_modules=['clients'])
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership']['position'] == 'Cajero'
        assert resp.data['membership']['allowed_modules'] == ['clients']

    def test_staff_without_worker_model_falls_back_to_org_modules(
            self, api_client, make_user, make_org, make_membership):
        org2 = make_org(slug='org2', enabled_modules=['payments'])
        user = make_user(username='st2@ex.com', email='st2@ex.com', password='pass!')
        make_membership(user, org2, role='staff')
        token = _make_jwt_for(user, org=org2, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership']['allowed_modules'] == ['payments']

    def test_no_membership_returns_null(self, api_client, make_user):
        user = make_user(username='nomem@ex.com', email='nomem@ex.com', password='pass!')
        token = _make_jwt_for(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['membership'] is None


@pytest.mark.django_db
class TestForgotPasswordView:
    url = '/api/auth/forgot-password'

    def test_existing_email_returns_200(self, api_client, make_user):
        make_user(username='fp@ex.com', email='fp@ex.com', password='pass!')
        resp = api_client.post(self.url, {'email': 'fp@ex.com'})
        assert resp.status_code == status.HTTP_200_OK
        assert 'detail' in resp.data

    def test_nonexistent_email_returns_200_no_info_leak(self, api_client):
        resp = api_client.post(self.url, {'email': 'ghost@ex.com'})
        assert resp.status_code == status.HTTP_200_OK

    def test_inactive_user_returns_200_no_token(self, api_client, make_user):
        make_user(username='inactive@ex.com', email='inactive@ex.com',
                  password='pass!', is_active=False)
        resp = api_client.post(self.url, {'email': 'inactive@ex.com'})
        assert resp.status_code == status.HTTP_200_OK

    def test_invalid_email_format_returns_400(self, api_client):
        resp = api_client.post(self.url, {'email': 'not-an-email'})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
