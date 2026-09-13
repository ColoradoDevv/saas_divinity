from rest_framework import serializers


class NotificationReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    type = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    body = serializers.CharField(read_only=True, allow_blank=True)
    link = serializers.CharField(read_only=True, allow_blank=True)
    is_read = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
