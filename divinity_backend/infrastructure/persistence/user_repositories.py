from typing import Optional

from django.contrib.auth import get_user_model

from domain.authentication.entities import AuthenticatedUser
from interfaces.repositories import UserRepositoryInterface


UserModel = get_user_model()


class DjangoORMUserRepository(UserRepositoryInterface):
    def _to_entity(self, user) -> AuthenticatedUser:
        from apps.organizations.models import MembershipModel

        membership = (
            MembershipModel.objects
            .filter(user_id=user.pk, is_active=True)
            .select_related('organization')
            .first()
        )

        return AuthenticatedUser(
            id=user.id,
            username=user.get_username(),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_staff=user.is_staff,
            is_superuser=user.is_superuser,
            organization_id=membership.organization_id if membership else None,
        )

    def authenticate(self, email: str, password: str) -> Optional[AuthenticatedUser]:
        user = None
        try:
            user = UserModel.objects.get(email__iexact=email)
        except UserModel.DoesNotExist:
            try:
                user = UserModel.objects.get(username__iexact=email)
            except UserModel.DoesNotExist:
                return None

        if not user.is_active or not user.check_password(password):
            return None

        return self._to_entity(user)

    def get_by_id(self, user_id: int) -> Optional[AuthenticatedUser]:
        try:
            user = UserModel.objects.get(pk=user_id, is_active=True)
        except UserModel.DoesNotExist:
            return None
        return self._to_entity(user)
