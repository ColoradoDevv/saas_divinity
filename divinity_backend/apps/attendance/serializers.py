from rest_framework import serializers

from domain.attendance.entities import VALID_CHECKIN_METHODS


class CheckInReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    member_id = serializers.IntegerField(read_only=True)
    member_name = serializers.CharField(read_only=True)
    method = serializers.CharField(read_only=True)
    checked_in_at = serializers.CharField(read_only=True, allow_null=True)
    registered_by_id = serializers.IntegerField(read_only=True, allow_null=True)


class CheckInWriteSerializer(serializers.Serializer):
    member_id = serializers.IntegerField(required=False)
    member_code = serializers.CharField(max_length=12, required=False)
    method = serializers.ChoiceField(choices=list(VALID_CHECKIN_METHODS))

    def validate(self, data: dict) -> dict:
        if not data.get('member_id') and not data.get('member_code'):
            raise serializers.ValidationError('Debes indicar member_id o member_code.')
        return data


# ------------------------------------------------------------------ #
# Dispositivos biométricos                                             #
# ------------------------------------------------------------------ #

class BiometricDeviceReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    last_seen_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)


class BiometricDeviceWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)


class BiometricDeviceUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=False)
    is_active = serializers.BooleanField(required=False)


class MemberEnrollmentReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    device_id = serializers.IntegerField(read_only=True)
    device_name = serializers.CharField(read_only=True)
    member_id = serializers.IntegerField(read_only=True)
    member_name = serializers.CharField(read_only=True)
    external_user_id = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class MemberEnrollmentWriteSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    external_user_id = serializers.CharField(max_length=80)


class DeviceEventSerializer(serializers.Serializer):
    external_user_id = serializers.CharField(max_length=80)
