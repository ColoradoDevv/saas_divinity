from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.organizations.models import MembershipModel
from .models import TaskModel, WorkerModel
from .serializers import (
    CreateTaskSerializer,
    CreateWorkerSerializer,
    TaskReadSerializer,
    UpdateTaskSerializer,
    UpdateWorkerSerializer,
    WorkerReadSerializer,
)

UserModel = get_user_model()


def _get_org_id(request) -> int:
    if request.auth and 'organization_id' in request.auth:
        return int(request.auth['organization_id'])
    raise PermissionDenied('Sin contexto de organización.')


def _worker_to_dict(worker: WorkerModel) -> dict:
    return {
        'id': worker.id,
        'first_name': worker.first_name,
        'last_name': worker.last_name,
        'full_name': worker.full_name,
        'email': worker.email,
        'phone': worker.phone,
        'position': worker.position,
        'has_account': worker.has_account,
        'is_active': worker.is_active,
        'created_at': worker.created_at,
        'task_count': worker.tasks.filter(status__in=['pending', 'in_progress']).count(),
    }


def _task_to_dict(task: TaskModel) -> dict:
    return {
        'id': task.id,
        'worker_id': task.worker_id,
        'worker_name': task.worker.full_name if task.worker else None,
        'title': task.title,
        'description': task.description,
        'due_date': task.due_date,
        'priority': task.priority,
        'status': task.status,
        'created_at': task.created_at,
        'updated_at': task.updated_at,
    }


class WorkerListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org_id = _get_org_id(request)
        workers = WorkerModel.objects.filter(
            organization_id=org_id, is_active=True
        ).prefetch_related('tasks')
        data = [WorkerReadSerializer(_worker_to_dict(w)).data for w in workers]
        return Response(data)

    @transaction.atomic
    def post(self, request):
        org_id = _get_org_id(request)
        serializer = CreateWorkerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        user = None
        if d.get('create_account') and d.get('email') and d.get('password'):
            if UserModel.objects.filter(email=d['email']).exists():
                raise ValidationError('Ya existe una cuenta con ese correo.')
            user = UserModel.objects.create_user(
                username=d['email'],
                email=d['email'],
                password=d['password'],
                first_name=d['first_name'],
                last_name=d['last_name'],
            )
            MembershipModel.objects.create(
                user=user,
                organization_id=org_id,
                role='staff',
            )

        worker = WorkerModel.objects.create(
            organization_id=org_id,
            user=user,
            first_name=d['first_name'],
            last_name=d['last_name'],
            email=d.get('email', ''),
            phone=d.get('phone', ''),
            position=d.get('position', ''),
        )
        return Response(WorkerReadSerializer(_worker_to_dict(worker)).data, status=status.HTTP_201_CREATED)


class WorkerDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_worker(self, request, pk):
        org_id = _get_org_id(request)
        try:
            return WorkerModel.objects.get(pk=pk, organization_id=org_id)
        except WorkerModel.DoesNotExist:
            raise NotFound('Trabajador no encontrado.')

    def get(self, request, pk):
        worker = self._get_worker(request, pk)
        return Response(WorkerReadSerializer(_worker_to_dict(worker)).data)

    def patch(self, request, pk):
        worker = self._get_worker(request, pk)
        serializer = UpdateWorkerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(worker, field, value)
        worker.save()
        return Response(WorkerReadSerializer(_worker_to_dict(worker)).data)

    def delete(self, request, pk):
        worker = self._get_worker(request, pk)
        worker.is_active = False
        worker.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org_id = _get_org_id(request)

        # Si el usuario es trabajador con cuenta, solo ve sus tareas
        role = request.auth.get('role') if request.auth else None
        if role == 'staff':
            try:
                worker = WorkerModel.objects.get(user=request.user, organization_id=org_id)
                tasks = TaskModel.objects.filter(
                    organization_id=org_id,
                    worker=worker,
                ).select_related('worker')
            except WorkerModel.DoesNotExist:
                tasks = TaskModel.objects.none()
        else:
            worker_id = request.query_params.get('worker_id')
            qs = TaskModel.objects.filter(organization_id=org_id).select_related('worker')
            if worker_id:
                qs = qs.filter(worker_id=worker_id)
            tasks = qs

        data = [TaskReadSerializer(_task_to_dict(t)).data for t in tasks]
        return Response(data)

    def post(self, request):
        org_id = _get_org_id(request)
        serializer = CreateTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        worker = None
        if d.get('worker_id'):
            try:
                worker = WorkerModel.objects.get(pk=d['worker_id'], organization_id=org_id)
            except WorkerModel.DoesNotExist:
                raise NotFound('Trabajador no encontrado.')

        task = TaskModel.objects.create(
            organization_id=org_id,
            worker=worker,
            title=d['title'],
            description=d.get('description', ''),
            due_date=d.get('due_date'),
            priority=d.get('priority', 'medium'),
        )
        return Response(TaskReadSerializer(_task_to_dict(task)).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_task(self, request, pk):
        org_id = _get_org_id(request)
        try:
            return TaskModel.objects.select_related('worker').get(pk=pk, organization_id=org_id)
        except TaskModel.DoesNotExist:
            raise NotFound('Tarea no encontrada.')

    def get(self, request, pk):
        task = self._get_task(request, pk)
        return Response(TaskReadSerializer(_task_to_dict(task)).data)

    def patch(self, request, pk):
        task = self._get_task(request, pk)
        org_id = _get_org_id(request)
        serializer = UpdateTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        if 'worker_id' in d:
            if d['worker_id'] is None:
                task.worker = None
            else:
                try:
                    task.worker = WorkerModel.objects.get(pk=d['worker_id'], organization_id=org_id)
                except WorkerModel.DoesNotExist:
                    raise NotFound('Trabajador no encontrado.')

        for field in ('title', 'description', 'due_date', 'priority', 'status'):
            if field in d:
                setattr(task, field, d[field])

        task.save()
        return Response(TaskReadSerializer(_task_to_dict(task)).data)

    def delete(self, request, pk):
        task = self._get_task(request, pk)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
