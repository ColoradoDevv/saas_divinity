from rest_framework import serializers


class WorkerReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True, allow_blank=True)
    phone = serializers.CharField(read_only=True, allow_blank=True)
    position = serializers.CharField(read_only=True, allow_blank=True)
    has_account = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    task_count = serializers.IntegerField(read_only=True, default=0)


class CreateWorkerSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    position = serializers.CharField(max_length=80, required=False, allow_blank=True, default='')
    create_account = serializers.BooleanField(default=False)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        default='',
        style={'input_type': 'password'},
    )


class UpdateWorkerSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60, required=False)
    last_name = serializers.CharField(max_length=60, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    position = serializers.CharField(max_length=80, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class TaskReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    worker_id = serializers.IntegerField(read_only=True, allow_null=True)
    worker_name = serializers.SerializerMethodField()
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    due_date = serializers.DateField(read_only=True, allow_null=True)
    priority = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_worker_name(self, obj) -> str | None:
        return obj.get('worker_name')


class CreateTaskSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    due_date = serializers.DateField(required=False, allow_null=True)
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        default='medium',
    )


class UpdateTaskSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high'], required=False)
    status = serializers.ChoiceField(
        choices=['pending', 'in_progress', 'done', 'cancelled'],
        required=False,
    )
