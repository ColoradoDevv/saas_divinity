from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import ForgotPasswordView, LoginView, MeView


urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('me', MeView.as_view(), name='auth-me'),
    path('refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('forgot-password', ForgotPasswordView.as_view(), name='auth-forgot-password'),
]
