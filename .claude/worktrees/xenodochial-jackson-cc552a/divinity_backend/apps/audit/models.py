from django.contrib.auth import get_user_model
from django.db import models


class AuditLogModel(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    organization = models.ForeignKey(
        'organizations.OrganizationModel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=80, db_index=True)
    model_name = models.CharField(max_length=80, db_index=True)
    object_id = models.CharField(max_length=40, blank=True, default='')
    extra_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']

    def __str__(self) -> str:
        return f'[{self.timestamp}] {self.action} {self.model_name}/{self.object_id}'
