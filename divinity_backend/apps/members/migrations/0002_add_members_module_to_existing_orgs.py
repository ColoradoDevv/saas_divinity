from django.db import migrations


def add_members_module(apps, schema_editor):
    OrganizationModel = apps.get_model('organizations', 'OrganizationModel')
    for org in OrganizationModel.objects.all():
        modules = list(org.enabled_modules or [])
        if 'members' not in modules:
            modules.append('members')
            org.enabled_modules = modules
            org.save(update_fields=['enabled_modules'])


def remove_members_module(apps, schema_editor):
    OrganizationModel = apps.get_model('organizations', 'OrganizationModel')
    for org in OrganizationModel.objects.all():
        modules = list(org.enabled_modules or [])
        if 'members' in modules:
            modules.remove('members')
            org.enabled_modules = modules
            org.save(update_fields=['enabled_modules'])


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0001_initial'),
        ('organizations', '0003_organizationmodel_last_payment_date_and_more'),
    ]

    operations = [
        migrations.RunPython(add_members_module, reverse_code=remove_members_module),
    ]
