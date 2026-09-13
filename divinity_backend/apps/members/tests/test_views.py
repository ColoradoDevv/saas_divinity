import pytest
from rest_framework import status

from apps.members.defaults import RECOMMENDED_GYM_FIELDS
from apps.members.models import MemberFieldConfigModel
from conftest import _make_jwt_for


@pytest.mark.django_db
class TestApplyRecommendedFieldConfigView:
    url = '/api/members/field-config/apply-recommended/'

    def test_admin_can_apply_recommended_config(self, admin_client, org):
        resp = admin_client.post(self.url)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['created'] == len(RECOMMENDED_GYM_FIELDS)
        assert MemberFieldConfigModel.objects.filter(organization=org).count() == len(RECOMMENDED_GYM_FIELDS)

    def test_second_call_does_not_duplicate(self, admin_client, org):
        admin_client.post(self.url)
        resp = admin_client.post(self.url)

        assert resp.data['created'] == 0
        assert MemberFieldConfigModel.objects.filter(organization=org).count() == len(RECOMMENDED_GYM_FIELDS)

    def test_manager_cannot_apply_config(self, api_client, make_user, org, make_membership):
        user = make_user(username='mgr@ex.com', email='mgr@ex.com', password='p!')
        make_membership(user, org, role='manager')
        token = _make_jwt_for(user, org=org, role='manager')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        resp = api_client.post(self.url)

        assert resp.status_code == status.HTTP_403_FORBIDDEN
