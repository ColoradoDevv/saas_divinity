from dataclasses import dataclass


ROLE_ADMIN = 'admin'
ROLE_MANAGER = 'manager'
ROLE_STAFF = 'staff'
ROLE_CHOICES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF]

PLAN_FREE = 'free'
PLAN_PRO = 'pro'
PLAN_ENTERPRISE = 'enterprise'

MODULE_CLIENTS = 'clients'
MODULE_PAYMENTS = 'payments'
MODULE_ATTENDANCE = 'attendance'
MODULE_REPORTS = 'reports'
MODULE_WORKERS = 'workers'
ALL_MODULES = [MODULE_CLIENTS, MODULE_PAYMENTS, MODULE_ATTENDANCE, MODULE_REPORTS, MODULE_WORKERS]


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
