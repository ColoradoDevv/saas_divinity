from django.urls import path

from .views import (
    ClassTypeViewSet,
    EnrollmentAttendView,
    EnrollmentCancelView,
    ScheduleViewSet,
    SessionCancelView,
    SessionDetailView,
    SessionEnrollView,
    SessionListView,
)

# /api/classes/types/
class_type_list = ClassTypeViewSet.as_view({'get': 'list', 'post': 'create'})
class_type_detail = ClassTypeViewSet.as_view({'put': 'update', 'patch': 'update', 'delete': 'destroy'})

# /api/classes/schedules/
schedule_list = ScheduleViewSet.as_view({'get': 'list', 'post': 'create'})
schedule_detail = ScheduleViewSet.as_view({'put': 'update', 'patch': 'update', 'delete': 'destroy'})

urlpatterns = [
    path('types/', class_type_list, name='class-type-list'),
    path('types/<int:pk>/', class_type_detail, name='class-type-detail'),
    path('schedules/', schedule_list, name='class-schedule-list'),
    path('schedules/<int:pk>/', schedule_detail, name='class-schedule-detail'),
    path('sessions/', SessionListView.as_view(), name='class-session-list'),
    path('sessions/<int:pk>/', SessionDetailView.as_view(), name='class-session-detail'),
    path('sessions/<int:pk>/enroll/', SessionEnrollView.as_view(), name='class-session-enroll'),
    path('sessions/<int:pk>/cancel/', SessionCancelView.as_view(), name='class-session-cancel'),
    path('enrollments/<int:pk>/cancel/', EnrollmentCancelView.as_view(), name='class-enrollment-cancel'),
    path('enrollments/<int:pk>/attend/', EnrollmentAttendView.as_view(), name='class-enrollment-attend'),
]
