from django.urls import path

from .views import TaskDetailView, TaskListCreateView, WorkerDetailView, WorkerListCreateView

urlpatterns = [
    path('', WorkerListCreateView.as_view(), name='worker-list-create'),
    path('<int:pk>/', WorkerDetailView.as_view(), name='worker-detail'),
    path('tasks/', TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
]
