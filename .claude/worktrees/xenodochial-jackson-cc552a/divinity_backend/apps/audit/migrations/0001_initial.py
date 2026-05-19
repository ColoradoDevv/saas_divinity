import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('organizations', '0004_invitationmodel_trial_payment_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLogModel',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('action', models.CharField(db_index=True, max_length=80)),
                ('model_name', models.CharField(db_index=True, max_length=80)),
                ('object_id', models.CharField(blank=True, default='', max_length=40)),
                ('extra_data', models.JSONField(blank=True, null=True)),
                (
                    'organization',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='audit_logs',
                        to='organizations.organizationmodel',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='audit_logs',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'audit_log',
                'ordering': ['-timestamp'],
            },
        ),
    ]
