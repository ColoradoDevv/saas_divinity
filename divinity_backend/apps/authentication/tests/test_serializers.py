import pytest
from apps.authentication.serializers import (
    AuthSessionSerializer,
    AuthenticatedUserSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    MeResponseSerializer,
    MembershipSerializer,
    TokenPairSerializer,
)


class TestLoginSerializer:
    def test_valid_email_and_password(self):
        s = LoginSerializer(data={'email': 'user@example.com', 'password': 'secret'})
        assert s.is_valid(), s.errors

    def test_accepts_username_as_email_field(self):
        s = LoginSerializer(data={'email': 'juan.perez1', 'password': 'secret'})
        assert s.is_valid(), s.errors

    def test_blank_email_raises_error(self):
        s = LoginSerializer(data={'email': '', 'password': 'secret'})
        assert not s.is_valid()
        assert 'email' in s.errors

    def test_blank_password_raises_error(self):
        s = LoginSerializer(data={'email': 'user@example.com', 'password': ''})
        assert not s.is_valid()
        assert 'password' in s.errors

    def test_email_exceeds_max_length(self):
        long_email = 'a' * 255
        s = LoginSerializer(data={'email': long_email, 'password': 'secret'})
        assert not s.is_valid()
        assert 'email' in s.errors

    def test_password_whitespace_not_trimmed(self):
        s = LoginSerializer(data={'email': 'u@e.com', 'password': '  secret  '})
        assert s.is_valid()
        assert s.validated_data['password'] == '  secret  '

    def test_missing_password_field(self):
        s = LoginSerializer(data={'email': 'u@e.com'})
        assert not s.is_valid()
        assert 'password' in s.errors

    def test_missing_email_field(self):
        s = LoginSerializer(data={'password': 'secret'})
        assert not s.is_valid()
        assert 'email' in s.errors


class TestForgotPasswordSerializer:
    def test_valid_email(self):
        s = ForgotPasswordSerializer(data={'email': 'reset@example.com'})
        assert s.is_valid(), s.errors

    def test_invalid_email_format(self):
        s = ForgotPasswordSerializer(data={'email': 'not-an-email'})
        assert not s.is_valid()
        assert 'email' in s.errors

    def test_email_leading_trailing_spaces_trimmed(self):
        s = ForgotPasswordSerializer(data={'email': '  trim@example.com  '})
        assert s.is_valid()
        assert s.validated_data['email'] == 'trim@example.com'

    def test_empty_email_raises_error(self):
        s = ForgotPasswordSerializer(data={'email': ''})
        assert not s.is_valid()

    def test_missing_email_field_raises_error(self):
        s = ForgotPasswordSerializer(data={})
        assert not s.is_valid()


class TestMembershipSerializer:
    def test_allowed_modules_and_position_are_optional(self):
        data = {'role': 'admin', 'organization': {
            'id': 1, 'name': 'Org', 'slug': 'org', 'plan': 'pro',
            'enabled_modules': [], 'is_active': True,
            'onboarding_completed': False, 'primary_color': '', 'logo_url': '',
        }}
        s = MembershipSerializer(data)
        assert s.data['role'] == 'admin'

    def test_allowed_modules_null(self):
        data = {
            'role': 'staff',
            'organization': {
                'id': 2, 'name': 'O', 'slug': 'o', 'plan': 'pro',
                'enabled_modules': ['workers'], 'is_active': True,
                'onboarding_completed': True, 'primary_color': '', 'logo_url': '',
            },
            'allowed_modules': None,
            'position': None,
        }
        s = MembershipSerializer(data)
        assert s.data['allowed_modules'] is None
        assert s.data['position'] is None


class TestAuthSessionSerializer:
    def test_membership_can_be_null(self):
        data = {
            'user': {
                'id': 1, 'username': 'u', 'email': 'u@e.com',
                'first_name': '', 'last_name': '',
                'is_active': True, 'is_staff': False, 'is_superuser': False,
            },
            'tokens': {'access': 'acc', 'refresh': 'ref'},
            'membership': None,
        }
        s = AuthSessionSerializer(data)
        assert s.data['membership'] is None


class TestTokenPairSerializer:
    def test_fields_present(self):
        data = {'access': 'acc_token', 'refresh': 'ref_token'}
        s = TokenPairSerializer(data)
        assert s.data['access'] == 'acc_token'
        assert s.data['refresh'] == 'ref_token'


class TestMeResponseSerializer:
    def test_membership_can_be_null(self):
        data = {
            'user': {
                'id': 1, 'username': 'u', 'email': 'u@e.com',
                'first_name': '', 'last_name': '',
                'is_active': True, 'is_staff': False, 'is_superuser': False,
            },
            'membership': None,
        }
        s = MeResponseSerializer(data)
        assert s.data['membership'] is None
