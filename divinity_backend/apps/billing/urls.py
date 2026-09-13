from django.urls import path

from .views import (
    DailyStatsExportView,
    DailyStatsReportView,
    DashboardSummaryView,
    ExpiringSubscriptionsView,
    FreezeSubscriptionView,
    MemberBillingView,
    MembershipStatusReportView,
    PaymentListView,
    PlanViewSet,
    RenewMembershipView,
    ResumeSubscriptionView,
    RevenueByMonthReportView,
)

# /api/billing/plans/
plan_list = PlanViewSet.as_view({'get': 'list', 'post': 'create'})
plan_detail = PlanViewSet.as_view({'put': 'update', 'patch': 'update', 'delete': 'destroy'})

urlpatterns = [
    path('plans/', plan_list, name='billing-plan-list'),
    path('plans/<int:pk>/', plan_detail, name='billing-plan-detail'),
    path('members/<int:member_id>/', MemberBillingView.as_view(), name='billing-member-detail'),
    path('renew/', RenewMembershipView.as_view(), name='billing-renew'),
    path('subscriptions/<int:pk>/freeze/', FreezeSubscriptionView.as_view(), name='billing-sub-freeze'),
    path('subscriptions/<int:pk>/resume/', ResumeSubscriptionView.as_view(), name='billing-sub-resume'),
    path('expiring/', ExpiringSubscriptionsView.as_view(), name='billing-expiring'),
    path('payments/', PaymentListView.as_view(), name='billing-payment-list'),
    path('summary/', DashboardSummaryView.as_view(), name='billing-summary'),
    path('reports/revenue-by-month/', RevenueByMonthReportView.as_view(), name='billing-report-revenue'),
    path('reports/membership-status/', MembershipStatusReportView.as_view(), name='billing-report-status'),
    path('reports/daily/', DailyStatsReportView.as_view(), name='billing-report-daily'),
    path('reports/export/', DailyStatsExportView.as_view(), name='billing-report-export'),
]
