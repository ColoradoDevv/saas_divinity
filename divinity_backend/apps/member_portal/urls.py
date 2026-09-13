from django.urls import path

from .views import (
    MemberPortalAcceptInviteView,
    MemberPortalAttendanceView,
    MemberPortalBillingView,
    MemberPortalCancelEnrollmentView,
    MemberPortalEnrollView,
    MemberPortalLoginView,
    MemberPortalMeView,
    MemberPortalSessionListView,
)

urlpatterns = [
    path('login/', MemberPortalLoginView.as_view(), name='member-portal-login'),
    path('accept-invite/', MemberPortalAcceptInviteView.as_view(), name='member-portal-accept-invite'),
    path('me/', MemberPortalMeView.as_view(), name='member-portal-me'),
    path('billing/', MemberPortalBillingView.as_view(), name='member-portal-billing'),
    path('attendance/', MemberPortalAttendanceView.as_view(), name='member-portal-attendance'),
    path('classes/sessions/', MemberPortalSessionListView.as_view(), name='member-portal-session-list'),
    path('classes/sessions/<int:pk>/enroll/', MemberPortalEnrollView.as_view(), name='member-portal-session-enroll'),
    path(
        'classes/enrollments/<int:pk>/cancel/',
        MemberPortalCancelEnrollmentView.as_view(),
        name='member-portal-enrollment-cancel',
    ),
]
