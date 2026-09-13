from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/organizations/', include('apps.organizations.urls')),
    path('api/workers/', include('apps.workers.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/members/', include('apps.members.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/classes/', include('apps.classes.urls')),
    path('api/member-portal/', include('apps.member_portal.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
