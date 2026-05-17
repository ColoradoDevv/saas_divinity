import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0003_organizationmodel_last_payment_date_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add 'trial' choice to payment_status (metadata-only, no schema change)
        migrations.AlterField(
            model_name="organizationmodel",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("trial", "Prueba"),
                    ("paid", "Pagado"),
                    ("unpaid", "Pendiente"),
                    ("overdue", "Vencido"),
                ],
                default="unpaid",
                max_length=20,
            ),
        ),
        # Create InvitationModel
        migrations.CreateModel(
            name="InvitationModel",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "token",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ("email", models.EmailField(max_length=254)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("admin", "Admin"),
                            ("manager", "Manager"),
                            ("staff", "Staff"),
                        ],
                        default="staff",
                        max_length=20,
                    ),
                ),
                ("expires_at", models.DateTimeField()),
                ("used", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="invitations",
                        to="organizations.organizationmodel",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "invitation",
                "ordering": ["-created_at"],
            },
        ),
    ]
