import pytest
from django.contrib.auth import get_user_model

from domain.authentication.entities import AuthenticatedUser
from infrastructure.persistence.user_repositories import DjangoORMUserRepository

UserModel = get_user_model()


@pytest.fixture
def repo():
    return DjangoORMUserRepository()


@pytest.mark.django_db
class TestAuthenticate:
    def test_valid_email_and_password_returns_entity(self, repo, make_user):
        make_user(username='u@ex.com', email='u@ex.com', password='correct!')
        result = repo.authenticate('u@ex.com', 'correct!')
        assert isinstance(result, AuthenticatedUser)
        assert result.email == 'u@ex.com'

    def test_valid_username_fallback_returns_entity(self, repo, make_user):
        make_user(username='juan.perez1', email='', password='pass!')
        result = repo.authenticate('juan.perez1', 'pass!')
        assert result is not None
        assert result.username == 'juan.perez1'

    def test_wrong_password_returns_none(self, repo, make_user):
        make_user(username='w@ex.com', email='w@ex.com', password='correct!')
        assert repo.authenticate('w@ex.com', 'wrong!') is None

    def test_nonexistent_email_and_username_returns_none(self, repo):
        assert repo.authenticate('ghost@ex.com', 'pass!') is None

    def test_inactive_user_returns_none(self, repo, make_user):
        make_user(username='i@ex.com', email='i@ex.com', password='pass!', is_active=False)
        assert repo.authenticate('i@ex.com', 'pass!') is None

    def test_email_lookup_case_insensitive(self, repo, make_user):
        make_user(username='Case@Ex.com', email='Case@Ex.com', password='pass!')
        result = repo.authenticate('case@ex.com', 'pass!')
        assert result is not None

    def test_username_lookup_case_insensitive(self, repo, make_user):
        make_user(username='Juan.Perez', email='', password='pass!')
        result = repo.authenticate('juan.perez', 'pass!')
        assert result is not None


@pytest.mark.django_db
class TestGetById:
    def test_existing_active_user_returns_entity(self, repo, make_user):
        user = make_user(username='g@ex.com', email='g@ex.com', password='pass!',
                         first_name='Ana', last_name='Lopez')
        result = repo.get_by_id(user.id)
        assert isinstance(result, AuthenticatedUser)
        assert result.id == user.id
        assert result.first_name == 'Ana'

    def test_nonexistent_id_returns_none(self, repo):
        assert repo.get_by_id(999999) is None

    def test_inactive_user_returns_none(self, repo, make_user):
        user = make_user(username='inact@ex.com', email='inact@ex.com',
                         password='pass!', is_active=False)
        assert repo.get_by_id(user.id) is None


@pytest.mark.django_db
class TestToEntity:
    def test_maps_all_fields_correctly(self, repo, make_user):
        user = make_user(username='all@ex.com', email='all@ex.com', password='pass!',
                         first_name='Foo', last_name='Bar', is_superuser=True, is_staff=True)
        entity = repo._to_entity(user)
        assert entity.id == user.id
        assert entity.username == user.username
        assert entity.email == user.email
        assert entity.first_name == 'Foo'
        assert entity.last_name == 'Bar'
        assert entity.is_active is True
        assert entity.is_staff is True
        assert entity.is_superuser is True
