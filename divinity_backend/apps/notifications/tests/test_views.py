import pytest
from rest_framework import status

from apps.notifications.models import NotificationModel
from apps.notifications.services import notify
from conftest import _make_jwt_for


@pytest.mark.django_db
class TestNotificationListView:
    url = '/api/notifications/'

    def test_admin_can_list(self, admin_client, org):
        notify(org.id, 'new_member', 'Nuevo miembro: Ana')
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 1

    def test_staff_forbidden(self, api_client, make_user, org, make_membership):
        user = make_user(username='stf@ex.com', email='stf@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_scoped_to_organization(self, admin_client, org, make_org):
        other_org = make_org(slug='other-notif-org')
        notify(other_org.id, 'new_member', 'Miembro de otra org')
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 0


@pytest.mark.django_db
class TestUnreadCountView:
    url = '/api/notifications/unread-count/'

    def test_counts_unread_only(self, admin_client, org):
        n1 = notify(org.id, 'new_member', 'Uno')
        notify(org.id, 'new_member', 'Dos')
        n1.is_read = True
        n1.save()

        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 1

    def test_staff_gets_zero(self, api_client, make_user, org, make_membership):
        notify(org.id, 'new_member', 'Uno')
        user = make_user(username='stf2@ex.com', email='stf2@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 0


@pytest.mark.django_db
class TestMarkReadViews:
    def test_mark_one_read(self, admin_client, org):
        n = notify(org.id, 'new_member', 'Uno')
        resp = admin_client.post(f'/api/notifications/{n.id}/read/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        n.refresh_from_db()
        assert n.is_read is True

    def test_mark_all_read(self, admin_client, org):
        notify(org.id, 'new_member', 'Uno')
        notify(org.id, 'new_member', 'Dos')
        resp = admin_client.post('/api/notifications/read-all/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert NotificationModel.objects.filter(organization_id=org.id, is_read=False).count() == 0

    def test_mark_read_nonexistent_returns_404(self, admin_client, org):
        resp = admin_client.post('/api/notifications/999999/read/')
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationTriggers:
    def test_creating_member_triggers_notification(self, admin_client, org):
        resp = admin_client.post('/api/members/', {
            'first_name': 'Ana', 'last_name': 'Gomez', 'email': 'ana.trigger@example.com',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert NotificationModel.objects.filter(organization_id=org.id, type='new_member').exists()

    def test_renew_triggers_notification(self, admin_client, org, make_member, make_plan):
        member = make_member(org)
        plan = make_plan(org)
        resp = admin_client.post('/api/billing/renew/', {
            'member_id': member.id, 'plan_id': plan.id, 'method': 'cash',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert NotificationModel.objects.filter(organization_id=org.id, type='payment_received').exists()
