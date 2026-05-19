from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/organizations/', include('apps.organizations.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/workers/', include('apps.workers.urls')),
    path('api/audit/', include('apps.audit.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
