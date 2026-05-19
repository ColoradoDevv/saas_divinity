import string
import pytest

from apps.workers.views import (
    _PASSWORD_ALPHABET,
    _generate_password,
    _generate_username,
    _task_to_dict,
    _worker_to_dict,
)


class TestGeneratePassword:
    def test_returns_correct_length(self):
        pw = _generate_password(12)
        assert len(pw) == 12

    def test_uses_allowed_alphabet(self):
        pw = _generate_password(50)
        assert all(c in _PASSWORD_ALPHABET for c in pw)

    def test_is_not_deterministic(self):
        passwords = {_generate_password(12) for _ in range(20)}
        assert len(passwords) > 1

    def test_custom_length(self):
        assert len(_generate_password(8)) == 8
        assert len(_generate_password(20)) == 20


@pytest.mark.django_db
class TestGenerateUsername:
    def test_basic_case(self):
        username = _generate_username('Juan', 'Perez')
        assert username == 'juan.perez'

    def test_collision_appends_suffix(self, make_user):
        make_user(username='juan.perez', email='j@ex.com', password='p!')
        username = _generate_username('Juan', 'Perez')
        assert username == 'juan.perez1'

    def test_multiple_collisions_increment_suffix(self, make_user):
        make_user(username='ana.lopez', email='a1@ex.com', password='p!')
        make_user(username='ana.lopez1', email='a2@ex.com', password='p!')
        username = _generate_username('Ana', 'Lopez')
        assert username == 'ana.lopez2'

    def test_strips_non_alphanumeric_except_dots(self):
        username = _generate_username('Ján', 'O\'Brien')
        assert all(c.isalnum() or c == '.' for c in username)


@pytest.mark.django_db
class TestWorkerToDict:
    def test_includes_all_expected_keys(self, make_org, make_worker):
        org = make_org(slug='wd-org')
        worker = make_worker(org)
        d = _worker_to_dict(worker)
        for key in ('id', 'first_name', 'last_name', 'full_name', 'email', 'phone',
                    'position', 'has_account', 'is_active', 'created_at',
                    'task_count', 'allowed_modules', 'generated_credentials'):
            assert key in d, f'Missing key: {key}'

    def test_generated_credentials_passed_through(self, make_org, make_worker):
        org = make_org(slug='gc-org')
        worker = make_worker(org)
        creds = {'username': 'u', 'password': 'p'}
        d = _worker_to_dict(worker, generated_credentials=creds)
        assert d['generated_credentials'] == creds

    def test_generated_credentials_defaults_to_none(self, make_org, make_worker):
        org = make_org(slug='gcn-org')
        worker = make_worker(org)
        d = _worker_to_dict(worker)
        assert d['generated_credentials'] is None


@pytest.mark.django_db
class TestTaskToDict:
    def test_with_linked_worker_returns_full_name(self, make_org, make_worker):
        from apps.workers.models import TaskModel
        org = make_org(slug='td-org')
        worker = make_worker(org, first_name='Ana', last_name='López')
        task = TaskModel.objects.create(organization=org, worker=worker, title='My Task')
        task_with_worker = TaskModel.objects.select_related('worker').get(pk=task.pk)
        d = _task_to_dict(task_with_worker)
        assert d['worker_name'] == 'Ana López'

    def test_without_worker_returns_none_for_worker_name(self, make_org):
        from apps.workers.models import TaskModel
        org = make_org(slug='tdnw-org')
        task = TaskModel.objects.create(organization=org, title='Unassigned')
        task_loaded = TaskModel.objects.select_related('worker').get(pk=task.pk)
        d = _task_to_dict(task_loaded)
        assert d['worker_name'] is None

    def test_includes_all_keys(self, make_org):
        from apps.workers.models import TaskModel
        org = make_org(slug='tdk-org')
        task = TaskModel.objects.create(organization=org, title='T')
        task_loaded = TaskModel.objects.select_related('worker').get(pk=task.pk)
        d = _task_to_dict(task_loaded)
        for key in ('id', 'worker_id', 'worker_name', 'title', 'description',
                    'due_date', 'priority', 'status', 'created_at', 'updated_at'):
            assert key in d, f'Missing key: {key}'
