from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.member_portal.models import MemberPortalInvitationModel
from conftest import _make_jwt_for
from infrastructure.authentication.member_portal_jwt import MemberPortalTokenProvider

UserModel = get_user_model()


def _make_portal_member(org, make_member, email='miembro@example.com', password='socio1234'):
    member = make_member(org, email=email)
    user = UserModel.objects.create_user(
        username=f'member-{org.id}-{member.id}', email=email, password=password, is_active=True,
    )
    member.user = user
    member.save(update_fields=['user'])
    return member


def _portal_client(member):
    tokens = MemberPortalTokenProvider().create_token_pair(member)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens.access}')
    return client


@pytest.mark.django_db
class TestSecurityBoundary:
    """El límite más importante: un token de un mundo nunca debe funcionar en el otro."""

    def test_portal_token_rejected_on_staff_members_endpoint(self, org, make_member):
        member = _make_portal_member(org, make_member)
        client = _portal_client(member)

        resp = client.get('/api/members/')
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_portal_token_rejected_on_notifications_endpoint(self, org, make_member):
        # apps/notifications/views.py solo deniega explícitamente role=='staff' —
        # este es justo el hueco que motivó separar la autenticación del portal.
        member = _make_portal_member(org, make_member)
        client = _portal_client(member)

        resp = client.get('/api/notifications/')
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_portal_token_rejected_on_billing_summary(self, org, make_member):
        member = _make_portal_member(org, make_member)
        client = _portal_client(member)

        resp = client.get('/api/billing/summary/')
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_staff_admin_token_rejected_on_portal_me(self, admin_client):
        resp = admin_client.get('/api/member-portal/me/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_token_rejected_on_portal_billing(self, api_client, make_user, org, make_membership):
        user = make_user(username='staffx@ex.com', email='staffx@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        resp = api_client.get('/api/member-portal/billing/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_rejected_on_portal_me(self):
        client = APIClient()
        resp = client.get('/api/member-portal/me/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestActivatePortalAccessView:
    def test_admin_activates_and_sends_email(self, admin_client, org, make_member, mailoutbox):
        member = make_member(org, email='nuevo@example.com')
        resp = admin_client.post(f'/api/members/{member.id}/portal-access/')
        assert resp.status_code == status.HTTP_200_OK

        member.refresh_from_db()
        assert member.user_id is not None
        assert MemberPortalInvitationModel.objects.filter(member=member, used=False).exists()
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ['nuevo@example.com']

    def test_resend_reuses_existing_user_account(self, admin_client, org, make_member, mailoutbox):
        member = make_member(org, email='nuevo2@example.com')
        admin_client.post(f'/api/members/{member.id}/portal-access/')
        member.refresh_from_db()
        first_user_id = member.user_id

        admin_client.post(f'/api/members/{member.id}/portal-access/')
        member.refresh_from_db()
        assert member.user_id == first_user_id
        assert MemberPortalInvitationModel.objects.filter(member=member).count() == 2

    def test_resend_invalidates_previous_invitation(self, admin_client, org, make_member):
        member = make_member(org, email='resend@example.com')
        admin_client.post(f'/api/members/{member.id}/portal-access/')
        first_invitation = MemberPortalInvitationModel.objects.get(member=member)

        admin_client.post(f'/api/members/{member.id}/portal-access/')
        first_invitation.refresh_from_db()
        assert first_invitation.used is True

        second_invitation = MemberPortalInvitationModel.objects.exclude(pk=first_invitation.pk).get(member=member)
        assert second_invitation.used is False

        # El link viejo ya no debe servir para tomar la cuenta.
        client = APIClient()
        resp = client.post('/api/member-portal/accept-invite/', {
            'token': str(first_invitation.token), 'password': 'algo12345',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_activate_rejects_email_already_used_by_another_members_portal_account(
        self, admin_client, org, make_org, make_member,
    ):
        other_org = make_org(name='Other Org', slug='other-org')
        _make_portal_member(other_org, make_member, email='shared@example.com')

        member = make_member(org, email='shared@example.com')
        resp = admin_client.post(f'/api/members/{member.id}/portal-access/')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ya tiene acceso al portal' in str(resp.data)

        member.refresh_from_db()
        assert member.user_id is None

    def test_manager_cannot_activate(self, api_client, make_user, org, make_membership, make_member):
        member = make_member(org)
        user = make_user(username='mgr2@ex.com', email='mgr2@ex.com', password='p!')
        make_membership(user, org, role='manager')
        token = _make_jwt_for(user, org=org, role='manager')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        resp = api_client.post(f'/api/members/{member.id}/portal-access/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAcceptInviteAndLogin:
    def test_full_flow_activate_accept_login(self, admin_client, org, make_member):
        member = make_member(org, email='flow@example.com')
        admin_client.post(f'/api/members/{member.id}/portal-access/')
        invitation = MemberPortalInvitationModel.objects.get(member=member)

        client = APIClient()
        accept_resp = client.post('/api/member-portal/accept-invite/', {
            'token': str(invitation.token), 'password': 'nuevaClave123',
        }, format='json')
        assert accept_resp.status_code == status.HTTP_201_CREATED
        assert accept_resp.data['member']['email'] == 'flow@example.com'

        invitation.refresh_from_db()
        assert invitation.used is True

        login_resp = client.post('/api/member-portal/login/', {
            'email': 'flow@example.com', 'password': 'nuevaClave123',
        }, format='json')
        assert login_resp.status_code == status.HTTP_200_OK
        assert 'tokens' in login_resp.data

    def test_login_wrong_password_fails(self, org, make_member):
        _make_portal_member(org, make_member, email='wp@example.com', password='correcta123')
        client = APIClient()
        resp = client.post('/api/member-portal/login/', {
            'email': 'wp@example.com', 'password': 'incorrecta',
        }, format='json')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_ambiguous_duplicate_email_fails_cleanly(self, org, make_org, make_member):
        """ActivatePortalAccessView ya bloquea este caso, pero si dos cuentas de
        portal terminan compartiendo el email (dato preexistente, migración, etc.),
        el login no debe romperse con un 500 por MultipleObjectsReturned."""
        other_org = make_org(name='Dup Org', slug='dup-org')
        _make_portal_member(org, make_member, email='dup@example.com', password='clave1234')
        _make_portal_member(other_org, make_member, email='dup@example.com', password='clave1234')

        client = APIClient()
        resp = client.post('/api/member-portal/login/', {
            'email': 'dup@example.com', 'password': 'clave1234',
        }, format='json')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_accept_invite_expired_token_rejected(self, org, make_member):
        member = make_member(org, email='exp@example.com')
        invitation = MemberPortalInvitationModel.objects.create(
            member=member, expires_at=timezone.now() - timedelta(days=1),
        )
        client = APIClient()
        resp = client.post('/api/member-portal/accept-invite/', {
            'token': str(invitation.token), 'password': 'algo12345',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_accept_invite_already_used_rejected(self, org, make_member):
        member = make_member(org, email='used@example.com')
        invitation = MemberPortalInvitationModel.objects.create(
            member=member, expires_at=timezone.now() + timedelta(days=1), used=True,
        )
        client = APIClient()
        resp = client.post('/api/member-portal/accept-invite/', {
            'token': str(invitation.token), 'password': 'algo12345',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMemberPortalOwnDataOnly:
    def test_me_returns_own_profile(self, org, make_member):
        member = _make_portal_member(org, make_member, email='me@example.com')
        client = _portal_client(member)
        resp = client.get('/api/member-portal/me/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['email'] == 'me@example.com'

    def test_billing_only_includes_own_payments(self, org, make_member, make_plan, admin_client):
        member_a = _make_portal_member(org, make_member, email='a@example.com')
        member_b = make_member(org, email='b@example.com')
        plan = make_plan(org)
        admin_client.post('/api/billing/renew/', {
            'member_id': member_a.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        admin_client.post('/api/billing/renew/', {
            'member_id': member_b.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')

        client = _portal_client(member_a)
        resp = client.get('/api/member-portal/billing/')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data['payments']) == 1
        assert resp.data['current_subscription']['member_id'] == member_a.id


@pytest.mark.django_db
class TestMemberPortalClassSelfService:
    def _make_session(self, admin_client, org):
        ct_resp = admin_client.post('/api/classes/types/', {'name': 'Yoga', 'capacity': 5}, format='json')
        sched_resp = admin_client.post('/api/classes/schedules/', {
            'class_type_id': ct_resp.data['id'], 'weekday': 0, 'start_time': '07:00:00',
        }, format='json')
        assert sched_resp.status_code == status.HTTP_201_CREATED

        today = timezone.localdate()
        days_ahead = (0 - today.weekday()) % 7
        target = today + timedelta(days=days_ahead)
        list_resp = admin_client.get(f'/api/classes/sessions/?date_from={target.isoformat()}&date_to={target.isoformat()}')
        return list_resp.data[0]

    def test_member_can_enroll_and_cancel_self(self, org, make_member, admin_client):
        # org de admin_client viene del fixture `org`; hay que habilitar 'classes' para poder crear tipos/horarios
        org.enabled_modules = list(set(org.enabled_modules) | {'classes'})
        org.save(update_fields=['enabled_modules'])

        session = self._make_session(admin_client, org)
        member = _make_portal_member(org, make_member, email='c1@example.com')
        client = _portal_client(member)

        enroll_resp = client.post(f'/api/member-portal/classes/sessions/{session["id"]}/enroll/')
        assert enroll_resp.status_code == status.HTTP_201_CREATED
        enrollment_id = enroll_resp.data['id']

        cancel_resp = client.post(f'/api/member-portal/classes/enrollments/{enrollment_id}/cancel/')
        assert cancel_resp.status_code == status.HTTP_200_OK
        assert cancel_resp.data['status'] == 'cancelled'

    def test_member_cannot_cancel_another_members_enrollment(self, org, make_member, admin_client):
        org.enabled_modules = list(set(org.enabled_modules) | {'classes'})
        org.save(update_fields=['enabled_modules'])

        session = self._make_session(admin_client, org)
        member_a = _make_portal_member(org, make_member, email='ca@example.com')
        member_b = _make_portal_member(org, make_member, email='cb@example.com')

        client_a = _portal_client(member_a)
        enroll_resp = client_a.post(f'/api/member-portal/classes/sessions/{session["id"]}/enroll/')
        enrollment_id = enroll_resp.data['id']

        client_b = _portal_client(member_b)
        resp = client_b.post(f'/api/member-portal/classes/enrollments/{enrollment_id}/cancel/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN
