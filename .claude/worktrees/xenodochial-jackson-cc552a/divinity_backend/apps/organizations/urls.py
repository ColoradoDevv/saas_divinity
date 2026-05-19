from django.urls import path

from .views import (
    AcceptInviteView,
    InviteView,
    MembershipListView,
    OnboardingCompleteView,
    OrganizationDetailView,
    OrganizationLogoUploadView,
    RegisterOrganizationView,
    SuperOrganizationListCreateView,
    SuperPaymentUpdateView,
)

urlpatterns = [
    # Registro público
    path('register/', RegisterOrganizationView.as_view(), name='org-register'),

    # Invitaciones
    path('invite/', InviteView.as_view(), name='org-invite'),
    path('invite/accept/', AcceptInviteView.as_view(), name='org-invite-accept'),

    # Super admin (solo superusuario)
    path('super/', SuperOrganizationListCreateView.as_view(), name='super-org-list-create'),
    path('super/<int:pk>/payment/', SuperPaymentUpdateView.as_view(), name='super-org-payment'),

    # Organización propia
    path('me/', OrganizationDetailView.as_view(), name='org-detail'),
    path('me/members/', MembershipListView.as_view(), name='org-members'),
    path('me/onboarding/', OnboardingCompleteView.as_view(), name='org-onboarding'),
    path('me/logo/', OrganizationLogoUploadView.as_view(), name='org-logo-upload'),
]
