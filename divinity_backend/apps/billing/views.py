from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.billing.duration import add_duration

from application.billing.dtos import (
    CreatePlanDTO,
    FreezeSubscriptionDTO,
    RenewMembershipDTO,
    ResumeSubscriptionDTO,
    UpdatePlanDTO,
)
from application.billing.services import (
    CreatePlanService,
    FreezeSubscriptionService,
    RenewMembershipService,
    ResumeSubscriptionService,
    UpdatePlanService,
)
from domain.billing.exceptions import (
    PlanNotFoundError,
    PlanValidationError,
    SubscriptionNotFoundError,
    SubscriptionValidationError,
)
from apps.notifications.services import notify
from infrastructure.middleware.tenant import module_permission
from infrastructure.notifications.email_service import send_payment_confirmation_email
from infrastructure.permissions.roles import IsAdminOnly, staff_module_action_permission
from infrastructure.persistence.billing_repositories import DjangoORMBillingRepository

from .daily_stats import get_daily_stats
from .serializers import (
    PaymentReadSerializer,
    PlanReadSerializer,
    PlanUpdateSerializer,
    PlanWriteSerializer,
    RenewMembershipSerializer,
    SubscriptionReadSerializer,
)

BillingModuleEnabled = module_permission('payments')

_AUTH = permissions.IsAuthenticated
_MOD = BillingModuleEnabled
_CAN_VIEW = staff_module_action_permission('payments', 'view')
_CAN_CREATE = staff_module_action_permission('payments', 'create')
_CAN_EDIT = staff_module_action_permission('payments', 'edit')
_ADMIN_PERMS = [_AUTH, _MOD, IsAdminOnly]


def _org_id(request) -> int:
    org = getattr(request, 'organization', None)
    if org is None:
        raise PermissionDenied(
            detail='Tu sesión no tiene contexto de organización. Inicia sesión nuevamente.'
        )
    return org.id


# ------------------------------------------------------------------ #
# PlanViewSet — catálogo, admin-only (como FieldConfigViewSet en members)
# ------------------------------------------------------------------ #

class PlanViewSet(viewsets.ViewSet):
    permission_classes = _ADMIN_PERMS

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._repo = DjangoORMBillingRepository()

    def list(self, request):
        org_id = _org_id(request)
        active_only = request.query_params.get('active_only') == 'true'
        plans = self._repo.list_plans(org_id, active_only=active_only)
        return Response([PlanReadSerializer(p.to_primitives()).data for p in plans])

    def create(self, request):
        org_id = _org_id(request)
        serializer = PlanWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = CreatePlanDTO(
            organization_id=org_id,
            name=d['name'],
            description=d.get('description', ''),
            price=d['price'],
            duration_value=d.get('duration_value', 1),
            duration_unit=d.get('duration_unit', 'month'),
        )
        try:
            plan = CreatePlanService(self._repo).execute(dto)
        except PlanValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(PlanReadSerializer(plan.to_primitives()).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        org_id = _org_id(request)
        serializer = PlanUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = UpdatePlanDTO(
            plan_id=int(pk),
            organization_id=org_id,
            name=d.get('name'),
            description=d.get('description'),
            price=d.get('price'),
            duration_value=d.get('duration_value'),
            duration_unit=d.get('duration_unit'),
            is_active=d.get('is_active'),
        )
        try:
            plan = UpdatePlanService(self._repo).execute(dto)
        except PlanNotFoundError:
            raise NotFound(detail='Plan no encontrado.')
        except PlanValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(PlanReadSerializer(plan.to_primitives()).data)

    def destroy(self, request, pk=None):
        """Un plan nunca se borra si tiene historial (FK PROTECT) — se desactiva."""
        org_id = _org_id(request)
        dto = UpdatePlanDTO(plan_id=int(pk), organization_id=org_id, is_active=False)
        try:
            UpdatePlanService(self._repo).execute(dto)
        except PlanNotFoundError:
            raise NotFound(detail='Plan no encontrado.')
        return Response(status=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------ #
# Facturación por miembro                                              #
# ------------------------------------------------------------------ #

class MemberBillingView(APIView):
    """GET /api/billing/members/{member_id}/ — suscripción actual + historial + pagos."""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request, member_id):
        org_id = _org_id(request)
        repo = DjangoORMBillingRepository()
        current = repo.get_current_subscription(int(member_id), org_id)
        subscriptions = repo.list_subscriptions_for_member(int(member_id), org_id)
        payments = repo.list_payments_for_member(int(member_id), org_id)
        return Response({
            'current_subscription': (
                SubscriptionReadSerializer(current.to_primitives()).data if current else None
            ),
            'subscriptions': [SubscriptionReadSerializer(s.to_primitives()).data for s in subscriptions],
            'payments': [PaymentReadSerializer(p.to_primitives()).data for p in payments],
        })


class RenewMembershipView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_CREATE]

    def post(self, request):
        org_id = _org_id(request)
        serializer = RenewMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        dto = RenewMembershipDTO(
            organization_id=org_id,
            member_id=d['member_id'],
            plan_id=d['plan_id'],
            method=d.get('method', 'cash'),
            amount=d.get('amount'),
            start_date=d.get('start_date'),
            paid_at=d.get('paid_at'),
            notes=d.get('notes', ''),
            registered_by_id=request.user.id if request.user.is_authenticated else None,
        )
        try:
            with transaction.atomic():
                subscription, payment = RenewMembershipService(DjangoORMBillingRepository()).execute(dto)
        except PlanNotFoundError:
            raise NotFound(detail='Plan no encontrado o inactivo.')
        except PlanValidationError as exc:
            raise ValidationError(detail=str(exc))
        except IntegrityError:
            # Dos renovaciones concurrentes para el mismo miembro (doble clic, dos
            # cajeros a la vez): la segunda choca con la restricción de "una sola
            # suscripción activa por miembro" — devolvemos un error claro en vez
            # de un 500.
            raise ValidationError(
                detail='Ya se registró un cobro para este miembro justo ahora. Actualiza la página e intenta de nuevo.'
            )

        notify(
            org_id, 'payment_received',
            f'Pago registrado: {subscription.member_name} — ${payment.amount}',
            link=f'/members/{subscription.member_id}',
        )
        from apps.members.models import MemberModel
        try:
            member_model = MemberModel.objects.get(pk=subscription.member_id, organization_id=org_id)
            send_payment_confirmation_email(
                to_email=member_model.email, first_name=member_model.first_name,
                organization_name=request.organization.name,
                amount=payment.amount, plan_name=subscription.plan_name, end_date=subscription.end_date,
            )
        except MemberModel.DoesNotExist:
            pass

        return Response(
            {
                'subscription': SubscriptionReadSerializer(subscription.to_primitives()).data,
                'payment': PaymentReadSerializer(payment.to_primitives()).data,
            },
            status=status.HTTP_201_CREATED,
        )


class FreezeSubscriptionView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_EDIT]

    def post(self, request, pk):
        org_id = _org_id(request)
        dto = FreezeSubscriptionDTO(subscription_id=int(pk), organization_id=org_id)
        try:
            subscription = FreezeSubscriptionService(DjangoORMBillingRepository()).execute(dto)
        except SubscriptionNotFoundError:
            raise NotFound(detail='Suscripción no encontrada.')
        except SubscriptionValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(SubscriptionReadSerializer(subscription.to_primitives()).data)


class ResumeSubscriptionView(APIView):
    permission_classes = [_AUTH, _MOD, _CAN_EDIT]

    def post(self, request, pk):
        org_id = _org_id(request)
        dto = ResumeSubscriptionDTO(subscription_id=int(pk), organization_id=org_id)
        try:
            subscription = ResumeSubscriptionService(DjangoORMBillingRepository()).execute(dto)
        except SubscriptionNotFoundError:
            raise NotFound(detail='Suscripción no encontrada.')
        except SubscriptionValidationError as exc:
            raise ValidationError(detail=str(exc))
        return Response(SubscriptionReadSerializer(subscription.to_primitives()).data)


class ExpiringSubscriptionsView(APIView):
    """GET /api/billing/expiring/?days=7 — alimenta el widget de vencimientos del dashboard."""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        try:
            within_days = int(request.query_params.get('days', 7))
        except ValueError:
            within_days = 7

        repo = DjangoORMBillingRepository()
        subscriptions = repo.list_expiring(org_id, within_days=within_days)
        return Response([SubscriptionReadSerializer(s.to_primitives()).data for s in subscriptions])


class PaymentListView(APIView):
    """GET /api/billing/payments/?date_from=&date_to=&member_id=&method=

    Historial de pagos de toda la organización (no solo de un socio) — para
    el módulo de Pagos, con quién registró cada uno.
    """
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)

        def _parse_date(value):
            if not value:
                return None
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None

        date_from = _parse_date(request.query_params.get('date_from'))
        date_to = _parse_date(request.query_params.get('date_to'))
        member_id = request.query_params.get('member_id')
        method = request.query_params.get('method') or None

        repo = DjangoORMBillingRepository()
        payments = repo.list_payments(
            org_id,
            date_from=date_from,
            date_to=date_to,
            member_id=int(member_id) if member_id else None,
            method=method,
        )
        return Response([PaymentReadSerializer(p.to_primitives()).data for p in payments])


class DashboardSummaryView(APIView):
    """
    GET /api/billing/summary/ — resumen del día para el dashboard de mostrador.
    Cruza billing + attendance + members en un solo round-trip, mismo patrón
    ya usado en SuperOrganizationListCreateView (que cruza workers/memberships).
    """
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        from apps.attendance.models import CheckInModel
        from apps.members.models import MemberModel
        from .models import DuesPaymentModel

        org_id = _org_id(request)
        today = timezone.localdate()
        week_ago = today - timedelta(days=7)

        revenue_today = DuesPaymentModel.objects.filter(
            organization_id=org_id, paid_at=today,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        checkins_today = CheckInModel.objects.filter(
            organization_id=org_id, checked_in_at__date=today,
        ).count()

        new_members_7d = MemberModel.objects.filter(
            organization_id=org_id, created_at__date__gte=week_ago,
        ).count()

        active_members = MemberModel.objects.filter(
            organization_id=org_id, status='active',
        ).count()

        return Response({
            'revenue_today': f'{revenue_today:.2f}',
            'checkins_today': checkins_today,
            'new_members_7d': new_members_7d,
            'active_members': active_members,
        })


def get_revenue_by_month(org_id: int, months: int = 6) -> list[dict]:
    from .models import DuesPaymentModel

    today = timezone.localdate()
    start_month = add_duration(today.replace(day=1), -(months - 1), 'month')

    rows = (
        DuesPaymentModel.objects.filter(organization_id=org_id, paid_at__gte=start_month)
        .annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(total=Sum('amount'))
    )
    by_month = {row['month'].strftime('%Y-%m'): row['total'] for row in rows}

    result = []
    cursor = start_month
    for _ in range(months):
        key = cursor.strftime('%Y-%m')
        total = by_month.get(key, Decimal('0'))
        result.append({'month': key, 'total': f'{total:.2f}'})
        cursor = add_duration(cursor, 1, 'month')
    return result


def get_membership_status_counts(org_id: int) -> dict:
    from .models import MemberSubscriptionModel

    today = timezone.localdate()
    base = MemberSubscriptionModel.objects.filter(organization_id=org_id)
    return {
        'active': base.filter(status='active', end_date__gte=today).count(),
        'expired': base.filter(status='active', end_date__lt=today).count(),
        'frozen': base.filter(status='frozen').count(),
        'cancelled': base.filter(status='cancelled').count(),
    }


class RevenueByMonthReportView(APIView):
    """GET /api/billing/reports/revenue-by-month/?months=6"""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        try:
            months = int(request.query_params.get('months', 6))
        except ValueError:
            months = 6
        months = max(1, min(months, 24))
        return Response(get_revenue_by_month(org_id, months))


class MembershipStatusReportView(APIView):
    """GET /api/billing/reports/membership-status/"""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        return Response(get_membership_status_counts(org_id))


def _parse_date_range(request) -> tuple[date, date]:
    """Default: últimos 30 días. Rango máximo: 366 días (evita backfills gigantes)."""
    today = timezone.localdate()

    def _parse(value, default):
        if not value:
            return default
        try:
            return date.fromisoformat(value)
        except ValueError:
            return default

    date_from = _parse(request.query_params.get('date_from'), today - timedelta(days=29))
    date_to = _parse(request.query_params.get('date_to'), today)
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    if (date_to - date_from).days > 366:
        date_from = date_to - timedelta(days=366)
    return date_from, date_to


class DailyStatsReportView(APIView):
    """GET /api/billing/reports/daily/?date_from=&date_to= (default: últimos 30 días)"""
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        org_id = _org_id(request)
        date_from, date_to = _parse_date_range(request)

        stats = get_daily_stats(org_id, date_from, date_to)
        return Response([
            {
                'date': s['date'].isoformat(),
                'revenue': f"{s['revenue']:.2f}",
                'checkins': s['checkins'],
                'new_members': s['new_members'],
            }
            for s in stats
        ])


class DailyStatsExportView(APIView):
    """GET /api/billing/reports/export/?export_format=xlsx|pdf&date_from=&date_to=

    Junta el histórico diario y los tres reportes que ya existen (ingresos
    por mes, estado de membresías, asistencia por día de semana) en un solo
    archivo descargable, reutilizando la misma agregación que ya usan sus
    vistas respectivas — sin duplicar queries.

    El parámetro se llama "export_format" y no "format" a propósito: DRF
    reserva "format" para su propia negociación de contenido (?format=json)
    y devuelve un 404 si no reconoce el valor — con "format=xlsx" nunca
    llegaría a ejecutarse esta vista.
    """
    permission_classes = [_AUTH, _MOD, _CAN_VIEW]

    def get(self, request):
        from apps.attendance.views import get_weekday_breakdown
        from .report_export import build_pdf_report, build_xlsx_report

        org = request.organization
        export_format = request.query_params.get('export_format', 'xlsx')
        if export_format not in ('xlsx', 'pdf'):
            raise ValidationError({'export_format': 'Formato no soportado. Usa "xlsx" o "pdf".'})

        date_from, date_to = _parse_date_range(request)

        report_kwargs = dict(
            org_name=org.name,
            currency=org.currency,
            date_from=date_from,
            date_to=date_to,
            daily_stats=get_daily_stats(org.id, date_from, date_to),
            revenue_by_month=get_revenue_by_month(org.id, 6),
            membership_status=get_membership_status_counts(org.id),
            weekday_breakdown=get_weekday_breakdown(org.id, 30),
        )

        filename_base = f'reporte-{org.slug}-{date_from.isoformat()}_a_{date_to.isoformat()}'
        if export_format == 'xlsx':
            content = build_xlsx_report(**report_kwargs)
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = f'{filename_base}.xlsx'
        else:
            content = build_pdf_report(**report_kwargs)
            content_type = 'application/pdf'
            filename = f'{filename_base}.pdf'

        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
