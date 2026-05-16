from typing import Optional

from apps.organizations.models import MembershipModel, OrganizationModel
from domain.organizations.entities import Membership, Organization
from interfaces.repositories import OrganizationRepositoryInterface


class DjangoORMOrganizationRepository(OrganizationRepositoryInterface):
    def _to_org_entity(self, model: OrganizationModel) -> Organization:
        return Organization(
            id=model.id,
            name=model.name,
            slug=model.slug,
            plan=model.plan,
            enabled_modules=tuple(model.enabled_modules),
            is_active=model.is_active,
        )

    def _to_membership_entity(self, model: MembershipModel) -> Membership:
        return Membership(
            user_id=model.user_id,
            organization=self._to_org_entity(model.organization),
            role=model.role,
        )

    def get_primary_membership(self, user_id: int) -> Optional[Membership]:
        try:
            model = (
                MembershipModel.objects
                .select_related('organization')
                .filter(user_id=user_id, is_active=True, organization__is_active=True)
                .order_by('joined_at')
                .first()
            )
            return self._to_membership_entity(model) if model else None
        except Exception:
            return None

    def get_by_slug(self, slug: str) -> Optional[Organization]:
        try:
            model = OrganizationModel.objects.get(slug=slug, is_active=True)
            return self._to_org_entity(model)
        except OrganizationModel.DoesNotExist:
            return None
