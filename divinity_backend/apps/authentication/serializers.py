from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(trim_whitespace=True)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={'input_type': 'password'},
    )


class AuthenticatedUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True, allow_blank=True)
    first_name = serializers.CharField(read_only=True, allow_blank=True)
    last_name = serializers.CharField(read_only=True, allow_blank=True)
    is_active = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class OrganizationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    plan = serializers.CharField(read_only=True)
    enabled_modules = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )
    is_active = serializers.BooleanField(read_only=True)


class MembershipSerializer(serializers.Serializer):
    role = serializers.CharField(read_only=True)
    organization = OrganizationSerializer(read_only=True)


class AuthSessionSerializer(serializers.Serializer):
    user = AuthenticatedUserSerializer(read_only=True)
    tokens = TokenPairSerializer(read_only=True)
    membership = MembershipSerializer(read_only=True, allow_null=True)


class MeResponseSerializer(serializers.Serializer):
    user = AuthenticatedUserSerializer(read_only=True)
    membership = MembershipSerializer(read_only=True, allow_null=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(trim_whitespace=True)
