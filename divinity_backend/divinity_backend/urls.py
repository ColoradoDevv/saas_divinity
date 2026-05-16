from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/organizations/', include('apps.organizations.urls')),
    path('api/clients/', include('apps.clients.urls')),
]
