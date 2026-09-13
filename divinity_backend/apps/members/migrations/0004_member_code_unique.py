from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0003_add_photo_url_member_code'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='membermodel',
            constraint=models.UniqueConstraint(
                condition=~Q(member_code=''),
                fields=('organization', 'member_code'),
                name='unique_member_code_per_org',
            ),
        ),
    ]
