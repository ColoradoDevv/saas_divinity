from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organizations.models import OrganizationModel
from domain.organizations.currency import CURRENCY_CHOICES
from domain.organizations.verticals import (
    BUSINESS_TYPE_CHOICES,
    BUSINESS_TYPE_GENERIC,
    get_valid_module_keys,
)


def _validate_modules_for_vertical(business_type: str, modules: list) -> None:
    invalid = set(modules) - get_valid_module_keys(business_type)
    if invalid:
        raise serializers.ValidationError({
            'enabled_modules': (
                f'Módulos no válidos para el vertical "{business_type}": '
                f'{", ".join(sorted(invalid))}.'
            )
        })


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationModel
        fields = [
            'id', 'name', 'slug', 'plan', 'business_type', 'enabled_modules',
            'is_active', 'onboarding_completed', 'primary_color', 'logo_url',
            'payment_status', 'last_payment_date', 'next_payment_date',
            'currency', 'created_at',
        ]
        read_only_fields = fields


class UpdateOrganizationSerializer(serializers.Serializer):
    """Autoservicio del admin de la empresa. enabled_modules se valida en la
    vista contra el catálogo del business_type ya asignado a la organización."""
    name = serializers.CharField(max_length=120, required=False)
    enabled_modules = serializers.ListField(child=serializers.CharField(), required=False)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.ChoiceField(choices=CURRENCY_CHOICES, required=False)


class OnboardingSerializer(serializers.Serializer):
    """enabled_modules se valida en la vista contra el catálogo del
    business_type ya asignado a la organización (elegido por el superadmin)."""
    name = serializers.CharField(max_length=120, required=False)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True)
    enabled_modules = serializers.ListField(child=serializers.CharField(), required=False)


class CreateOrganizationSerializer(serializers.Serializer):
    # Datos de la empresa
    name = serializers.CharField(max_length=120)
    plan = serializers.ChoiceField(choices=['pro', 'enterprise'], default='pro')
    business_type = serializers.ChoiceField(choices=BUSINESS_TYPE_CHOICES, default=BUSINESS_TYPE_GENERIC)
    enabled_modules = serializers.ListField(child=serializers.CharField(), default=['members'])
    # Datos del usuario admin de la empresa
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=8)
    admin_first_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    admin_last_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')

    def validate(self, data: dict) -> dict:
        _validate_modules_for_vertical(data['business_type'], data.get('enabled_modules', []))
        return data


class PaymentUpdateSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=['paid', 'unpaid', 'overdue'])
    last_payment_date = serializers.DateField(required=False, allow_null=True)
    next_payment_date = serializers.DateField(required=False, allow_null=True)


class SuperUpdateOrganizationSerializer(serializers.Serializer):
    """enabled_modules se valida en la vista, ya que depende de si business_type
    también cambia en el mismo request (recorta a la intersección con el nuevo
    catálogo cuando el vertical cambia)."""
    name = serializers.CharField(max_length=120, required=False)
    plan = serializers.ChoiceField(choices=['pro', 'enterprise'], required=False)
    business_type = serializers.ChoiceField(choices=BUSINESS_TYPE_CHOICES, required=False)
    enabled_modules = serializers.ListField(child=serializers.CharField(), required=False)
    is_active = serializers.BooleanField(required=False)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True)


class MemberRoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['admin', 'manager', 'staff'], required=False)
    is_active = serializers.BooleanField(required=False)


class MembershipSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True, allow_blank=True)
    last_name = serializers.CharField(read_only=True, allow_blank=True)
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'manager', 'staff'], default='staff')


class RegisterOrganizationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    slug = serializers.SlugField(max_length=80)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    first_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')

    def validate_slug(self, value):
        if OrganizationModel.objects.filter(slug=value).exists():
            raise serializers.ValidationError('Este slug ya está en uso.')
        return value

    def validate_email(self, value):
        UserModel = get_user_model()
        if UserModel.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'manager', 'staff'], default='staff')


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    first_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
