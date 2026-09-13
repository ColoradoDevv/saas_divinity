from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class CheckInModel(models.Model):
    METHOD_CHOICES = [
        ('code', 'Código/QR'),
        ('manual', 'Búsqueda manual'),
        ('face', 'Reconocimiento facial'),
        ('fingerprint', 'Huella digital'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='checkins',
    )
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='checkins',
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_checkins',
    )

    class Meta:
        db_table = 'check_in'
        ordering = ['-checked_in_at']

    def __str__(self) -> str:
        return f'{self.member} — {self.checked_in_at}'


class BiometricDeviceModel(models.Model):
    """Un terminal biométrico o el agente local de un lector USB — nunca es
    una persona ni un rol de staff, se autentica con una clave propia (ver
    infrastructure/authentication/biometric_device_auth.py)."""

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='biometric_devices',
    )
    name = models.CharField(max_length=80)
    device_key_hash = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'biometric_device'
        ordering = ['name']

    def __str__(self) -> str:
        return f'{self.name} ({self.organization})'

    def set_device_key(self, raw_secret: str) -> None:
        self.device_key_hash = make_password(raw_secret)

    def check_device_key(self, raw_secret: str) -> bool:
        return check_password(raw_secret, self.device_key_hash)


class MemberBiometricEnrollmentModel(models.Model):
    """Mapeo entre el id interno que un dispositivo biométrico asignó a un
    miembro al enrolar su huella ahí, y el miembro real de nuestro sistema."""

    device = models.ForeignKey(
        BiometricDeviceModel,
        on_delete=models.CASCADE,
        related_name='enrollments',
    )
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='biometric_enrollments',
    )
    external_user_id = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'member_biometric_enrollment'
        unique_together = [['device', 'external_user_id'], ['device', 'member']]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.member} @ {self.device} = {self.external_user_id}'
