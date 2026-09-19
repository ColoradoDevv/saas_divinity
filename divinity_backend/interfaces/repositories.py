from abc import ABC, abstractmethod
from datetime import date, time
from typing import Optional, Sequence

from domain.attendance.entities import CheckIn
from domain.authentication.entities import AuthenticatedUser
from domain.billing.entities import DuesPayment, MembershipPlan, MemberSubscription
from domain.classes.entities import ClassEnrollment, ClassSchedule, ClassSession, ClassType
from domain.members.entities import CustomField, FieldConfig, Member
from domain.organizations.entities import Membership, Organization


class OrganizationRepositoryInterface(ABC):
    @abstractmethod
    def get_primary_membership(self, user_id: int) -> Optional[Membership]:
        raise NotImplementedError

    @abstractmethod
    def get_membership_for_org(self, user_id: int, organization_id: int) -> Optional[Membership]:
        raise NotImplementedError

    @abstractmethod
    def get_by_slug(self, slug: str) -> Optional[Organization]:
        raise NotImplementedError


class UserRepositoryInterface(ABC):
    @abstractmethod
    def authenticate(self, email: str, password: str) -> Optional[AuthenticatedUser]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[AuthenticatedUser]:
        raise NotImplementedError


class MemberRepositoryInterface(ABC):
    @abstractmethod
    def save(self, member: Member) -> Member:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, member_id: int, organization_id: int) -> Optional[Member]:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str, organization_id: int) -> Optional[Member]:
        raise NotImplementedError

    @abstractmethod
    def get_by_code(self, member_code: str, organization_id: int) -> Optional[Member]:
        raise NotImplementedError

    @abstractmethod
    def list_active(
        self,
        organization_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str = '',
        status: str = '',
    ) -> tuple[Sequence[Member], int]:
        """Devuelve (miembros_página, total_count)."""
        raise NotImplementedError

    @abstractmethod
    def deactivate(self, member_id: int, organization_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_field_config(self, organization_id: int) -> Sequence[FieldConfig]:
        raise NotImplementedError

    @abstractmethod
    def save_field_config(self, config: FieldConfig) -> FieldConfig:
        raise NotImplementedError

    @abstractmethod
    def get_custom_fields(self, organization_id: int) -> Sequence[CustomField]:
        raise NotImplementedError

    @abstractmethod
    def save_custom_field(self, custom_field: CustomField) -> CustomField:
        raise NotImplementedError

    @abstractmethod
    def delete_custom_field(self, field_id: int, organization_id: int) -> bool:
        raise NotImplementedError


class BillingRepositoryInterface(ABC):
    @abstractmethod
    def save_plan(self, plan: MembershipPlan) -> MembershipPlan:
        raise NotImplementedError

    @abstractmethod
    def get_plan_by_id(self, plan_id: int, organization_id: int) -> Optional[MembershipPlan]:
        raise NotImplementedError

    @abstractmethod
    def list_plans(self, organization_id: int, *, active_only: bool = False) -> Sequence[MembershipPlan]:
        raise NotImplementedError

    @abstractmethod
    def get_current_subscription(self, member_id: int, organization_id: int) -> Optional[MemberSubscription]:
        """Última suscripción activa o congelada del miembro, si existe."""
        raise NotImplementedError

    @abstractmethod
    def get_subscription_by_id(self, subscription_id: int, organization_id: int) -> Optional[MemberSubscription]:
        raise NotImplementedError

    @abstractmethod
    def save_subscription(self, subscription: MemberSubscription) -> MemberSubscription:
        raise NotImplementedError

    @abstractmethod
    def cancel_subscription(self, subscription_id: int, organization_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_subscriptions_for_member(
        self, member_id: int, organization_id: int
    ) -> Sequence[MemberSubscription]:
        raise NotImplementedError

    @abstractmethod
    def save_payment(self, payment: DuesPayment) -> DuesPayment:
        raise NotImplementedError

    @abstractmethod
    def list_payments_for_member(self, member_id: int, organization_id: int) -> Sequence[DuesPayment]:
        raise NotImplementedError

    @abstractmethod
    def list_payments(
        self,
        organization_id: int,
        *,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        member_id: Optional[int] = None,
        method: Optional[str] = None,
    ) -> Sequence[DuesPayment]:
        """Todos los pagos de la organización (no solo de un socio), para el
        historial de pagos del módulo de Pagos."""
        raise NotImplementedError

    @abstractmethod
    def list_expiring(
        self, organization_id: int, *, within_days: int
    ) -> Sequence[MemberSubscription]:
        """Suscripciones activas cuyo end_date cae dentro de N días (incluye ya vencidas)."""
        raise NotImplementedError


class AttendanceRepositoryInterface(ABC):
    @abstractmethod
    def save(self, checkin: CheckIn) -> CheckIn:
        raise NotImplementedError

    @abstractmethod
    def list_today(self, organization_id: int) -> Sequence[CheckIn]:
        raise NotImplementedError

    @abstractmethod
    def list_for_member(self, member_id: int, organization_id: int) -> Sequence[CheckIn]:
        raise NotImplementedError


class ClassRepositoryInterface(ABC):
    # ------------------------------------------------------------------ #
    # Class types                                                          #
    # ------------------------------------------------------------------ #

    @abstractmethod
    def save_class_type(self, class_type: ClassType) -> ClassType:
        raise NotImplementedError

    @abstractmethod
    def get_class_type_by_id(self, class_type_id: int, organization_id: int) -> Optional[ClassType]:
        raise NotImplementedError

    @abstractmethod
    def list_class_types(self, organization_id: int, *, active_only: bool = False) -> Sequence[ClassType]:
        raise NotImplementedError

    @abstractmethod
    def deactivate_class_type(self, class_type_id: int, organization_id: int) -> None:
        raise NotImplementedError

    # ------------------------------------------------------------------ #
    # Schedules                                                            #
    # ------------------------------------------------------------------ #

    @abstractmethod
    def save_schedule(self, schedule: ClassSchedule) -> ClassSchedule:
        raise NotImplementedError

    @abstractmethod
    def get_schedule_by_id(self, schedule_id: int, organization_id: int) -> Optional[ClassSchedule]:
        raise NotImplementedError

    @abstractmethod
    def list_schedules(self, organization_id: int, *, active_only: bool = False) -> Sequence[ClassSchedule]:
        raise NotImplementedError

    @abstractmethod
    def deactivate_schedule(self, schedule_id: int, organization_id: int) -> None:
        raise NotImplementedError

    # ------------------------------------------------------------------ #
    # Sessions                                                             #
    # ------------------------------------------------------------------ #

    @abstractmethod
    def sync_sessions(self, organization_id: int, date_from: date, date_to: date) -> None:
        """Genera (get_or_create) las sesiones de los horarios activos que
        caigan en el rango, acotado a un horizonte máximo interno."""
        raise NotImplementedError

    @abstractmethod
    def get_session_by_id(
        self, session_id: int, organization_id: int, *, lock: bool = False
    ) -> Optional[ClassSession]:
        """`lock=True` toma un lock de fila (SELECT ... FOR UPDATE) — usarlo dentro de una
        transacción cuando la lectura precede a una decisión de capacidad (inscribir), para
        que dos inscripciones concurrentes no lean el mismo cupo disponible antes de que
        cualquiera de las dos confirme."""
        raise NotImplementedError

    @abstractmethod
    def list_sessions(
        self, organization_id: int, *, date_from: date, date_to: date
    ) -> Sequence[ClassSession]:
        raise NotImplementedError

    @abstractmethod
    def cancel_session(self, session_id: int, organization_id: int) -> ClassSession:
        raise NotImplementedError

    # ------------------------------------------------------------------ #
    # Enrollments                                                          #
    # ------------------------------------------------------------------ #

    @abstractmethod
    def save_enrollment(self, enrollment: ClassEnrollment) -> ClassEnrollment:
        raise NotImplementedError

    @abstractmethod
    def get_enrollment_by_id(self, enrollment_id: int, organization_id: int) -> Optional[ClassEnrollment]:
        raise NotImplementedError

    @abstractmethod
    def list_enrollments_for_session(self, session_id: int) -> Sequence[ClassEnrollment]:
        raise NotImplementedError

    @abstractmethod
    def has_active_enrollment(self, session_id: int, member_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def count_active_enrollments(self, session_id: int) -> int:
        raise NotImplementedError
