import secrets
import string

from django.contrib.auth import get_user_model
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

_PASSWORD_ALPHABET = string.ascii_letters + string.digits + '!@#$%&*'


def _generate_password(length: int = 12) -> str:
    return ''.join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))


def _generate_username(first_name: str, last_name: str) -> str:
    base = f"{first_name.lower()}.{last_name.lower()}"
    # Mantener solo letras, números y puntos
    base = ''.join(c for c in base if c.isalnum() or c == '.')
    username = base
    suffix = 1
    while UserModel.objects.filter(username=username).exists():
        username = f'{base}{suffix}'
        suffix += 1
    return username


def _get_org_id(request) -> int:
    if request.auth and 'organization_id' in request.auth:
        return int(request.auth['organization_id'])
    raise PermissionDenied('Sin contexto de organización.')


def _worker_to_dict(worker: WorkerModel, generated_credentials=None) -> dict:
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
        'allowed_modules': worker.allowed_modules,
        'generated_credentials': generated_credentials,
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
        generated_credentials = None

        if d.get('create_account'):
            credential_type = d.get('credential_type', 'gmail')
            password_type = d.get('password_type', 'manual')

            if credential_type == 'auto':
                username = _generate_username(d['first_name'], d['last_name'])
                password = _generate_password()
                email = d.get('email', '') or f'{username}@divinity.local'
            else:
                # gmail: el email del trabajador es el nombre de usuario
                if not d.get('email'):
                    raise ValidationError({'email': 'El correo es requerido para el tipo de cuenta Gmail.'})
                email = d['email']
                username = email
                if password_type == 'auto':
                    password = _generate_password()
                else:
                    if not d.get('password'):
                        raise ValidationError({'password': 'La contraseña es requerida.'})
                    password = d['password']

            if UserModel.objects.filter(email=email).exists():
                raise ValidationError({'email': 'Ya existe una cuenta con ese correo.'})
            if UserModel.objects.filter(username=username).exists():
                raise ValidationError({'email': 'Ya existe una cuenta con ese nombre de usuario.'})

            user = UserModel.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=d['first_name'],
                last_name=d['last_name'],
                is_staff=False,      # Workers son usuarios normales sin acceso al panel Django
                is_superuser=False,
            )
            MembershipModel.objects.create(
                user=user,
                organization_id=org_id,
                role='staff',
            )
            generated_credentials = {'username': username, 'password': password}

        # Si no se especifican módulos, hereda todos los de la org
        allowed_modules = d.get('allowed_modules') or []
        if not allowed_modules:
            from apps.organizations.models import OrganizationModel
            try:
                org = OrganizationModel.objects.get(pk=org_id)
                allowed_modules = org.enabled_modules
            except OrganizationModel.DoesNotExist:
                allowed_modules = []

        worker = WorkerModel.objects.create(
            organization_id=org_id,
            user=user,
            first_name=d['first_name'],
            last_name=d['last_name'],
            email=d.get('email', ''),
            phone=d.get('phone', ''),
            position=d.get('position', ''),
            allowed_modules=allowed_modules,
        )
        return Response(
            WorkerReadSerializer(_worker_to_dict(worker, generated_credentials)).data,
            status=status.HTTP_201_CREATED,
        )


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
