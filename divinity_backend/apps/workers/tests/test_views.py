import pytest
from rest_framework import status

from conftest import _make_jwt_for


def _worker_payload(**overrides):
    data = {
        'first_name': 'Juan',
        'last_name': 'Perez',
        'email': 'juan@ex.com',
        'phone': '555-1234',
        'position': 'Barbero',
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestWorkerListCreateView:
    url = '/api/workers/'

    def test_get_returns_active_workers_for_own_org(self, admin_client, make_worker, org):
        make_worker(org, first_name='A', last_name='X')
        make_worker(org, first_name='B', last_name='Y', is_active=False)
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_get_without_org_context_returns_403(self, api_client, make_user):
        user = make_user(username='noorg@ex.com', email='noorg@ex.com', password='p!')
        token = _make_jwt_for(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_post_worker_without_account(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['has_account'] is False
        assert resp.data['generated_credentials'] is None

    def test_post_worker_with_auto_credential_type(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='', create_account=True, credential_type='auto',
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['generated_credentials'] is not None
        assert 'username' in resp.data['generated_credentials']
        assert 'password' in resp.data['generated_credentials']

    def test_post_worker_gmail_with_manual_password(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='worker@gmail.com', create_account=True,
            credential_type='gmail', password_type='manual', password='pass1234!',
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['has_account'] is True

    def test_post_worker_gmail_with_auto_password(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='worker2@gmail.com', create_account=True,
            credential_type='gmail', password_type='auto',
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['generated_credentials']['password'] is not None

    def test_post_gmail_type_without_email_returns_400(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='', create_account=True, credential_type='gmail', password_type='manual',
            password='pass1234!',
        ), format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_manual_password_without_password_returns_400(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='w@ex.com', create_account=True, credential_type='gmail',
            password_type='manual', password='',
        ), format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_duplicate_email_returns_400(self, admin_client):
        admin_client.post(self.url, _worker_payload(
            email='dup@ex.com', create_account=True, credential_type='gmail',
            password_type='manual', password='pass1234!',
        ), format='json')
        resp = admin_client.post(self.url, _worker_payload(
            email='dup@ex.com', create_account=True, credential_type='gmail',
            password_type='manual', password='pass1234!',
        ), format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_no_allowed_modules_inherits_org(self, admin_client, org):
        org.enabled_modules = ['workers', 'clients']
        org.save()
        resp = admin_client.post(self.url, _worker_payload(
            email='inh@ex.com', allowed_modules=[],
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert set(resp.data['allowed_modules']) == {'workers', 'clients'}

    def test_post_explicit_allowed_modules(self, admin_client):
        resp = admin_client.post(self.url, _worker_payload(
            email='exp@ex.com', allowed_modules=['workers'],
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['allowed_modules'] == ['workers']

    def test_post_creates_membership_for_account(self, admin_client):
        from apps.organizations.models import MembershipModel
        resp = admin_client.post(self.url, _worker_payload(
            email='mem@ex.com', create_account=True, credential_type='gmail',
            password_type='manual', password='pass1234!',
        ), format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert MembershipModel.objects.filter(user__email='mem@ex.com', role='staff').exists()


@pytest.mark.django_db
class TestWorkerDetailView:
    def _create_worker(self, admin_client, org, **kwargs):
        from apps.workers.models import WorkerModel
        return WorkerModel.objects.create(
            organization=org, first_name='J', last_name='P', position='Dev', **kwargs
        )

    def test_get_worker_by_pk(self, admin_client, org):
        worker = self._create_worker(admin_client, org)
        resp = admin_client.get(f'/api/workers/{worker.pk}/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['id'] == worker.pk

    def test_get_worker_from_other_org_returns_404(self, admin_client, make_org, make_worker):
        other_org = make_org(slug='other-org-det')
        worker = make_worker(other_org)
        resp = admin_client.get(f'/api/workers/{worker.pk}/')
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_updates_worker(self, admin_client, org):
        worker = self._create_worker(admin_client, org)
        resp = admin_client.patch(
            f'/api/workers/{worker.pk}/', {'position': 'Senior Dev'}, format='json'
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['position'] == 'Senior Dev'

    def test_delete_soft_deletes_worker(self, admin_client, org):
        from apps.workers.models import WorkerModel
        worker = self._create_worker(admin_client, org)
        resp = admin_client.delete(f'/api/workers/{worker.pk}/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        worker.refresh_from_db()
        assert worker.is_active is False

    def test_delete_nonexistent_worker_returns_404(self, admin_client):
        resp = admin_client.delete('/api/workers/999999/')
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTaskListCreateView:
    url = '/api/workers/tasks/'

    def test_admin_gets_all_org_tasks(self, admin_client, org, make_worker):
        from apps.workers.models import TaskModel
        worker = make_worker(org)
        TaskModel.objects.create(organization=org, worker=worker, title='T1')
        TaskModel.objects.create(organization=org, title='T2')
        resp = admin_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_admin_filter_by_worker_id(self, admin_client, org, make_worker):
        from apps.workers.models import TaskModel
        w1 = make_worker(org, first_name='W1', last_name='X')
        w2 = make_worker(org, first_name='W2', last_name='Y')
        TaskModel.objects.create(organization=org, worker=w1, title='T1')
        TaskModel.objects.create(organization=org, worker=w2, title='T2')
        resp = admin_client.get(f'{self.url}?worker_id={w1.pk}')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]['worker_id'] == w1.pk

    def test_staff_gets_only_own_tasks(self, api_client, make_user, org, make_membership,
                                        make_worker):
        from apps.workers.models import TaskModel
        user = make_user(username='stf@ex.com', email='stf@ex.com', password='p!')
        make_membership(user, org, role='staff')
        worker = make_worker(org, user=user)
        TaskModel.objects.create(organization=org, worker=worker, title='MyTask')
        TaskModel.objects.create(organization=org, title='OtherTask')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]['title'] == 'MyTask'

    def test_staff_with_no_worker_model_returns_empty(self, api_client, make_user, org,
                                                        make_membership):
        user = make_user(username='stfnw@ex.com', email='stfnw@ex.com', password='p!')
        make_membership(user, org, role='staff')
        token = _make_jwt_for(user, org=org, role='staff')
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = api_client.get(self.url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_post_task_with_valid_worker(self, admin_client, org, make_worker):
        worker = make_worker(org)
        resp = admin_client.post(self.url, {
            'title': 'New Task', 'worker_id': worker.pk, 'priority': 'high',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['worker_id'] == worker.pk

    def test_post_task_without_worker(self, admin_client):
        resp = admin_client.post(self.url, {'title': 'Unassigned Task'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['worker_id'] is None

    def test_post_task_worker_from_other_org_returns_404(self, admin_client, make_org,
                                                          make_worker):
        other_org = make_org(slug='other-task-org')
        other_worker = make_worker(other_org)
        resp = admin_client.post(self.url, {
            'title': 'Hack Task', 'worker_id': other_worker.pk,
        }, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTaskDetailView:
    def _create_task(self, org, worker=None, title='T'):
        from apps.workers.models import TaskModel
        return TaskModel.objects.create(organization=org, worker=worker, title=title)

    def test_get_task_by_pk(self, admin_client, org):
        task = self._create_task(org)
        resp = admin_client.get(f'/api/workers/tasks/{task.pk}/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['id'] == task.pk

    def test_patch_task_status(self, admin_client, org):
        task = self._create_task(org)
        resp = admin_client.patch(
            f'/api/workers/tasks/{task.pk}/', {'status': 'done'}, format='json'
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'done'

    def test_patch_task_reassign_worker(self, admin_client, org, make_worker):
        task = self._create_task(org)
        worker = make_worker(org, first_name='New', last_name='Worker')
        resp = admin_client.patch(
            f'/api/workers/tasks/{task.pk}/', {'worker_id': worker.pk}, format='json'
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['worker_id'] == worker.pk

    def test_patch_task_set_worker_null(self, admin_client, org, make_worker):
        worker = make_worker(org)
        task = self._create_task(org, worker=worker)
        resp = admin_client.patch(
            f'/api/workers/tasks/{task.pk}/', {'worker_id': None}, format='json'
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['worker_id'] is None

    def test_patch_task_worker_from_other_org_returns_404(self, admin_client, org,
                                                           make_org, make_worker):
        task = self._create_task(org)
        other_org = make_org(slug='other-tsk-org')
        other_worker = make_worker(other_org)
        resp = admin_client.patch(
            f'/api/workers/tasks/{task.pk}/', {'worker_id': other_worker.pk}, format='json'
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_task_hard_deletes(self, admin_client, org):
        from apps.workers.models import TaskModel
        task = self._create_task(org)
        resp = admin_client.delete(f'/api/workers/tasks/{task.pk}/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not TaskModel.objects.filter(pk=task.pk).exists()

    def test_delete_nonexistent_task_returns_404(self, admin_client):
        resp = admin_client.delete('/api/workers/tasks/999999/')
        assert resp.status_code == status.HTTP_404_NOT_FOUND
