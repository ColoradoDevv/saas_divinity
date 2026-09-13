import pytest

from apps.members.defaults import RECOMMENDED_GYM_FIELDS, seed_recommended_member_fields
from apps.members.models import MemberFieldConfigModel


@pytest.mark.django_db
class TestSeedRecommendedMemberFields:
    def test_creates_all_recommended_fields_when_none_exist(self, org):
        created = seed_recommended_member_fields(org)

        assert created == len(RECOMMENDED_GYM_FIELDS)
        configs = {
            c.field_name: c
            for c in MemberFieldConfigModel.objects.filter(organization=org)
        }
        assert set(configs) == set(RECOMMENDED_GYM_FIELDS)
        assert configs['id_number'].is_enabled is True
        assert configs['id_number'].is_required is True
        assert configs['notes'].is_required is False

    def test_does_not_overwrite_existing_config(self, org):
        MemberFieldConfigModel.objects.create(
            organization=org, field_name='id_number', is_enabled=False, is_required=False,
        )

        seed_recommended_member_fields(org)

        config = MemberFieldConfigModel.objects.get(organization=org, field_name='id_number')
        assert config.is_enabled is False
        assert config.is_required is False

    def test_is_idempotent(self, org):
        seed_recommended_member_fields(org)
        second_run_created = seed_recommended_member_fields(org)

        assert second_run_created == 0
        assert (
            MemberFieldConfigModel.objects.filter(organization=org).count()
            == len(RECOMMENDED_GYM_FIELDS)
        )
