from django.conf import settings
from django.db import models
from django.db.models import Q


STANDARD_FIELD_CHOICES = [
    ('id_number', 'Número de identidad'),
    ('address', 'Dirección'),
    ('birth_date', 'Fecha de nacimiento'),
    ('phone_secondary', 'Teléfono secundario'),
    ('photo', 'Foto'),
    ('notes', 'Notas'),
    ('gender', 'Género'),
    ('emergency_contact_name', 'Contacto de emergencia'),
    ('emergency_contact_phone', 'Teléfono de emergencia'),
    ('medical_conditions', 'Condiciones médicas / alergias'),
    ('goal', 'Objetivo'),
    ('referred_by', 'Referido por'),
]

STANDARD_FIELD_KEYS = [key for key, _ in STANDARD_FIELD_CHOICES]


class MemberModel(models.Model):
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('inactive', 'Inactivo'),
        ('suspended', 'Suspendido'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='members',
    )
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_members',
    )

    photo_url = models.TextField(blank=True, default='')
    member_code = models.CharField(max_length=12, blank=True, default='')
    # Descriptor facial (128 floats) calculado en el navegador con face-api.js a partir
    # de photo_url — se usa para verificar identidad 1:1 en el check-in por rostro.
    face_descriptor = models.JSONField(null=True, blank=True)
    # Cuenta del portal de autoservicio — null hasta que el staff activa el acceso.
    # OneToOne (no ForeignKey como WorkerModel.user): una cuenta de portal es un
    # miembro puntual, no una persona que trabaja en varios gimnasios.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='member_profile',
    )

    class Meta:
        db_table = 'member'
        unique_together = [['organization', 'email']]
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'member_code'],
                condition=~Q(member_code=''),
                name='unique_member_code_per_org',
            ),
        ]

    def __str__(self) -> str:
        return f'{self.first_name} {self.last_name} <{self.email}>'


class MemberFieldConfigModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='member_field_configs',
    )
    field_name = models.CharField(max_length=30, choices=STANDARD_FIELD_CHOICES)
    is_enabled = models.BooleanField(default=False)
    is_required = models.BooleanField(default=False)
    label = models.CharField(max_length=60, blank=True, default='')

    class Meta:
        db_table = 'member_field_config'
        unique_together = [['organization', 'field_name']]

    def __str__(self) -> str:
        return f'{self.organization} / {self.field_name}'


class MemberCustomFieldModel(models.Model):
    FIELD_TYPE_CHOICES = [
        ('text', 'Texto'),
        ('number', 'Número'),
        ('date', 'Fecha'),
        ('boolean', 'Booleano'),
        ('select', 'Selección'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='member_custom_fields',
    )
    name = models.CharField(max_length=60)
    label = models.CharField(max_length=60)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    options = models.JSONField(null=True, blank=True)
    is_required = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'member_custom_field'
        unique_together = [['organization', 'name']]
        ordering = ['order', 'id']

    def __str__(self) -> str:
        return f'{self.organization} / {self.name} ({self.field_type})'


class MemberCustomFieldValueModel(models.Model):
    member = models.ForeignKey(
        MemberModel,
        on_delete=models.CASCADE,
        related_name='custom_field_values',
    )
    field = models.ForeignKey(
        MemberCustomFieldModel,
        on_delete=models.CASCADE,
        related_name='values',
    )
    value = models.TextField()

    class Meta:
        db_table = 'member_custom_field_value'
        unique_together = [['member', 'field']]

    def __str__(self) -> str:
        return f'{self.member} / {self.field.name} = {self.value}'


class MemberStandardFieldValueModel(models.Model):
    member = models.ForeignKey(
        MemberModel,
        on_delete=models.CASCADE,
        related_name='standard_field_values',
    )
    field_name = models.CharField(max_length=30, choices=STANDARD_FIELD_CHOICES)
    value = models.TextField()

    class Meta:
        db_table = 'member_standard_field_value'
        unique_together = [['member', 'field_name']]

    def __str__(self) -> str:
        return f'{self.member} / {self.field_name} = {self.value}'
