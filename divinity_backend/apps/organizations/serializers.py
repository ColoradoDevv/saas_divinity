from rest_framework import serializers


class OrganizationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    plan = serializers.CharField(read_only=True)
    enabled_modules = serializers.ListField(child=serializers.CharField(), read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class UpdateOrganizationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    enabled_modules = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class MembershipSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(read_only=True)
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'manager', 'staff'], default='staff')
