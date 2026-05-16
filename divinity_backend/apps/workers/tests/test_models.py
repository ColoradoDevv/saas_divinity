import pytest
from apps.workers.models import TaskModel, WorkerModel


@pytest.mark.django_db
class TestWorkerModel:
    def test_str_returns_full_name(self, make_org, make_worker):
        org = make_org(slug='w-org')
        worker = make_worker(org, first_name='Ana', last_name='García')
        assert str(worker) == 'Ana García'

    def test_full_name_strips_trailing_space_when_last_name_blank(self, make_org, db):
        org = make_org(slug='fn-org')
        worker = WorkerModel.objects.create(
            organization=org, first_name='Solo', last_name='', position='Dev',
        )
        assert worker.full_name == 'Solo'

    def test_has_account_true_when_user_set(self, make_org, make_worker, make_user):
        org = make_org(slug='ha-org')
        user = make_user(username='ha@ex.com', email='ha@ex.com', password='p!')
        worker = make_worker(org, user=user)
        assert worker.has_account is True

    def test_has_account_false_when_no_user(self, make_org, make_worker):
        org = make_org(slug='nha-org')
        worker = make_worker(org, user=None)
        assert worker.has_account is False

    def test_set_null_when_linked_user_deleted(self, make_org, make_worker, make_user):
        org = make_org(slug='sn-org')
        user = make_user(username='sn@ex.com', email='sn@ex.com', password='p!')
        worker = make_worker(org, user=user)
        user.delete()
        worker.refresh_from_db()
        assert worker.user is None

    def test_cascade_delete_when_org_deleted(self, make_org, make_worker):
        org = make_org(slug='cd-org')
        make_worker(org)
        org.delete()
        assert WorkerModel.objects.count() == 0

    def test_allowed_modules_defaults_to_empty_list(self, make_org, db):
        org = make_org(slug='am-org')
        worker = WorkerModel.objects.create(
            organization=org, first_name='A', last_name='B', position='X',
        )
        assert worker.allowed_modules == []

    def test_default_is_active_true(self, make_org, db):
        org = make_org(slug='ia-org')
        worker = WorkerModel.objects.create(
            organization=org, first_name='A', last_name='B', position='X',
        )
        assert worker.is_active is True


@pytest.mark.django_db
class TestTaskModel:
    def test_str_returns_title(self, make_org, db):
        org = make_org(slug='task-org')
        task = TaskModel.objects.create(
            organization=org, title='Mi Tarea', priority='high',
        )
        assert str(task) == 'Mi Tarea'

    def test_default_priority_medium(self, make_org, db):
        org = make_org(slug='task-org2')
        task = TaskModel.objects.create(organization=org, title='T')
        assert task.priority == 'medium'

    def test_default_status_pending(self, make_org, db):
        org = make_org(slug='task-org3')
        task = TaskModel.objects.create(organization=org, title='T')
        assert task.status == 'pending'

    def test_set_null_when_worker_deleted(self, make_org, make_worker, db):
        org = make_org(slug='task-sn')
        worker = make_worker(org)
        task = TaskModel.objects.create(organization=org, worker=worker, title='T')
        worker.delete()
        task.refresh_from_db()
        assert task.worker is None

    def test_cascade_when_org_deleted(self, make_org, db):
        org = make_org(slug='task-cd')
        TaskModel.objects.create(organization=org, title='T')
        org.delete()
        assert TaskModel.objects.count() == 0
