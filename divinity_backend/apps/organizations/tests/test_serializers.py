import pytest
from apps.organizations.serializers import (
    CreateOrganizationSerializer,
    OnboardingSerializer,
    PaymentUpdateSerializer,
    UpdateOrganizationSerializer,
)


class TestCreateOrganizationSerializer:
    def _valid_data(self, **overrides):
        data = {
            'name': 'Test Corp',
            'admin_email': 'admin@corp.com',
            'admin_password': 'securepass',
        }
        data.update(overrides)
        return data

    def test_valid_full_data(self):
        s = CreateOrganizationSerializer(data=self._valid_data())
        assert s.is_valid(), s.errors

    def test_name_required(self):
        s = CreateOrganizationSerializer(data=self._valid_data(name=''))
        assert not s.is_valid()
        assert 'name' in s.errors

    def test_admin_email_must_be_valid_email(self):
        s = CreateOrganizationSerializer(data=self._valid_data(admin_email='not-email'))
        assert not s.is_valid()
        assert 'admin_email' in s.errors

    def test_admin_password_min_length_8(self):
        s = CreateOrganizationSerializer(data=self._valid_data(admin_password='short'))
        assert not s.is_valid()
        assert 'admin_password' in s.errors

    def test_plan_only_accepts_valid_choices(self):
        s = CreateOrganizationSerializer(data=self._valid_data(plan='free'))
        assert not s.is_valid()
        assert 'plan' in s.errors

    def test_plan_pro_accepted(self):
        s = CreateOrganizationSerializer(data=self._valid_data(plan='pro'))
        assert s.is_valid(), s.errors

    def test_plan_enterprise_accepted(self):
        s = CreateOrganizationSerializer(data=self._valid_data(plan='enterprise'))
        assert s.is_valid(), s.errors

    def test_enabled_modules_invalid_choice(self):
        s = CreateOrganizationSerializer(
            data=self._valid_data(enabled_modules=['invalid_module'])
        )
        assert not s.is_valid()
        assert 'enabled_modules' in s.errors

    def test_enabled_modules_valid_choices(self):
        s = CreateOrganizationSerializer(
            data=self._valid_data(enabled_modules=['members', 'workers', 'payments'])
        )
        assert s.is_valid(), s.errors

    def test_enabled_modules_invalid_for_chosen_business_type(self):
        s = CreateOrganizationSerializer(
            data=self._valid_data(business_type='gym', enabled_modules=['not_a_real_module'])
        )
        assert not s.is_valid()
        assert 'enabled_modules' in s.errors

    def test_business_type_defaults_to_generic(self):
        s = CreateOrganizationSerializer(data=self._valid_data())
        assert s.is_valid(), s.errors
        assert s.validated_data['business_type'] == 'generic'

    def test_business_type_accepts_gym(self):
        s = CreateOrganizationSerializer(data=self._valid_data(business_type='gym', enabled_modules=['members']))
        assert s.is_valid(), s.errors

    def test_business_type_rejects_unknown_vertical(self):
        s = CreateOrganizationSerializer(data=self._valid_data(business_type='not_a_vertical'))
        assert not s.is_valid()
        assert 'business_type' in s.errors

    def test_optional_name_fields_have_defaults(self):
        s = CreateOrganizationSerializer(data=self._valid_data())
        assert s.is_valid()
        assert s.validated_data['admin_first_name'] == ''
        assert s.validated_data['admin_last_name'] == ''


class TestPaymentUpdateSerializer:
    def test_paid_status_valid(self):
        s = PaymentUpdateSerializer(data={'payment_status': 'paid'})
        assert s.is_valid(), s.errors

    def test_unpaid_status_valid(self):
        s = PaymentUpdateSerializer(data={'payment_status': 'unpaid'})
        assert s.is_valid(), s.errors

    def test_overdue_status_valid(self):
        s = PaymentUpdateSerializer(data={'payment_status': 'overdue'})
        assert s.is_valid(), s.errors

    def test_invalid_status_raises_error(self):
        s = PaymentUpdateSerializer(data={'payment_status': 'canceled'})
        assert not s.is_valid()
        assert 'payment_status' in s.errors

    def test_dates_are_optional(self):
        s = PaymentUpdateSerializer(data={'payment_status': 'paid'})
        assert s.is_valid()
        assert 'last_payment_date' not in s.validated_data

    def test_dates_with_valid_values(self):
        s = PaymentUpdateSerializer(data={
            'payment_status': 'paid',
            'last_payment_date': '2026-01-01',
            'next_payment_date': '2026-02-01',
        })
        assert s.is_valid(), s.errors


class TestOnboardingSerializer:
    """enabled_modules ya no se valida contra un catálogo estático aquí: la vista
    (OnboardingCompleteView) la valida contra el catálogo del business_type de la
    organización — ver TestOnboardingCompleteView en test_views.py."""

    def test_all_fields_optional(self):
        s = OnboardingSerializer(data={})
        assert s.is_valid(), s.errors

    def test_enabled_modules_accepts_any_string_list(self):
        s = OnboardingSerializer(data={'enabled_modules': ['members', 'attendance']})
        assert s.is_valid(), s.errors

    def test_primary_color_optional(self):
        s = OnboardingSerializer(data={'primary_color': '#ABC123'})
        assert s.is_valid(), s.errors


class TestUpdateOrganizationSerializer:
    def test_all_fields_optional(self):
        s = UpdateOrganizationSerializer(data={})
        assert s.is_valid(), s.errors

    def test_primary_color_max_7_chars(self):
        s = UpdateOrganizationSerializer(data={'primary_color': '#FFFFFFFF'})
        assert not s.is_valid()
        assert 'primary_color' in s.errors

    def test_primary_color_7_chars_accepted(self):
        s = UpdateOrganizationSerializer(data={'primary_color': '#FF0000'})
        assert s.is_valid(), s.errors

    def test_name_max_length(self):
        s = UpdateOrganizationSerializer(data={'name': 'A' * 121})
        assert not s.is_valid()
        assert 'name' in s.errors
