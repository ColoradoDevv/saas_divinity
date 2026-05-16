from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import ForgotPasswordView, LoginView, MeView, SwitchOrgView


urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('me', MeView.as_view(), name='auth-me'),
    path('refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('forgot-password', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('switch-org', SwitchOrgView.as_view(), name='auth-switch-org'),
]
