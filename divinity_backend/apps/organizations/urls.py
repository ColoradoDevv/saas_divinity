from django.urls import path

from .views import (
    MembershipListView,
    OnboardingCompleteView,
    OrganizationDetailView,
    SuperOrganizationListCreateView,
)

urlpatterns = [
    # Super admin (solo superusuario)
    path('super/', SuperOrganizationListCreateView.as_view(), name='super-org-list-create'),

    # Organización propia
    path('me/', OrganizationDetailView.as_view(), name='org-detail'),
    path('me/members/', MembershipListView.as_view(), name='org-members'),
    path('me/onboarding/', OnboardingCompleteView.as_view(), name='org-onboarding'),
]
