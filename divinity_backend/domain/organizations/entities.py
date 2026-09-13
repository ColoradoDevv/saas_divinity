from dataclasses import dataclass

from domain.organizations.currency import DEFAULT_CURRENCY
from domain.organizations.verticals import BUSINESS_TYPE_GENERIC

ROLE_ADMIN = 'admin'
ROLE_MANAGER = 'manager'
ROLE_STAFF = 'staff'
ROLE_CHOICES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF]

PLAN_FREE = 'free'
PLAN_PRO = 'pro'
PLAN_ENTERPRISE = 'enterprise'


@dataclass(frozen=True)
class Organization:
    id: int
    name: str
    slug: str
    plan: str
    enabled_modules: tuple
    is_active: bool
    onboarding_completed: bool
    primary_color: str
    logo_url: str
    business_type: str = BUSINESS_TYPE_GENERIC
    currency: str = DEFAULT_CURRENCY

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'plan': self.plan,
            'enabled_modules': list(self.enabled_modules),
            'is_active': self.is_active,
            'onboarding_completed': self.onboarding_completed,
            'primary_color': self.primary_color,
            'logo_url': self.logo_url,
            'business_type': self.business_type,
            'currency': self.currency,
        }


@dataclass(frozen=True)
class Membership:
    user_id: int
    organization: Organization
    role: str

    def to_primitives(self) -> dict:
        return {
            'role': self.role,
            'organization': self.organization.to_primitives(),
        }
