import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('organizations', '0003_organizationmodel_last_payment_date_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MemberModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=60)),
                ('last_name', models.CharField(max_length=60)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, default='', max_length=30)),
                ('status', models.CharField(
                    choices=[('active', 'Activo'), ('inactive', 'Inactivo'), ('suspended', 'Suspendido')],
                    default='active',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='members',
                    to='organizations.organizationmodel',
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_members',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'member',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='membermodel',
            constraint=models.UniqueConstraint(
                fields=['organization', 'email'],
                name='unique_member_email_per_org',
            ),
        ),
        migrations.CreateModel(
            name='MemberFieldConfigModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_name', models.CharField(
                    choices=[
                        ('id_number', 'Número de identidad'),
                        ('address', 'Dirección'),
                        ('birth_date', 'Fecha de nacimiento'),
                        ('phone_secondary', 'Teléfono secundario'),
                        ('photo', 'Foto'),
                        ('notes', 'Notas'),
                        ('gender', 'Género'),
                    ],
                    max_length=30,
                )),
                ('is_enabled', models.BooleanField(default=False)),
                ('is_required', models.BooleanField(default=False)),
                ('label', models.CharField(blank=True, default='', max_length=60)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='member_field_configs',
                    to='organizations.organizationmodel',
                )),
            ],
            options={
                'db_table': 'member_field_config',
            },
        ),
        migrations.AlterUniqueTogether(
            name='memberfieldconfigmodel',
            unique_together={('organization', 'field_name')},
        ),
        migrations.CreateModel(
            name='MemberCustomFieldModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=60)),
                ('label', models.CharField(max_length=60)),
                ('field_type', models.CharField(
                    choices=[
                        ('text', 'Texto'),
                        ('number', 'Número'),
                        ('date', 'Fecha'),
                        ('boolean', 'Booleano'),
                        ('select', 'Selección'),
                    ],
                    max_length=20,
                )),
                ('options', models.JSONField(blank=True, null=True)),
                ('is_required', models.BooleanField(default=False)),
                ('is_enabled', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='member_custom_fields',
                    to='organizations.organizationmodel',
                )),
            ],
            options={
                'db_table': 'member_custom_field',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='membercustomfieldmodel',
            unique_together={('organization', 'name')},
        ),
        migrations.CreateModel(
            name='MemberCustomFieldValueModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.TextField()),
                ('field', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='values',
                    to='members.membercustomfieldmodel',
                )),
                ('member', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='custom_field_values',
                    to='members.membermodel',
                )),
            ],
            options={
                'db_table': 'member_custom_field_value',
            },
        ),
        migrations.AlterUniqueTogether(
            name='membercustomfieldvaluemodel',
            unique_together={('member', 'field')},
        ),
        migrations.CreateModel(
            name='MemberStandardFieldValueModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_name', models.CharField(
                    choices=[
                        ('id_number', 'Número de identidad'),
                        ('address', 'Dirección'),
                        ('birth_date', 'Fecha de nacimiento'),
                        ('phone_secondary', 'Teléfono secundario'),
                        ('photo', 'Foto'),
                        ('notes', 'Notas'),
                        ('gender', 'Género'),
                    ],
                    max_length=30,
                )),
                ('value', models.TextField()),
                ('member', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='standard_field_values',
                    to='members.membermodel',
                )),
            ],
            options={
                'db_table': 'member_standard_field_value',
            },
        ),
        migrations.AlterUniqueTogether(
            name='memberstandardfieldvaluemodel',
            unique_together={('member', 'field_name')},
        ),
    ]
