from django.urls import path

from .views import (
    AttendanceByWeekdayReportView,
    BiometricDeviceViewSet,
    CheckInView,
    DeviceEnrollmentViewSet,
    DeviceEventIngestView,
    MemberAttendanceHistoryView,
    MemberEnrollmentListView,
    TodayAttendanceView,
)

# /api/attendance/devices/
device_list = BiometricDeviceViewSet.as_view({'get': 'list', 'post': 'create'})
device_detail = BiometricDeviceViewSet.as_view({'patch': 'update', 'put': 'update'})
device_rotate_key = BiometricDeviceViewSet.as_view({'post': 'rotate_key'})

# /api/attendance/devices/<device_pk>/enrollments/
device_enrollment_list = DeviceEnrollmentViewSet.as_view({'get': 'list', 'post': 'create'})
device_enrollment_detail = DeviceEnrollmentViewSet.as_view({'delete': 'destroy'})

urlpatterns = [
    path('checkin/', CheckInView.as_view(), name='attendance-checkin'),
    path('today/', TodayAttendanceView.as_view(), name='attendance-today'),
    path('members/<int:member_id>/history/', MemberAttendanceHistoryView.as_view(), name='attendance-member-history'),
    path('members/<int:member_id>/enrollments/', MemberEnrollmentListView.as_view(), name='attendance-member-enrollments'),
    path('reports/by-weekday/', AttendanceByWeekdayReportView.as_view(), name='attendance-report-weekday'),

    path('devices/events/', DeviceEventIngestView.as_view(), name='attendance-device-event'),
    path('devices/', device_list, name='biometric-device-list'),
    path('devices/<int:pk>/', device_detail, name='biometric-device-detail'),
    path('devices/<int:pk>/rotate-key/', device_rotate_key, name='biometric-device-rotate-key'),
    path('devices/<int:device_pk>/enrollments/', device_enrollment_list, name='biometric-device-enrollment-list'),
    path(
        'devices/<int:device_pk>/enrollments/<int:pk>/',
        device_enrollment_detail,
        name='biometric-device-enrollment-detail',
    ),
]
