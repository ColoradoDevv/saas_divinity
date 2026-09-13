from rest_framework import serializers


# ------------------------------------------------------------------ #
# Class type serializers                                              #
# ------------------------------------------------------------------ #

class ClassTypeReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    instructor_id = serializers.IntegerField(read_only=True, allow_null=True)
    instructor_name = serializers.CharField(read_only=True, allow_blank=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    capacity = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)


class ClassTypeWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    instructor_id = serializers.IntegerField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(min_value=1, default=60)
    capacity = serializers.IntegerField(min_value=1, default=20)


class ClassTypeUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    instructor_id = serializers.IntegerField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(min_value=1, required=False)
    capacity = serializers.IntegerField(min_value=1, required=False)
    is_active = serializers.BooleanField(required=False)


# ------------------------------------------------------------------ #
# Schedule serializers                                                 #
# ------------------------------------------------------------------ #

class ScheduleReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    class_type_id = serializers.IntegerField(read_only=True)
    class_type_name = serializers.CharField(read_only=True)
    weekday = serializers.IntegerField(read_only=True)
    start_time = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)


class ScheduleWriteSerializer(serializers.Serializer):
    class_type_id = serializers.IntegerField()
    weekday = serializers.IntegerField(min_value=0, max_value=6)
    start_time = serializers.TimeField()


class ScheduleUpdateSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6, required=False)
    start_time = serializers.TimeField(required=False)
    is_active = serializers.BooleanField(required=False)


# ------------------------------------------------------------------ #
# Session / enrollment serializers                                    #
# ------------------------------------------------------------------ #

class SessionReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    class_type_id = serializers.IntegerField(read_only=True)
    class_type_name = serializers.CharField(read_only=True)
    schedule_id = serializers.IntegerField(read_only=True, allow_null=True)
    date = serializers.CharField(read_only=True)
    start_time = serializers.CharField(read_only=True)
    instructor_id = serializers.IntegerField(read_only=True, allow_null=True)
    instructor_name = serializers.CharField(read_only=True, allow_blank=True)
    capacity = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)


class EnrollmentReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    session_id = serializers.IntegerField(read_only=True)
    member_id = serializers.IntegerField(read_only=True)
    member_name = serializers.CharField(read_only=True)
    member_email = serializers.CharField(read_only=True, allow_blank=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.CharField(read_only=True, allow_null=True)


class SessionDetailSerializer(SessionReadSerializer):
    enrollments = EnrollmentReadSerializer(many=True, read_only=True)


class EnrollMemberSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
