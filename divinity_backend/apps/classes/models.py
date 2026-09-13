from django.db import models
from django.db.models import Q

WEEKDAY_CHOICES = [
    (0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'), (3, 'Jueves'),
    (4, 'Viernes'), (5, 'Sábado'), (6, 'Domingo'),
]


class ClassTypeModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='class_types',
    )
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True, default='')
    instructor = models.ForeignKey(
        'workers.WorkerModel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_types',
    )
    duration_minutes = models.PositiveIntegerField(default=60)
    capacity = models.PositiveIntegerField(default=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'class_type'
        unique_together = [['organization', 'name']]
        ordering = ['name']

    def __str__(self) -> str:
        return f'{self.name} ({self.organization})'


class ClassScheduleModel(models.Model):
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='class_schedules',
    )
    class_type = models.ForeignKey(
        ClassTypeModel,
        on_delete=models.CASCADE,
        related_name='schedules',
    )
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'class_schedule'
        ordering = ['weekday', 'start_time']

    def __str__(self) -> str:
        return f'{self.class_type} / {self.get_weekday_display()} {self.start_time}'


class ClassSessionModel(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Programada'),
        ('cancelled', 'Cancelada'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='class_sessions',
    )
    class_type = models.ForeignKey(
        ClassTypeModel,
        on_delete=models.CASCADE,
        related_name='sessions',
    )
    # Horario del que se generó esta sesión — null si es una sesión suelta
    # creada a mano (no generada automáticamente por sync_sessions).
    schedule = models.ForeignKey(
        ClassScheduleModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
    )
    date = models.DateField()
    start_time = models.TimeField()
    # Copiados del tipo de clase al generarse; editables por sesión puntual.
    instructor = models.ForeignKey(
        'workers.WorkerModel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_sessions',
    )
    capacity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'class_session'
        unique_together = [['class_type', 'date', 'start_time']]
        ordering = ['date', 'start_time']

    def __str__(self) -> str:
        return f'{self.class_type} — {self.date} {self.start_time}'


class ClassEnrollmentModel(models.Model):
    STATUS_CHOICES = [
        ('booked', 'Reservado'),
        ('attended', 'Asistió'),
        ('no_show', 'No asistió'),
        ('cancelled', 'Cancelada'),
    ]

    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.CASCADE,
        related_name='class_enrollments',
    )
    session = models.ForeignKey(
        ClassSessionModel,
        on_delete=models.CASCADE,
        related_name='enrollments',
    )
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='class_enrollments',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='booked')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'class_enrollment'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'member'],
                condition=~Q(status='cancelled'),
                name='unique_active_enrollment_per_session_member',
            ),
        ]

    def __str__(self) -> str:
        return f'{self.member} / {self.session} ({self.status})'
