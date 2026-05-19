"""
Migración segura para hacer ClientModel.organization requerido (null=False).

Paso 1 (RunPython): si existen clientes huérfanos (organization=NULL), se les
asigna la primera organización disponible o se crea una organización de
saneamiento temporal para no perder datos.

Paso 2 (AlterField): quita null=True del campo organization para que la BD
rechace futuros NULL a nivel de restricción.
"""
from django.db import migrations, models
import django.db.models.deletion


def assign_orphan_clients(apps, schema_editor):
    ClientModel = apps.get_model('clients', 'ClientModel')
    OrganizationModel = apps.get_model('organizations', 'OrganizationModel')

    orphans = ClientModel.objects.filter(organization__isnull=True)
    if not orphans.exists():
        return

    fallback_org = OrganizationModel.objects.first()
    if fallback_org is None:
        fallback_org = OrganizationModel.objects.create(
            name='Organización Default',
            slug='default-org',
            plan='pro',
            enabled_modules=['clients'],
            is_active=True,
            payment_status='paid',
        )

    orphans.update(organization=fallback_org)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
        ('organizations', '0003_organizationmodel_last_payment_date_and_more'),
    ]

    operations = [
        migrations.RunPython(assign_orphan_clients, noop),
        migrations.AlterField(
            model_name='clientmodel',
            name='organization',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='clients',
                to='organizations.organizationmodel',
            ),
        ),
    ]
