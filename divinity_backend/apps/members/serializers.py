from rest_framework import serializers

from apps.members.models import STANDARD_FIELD_KEYS


# ------------------------------------------------------------------ #
# Member serializers                                                   #
# ------------------------------------------------------------------ #

class MemberReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    organization_id = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    created_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    standard_fields = serializers.DictField(read_only=True)
    custom_fields = serializers.DictField(read_only=True)


class MemberWriteSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    standard_fields = serializers.DictField(required=False, default=dict)
    custom_fields = serializers.DictField(required=False, default=dict)

    def validate_standard_fields(self, value: dict) -> dict:
        invalid = [k for k in value if k not in STANDARD_FIELD_KEYS]
        if invalid:
            raise serializers.ValidationError(
                f'Campos estándar desconocidos: {", ".join(invalid)}. '
                f'Opciones válidas: {", ".join(STANDARD_FIELD_KEYS)}'
            )
        return value


class MemberUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60, required=False)
    last_name = serializers.CharField(max_length=60, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    standard_fields = serializers.DictField(required=False)
    custom_fields = serializers.DictField(required=False)

    def validate_standard_fields(self, value: dict) -> dict:
        invalid = [k for k in value if k not in STANDARD_FIELD_KEYS]
        if invalid:
            raise serializers.ValidationError(
                f'Campos estándar desconocidos: {", ".join(invalid)}.'
            )
        return value


# ------------------------------------------------------------------ #
# Field config serializers                                             #
# ------------------------------------------------------------------ #

class FieldConfigReadSerializer(serializers.Serializer):
    field_name = serializers.CharField(read_only=True)
    is_enabled = serializers.BooleanField(read_only=True)
    is_required = serializers.BooleanField(read_only=True)
    label = serializers.CharField(read_only=True)


class FieldConfigWriteSerializer(serializers.Serializer):
    field_name = serializers.ChoiceField(choices=STANDARD_FIELD_KEYS)
    is_enabled = serializers.BooleanField()
    is_required = serializers.BooleanField(default=False)
    label = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')

    def validate(self, data: dict) -> dict:
        if data.get('is_required') and not data.get('is_enabled'):
            raise serializers.ValidationError(
                'Un campo no puede ser requerido si no está habilitado.'
            )
        return data


# ------------------------------------------------------------------ #
# Custom field serializers                                             #
# ------------------------------------------------------------------ #

FIELD_TYPE_CHOICES = ['text', 'number', 'date', 'boolean', 'select']


class CustomFieldReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    field_type = serializers.CharField(read_only=True)
    options = serializers.ListField(child=serializers.CharField(), read_only=True, allow_null=True)
    is_required = serializers.BooleanField(read_only=True)
    is_enabled = serializers.BooleanField(read_only=True)
    order = serializers.IntegerField(read_only=True)


class CustomFieldWriteSerializer(serializers.Serializer):
    name = serializers.SlugField(max_length=60)
    label = serializers.CharField(max_length=60)
    field_type = serializers.ChoiceField(choices=FIELD_TYPE_CHOICES)
    options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        default=None,
    )
    is_required = serializers.BooleanField(default=False)
    is_enabled = serializers.BooleanField(default=True)
    order = serializers.IntegerField(default=0, min_value=0)

    def validate(self, data: dict) -> dict:
        if data.get('field_type') == 'select':
            options = data.get('options')
            if not options:
                raise serializers.ValidationError(
                    {'options': 'Los campos de tipo "select" deben tener al menos una opción.'}
                )
        return data


class CustomFieldUpdateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=60, required=False)
    field_type = serializers.ChoiceField(choices=FIELD_TYPE_CHOICES, required=False)
    options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
    )
    is_required = serializers.BooleanField(required=False)
    is_enabled = serializers.BooleanField(required=False)
    order = serializers.IntegerField(required=False, min_value=0)

    def validate(self, data: dict) -> dict:
        if data.get('field_type') == 'select':
            options = data.get('options')
            if options is not None and not options:
                raise serializers.ValidationError(
                    {'options': 'Los campos de tipo "select" deben tener al menos una opción.'}
                )
        return data
