from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AuditLogModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('organization_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('action', models.CharField(
                    choices=[('created', 'Created'), ('updated', 'Updated'), ('deleted', 'Deleted')],
                    max_length=20,
                )),
                ('model_name', models.CharField(max_length=100)),
                ('object_id', models.IntegerField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'audit_log',
                'ordering': ['-timestamp'],
            },
        ),
    ]
