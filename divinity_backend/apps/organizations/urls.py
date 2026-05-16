from django.urls import path

from .views import MembershipListView, OrganizationDetailView

urlpatterns = [
    path('me', OrganizationDetailView.as_view(), name='org-detail'),
    path('me/members', MembershipListView.as_view(), name='org-members'),
]
