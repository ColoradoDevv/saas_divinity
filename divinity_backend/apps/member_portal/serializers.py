from rest_framework import serializers


class MemberPortalLoginSerializer(serializers.Serializer):
    email = serializers.CharField(trim_whitespace=True, max_length=254)
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, style={'input_type': 'password'},
    )


class AcceptPortalInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'},
    )
