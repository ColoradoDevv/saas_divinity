from rest_framework import serializers

from apps.organizations.models import OrganizationModel


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationModel
        fields = [
            'id', 'name', 'slug', 'plan', 'enabled_modules',
            'is_active', 'onboarding_completed', 'primary_color', 'logo_url',
            'payment_status', 'last_payment_date', 'next_payment_date',
            'created_at',
        ]
        read_only_fields = fields


class UpdateOrganizationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    enabled_modules = serializers.ListField(child=serializers.CharField(), required=False)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True)


class OnboardingSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    primary_color = serializers.CharField(max_length=7, required=False, allow_blank=True)
    logo_url = serializers.CharField(required=False, allow_blank=True)
    enabled_modules = serializers.ListField(
        child=serializers.ChoiceField(choices=['clients', 'payments', 'attendance', 'reports', 'workers']),
        required=False,
    )


class CreateOrganizationSerializer(serializers.Serializer):
    # Datos de la empresa
    name = serializers.CharField(max_length=120)
    plan = serializers.ChoiceField(choices=['pro', 'enterprise'], default='pro')
    enabled_modules = serializers.ListField(
        child=serializers.ChoiceField(choices=['clients', 'payments', 'attendance', 'reports', 'workers']),
        default=['clients'],
    )
    # Datos del usuario admin de la empresa
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=8)
    admin_first_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    admin_last_name = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')


class PaymentUpdateSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=['paid', 'unpaid', 'overdue'])
    last_payment_date = serializers.DateField(required=False, allow_null=True)
    next_payment_date = serializers.DateField(required=False, allow_null=True)


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
