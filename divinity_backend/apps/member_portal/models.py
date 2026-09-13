import uuid

from django.db import models


class MemberPortalInvitationModel(models.Model):
    """Invitación para activar el acceso al portal de un miembro puntual —
    misma forma que InvitationModel (organizations), pero atada a un miembro
    en vez de a un email+rol de staff."""

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    member = models.ForeignKey(
        'members.MemberModel',
        on_delete=models.CASCADE,
        related_name='portal_invitations',
    )
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'member_portal_invitation'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'Invitación portal — {self.member} ({"usada" if self.used else "pendiente"})'
