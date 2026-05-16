from django.db import models


class AuditLogModel(models.Model):
    ACTION_CREATED = 'created'
    ACTION_UPDATED = 'updated'
    ACTION_DELETED = 'deleted'
    ACTION_CHOICES = [
        (ACTION_CREATED, 'Created'),
        (ACTION_UPDATED, 'Updated'),
        (ACTION_DELETED, 'Deleted'),
    ]

    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    organization_id = models.IntegerField(null=True, blank=True, db_index=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']

    def __str__(self) -> str:
        return f'[{self.timestamp}] {self.action} {self.model_name}#{self.object_id} by user={self.user_id}'
