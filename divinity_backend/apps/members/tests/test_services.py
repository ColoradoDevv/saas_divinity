import pytest

from application.members.dtos import CreateMemberDTO
from application.members.services import CreateMemberService
from infrastructure.persistence.member_repositories import DjangoORMMemberRepository


@pytest.fixture
def repo():
    return DjangoORMMemberRepository()


@pytest.mark.django_db
class TestCreateMemberServiceMemberCode:
    """member_code es la base del check-in por código/QR (apps/billing, apps/attendance) —
    debe generarse siempre, tenga o no foto el miembro."""

    def test_member_without_photo_still_gets_a_code(self, repo, org):
        dto = CreateMemberDTO(
            organization_id=org.id, first_name='Ana', last_name='Gomez', email='ana@example.com',
        )
        member = CreateMemberService(repo).execute(dto)
        assert member.member_code != ''
        assert len(member.member_code) == 10

    def test_member_with_photo_gets_a_code(self, repo, org):
        dto = CreateMemberDTO(
            organization_id=org.id, first_name='Luis', last_name='Diaz', email='luis@example.com',
            standard_fields={'photo': 'https://example.com/photo.jpg'},
        )
        member = CreateMemberService(repo).execute(dto)
        assert member.member_code != ''

    def test_member_codes_are_unique(self, repo, org):
        dto1 = CreateMemberDTO(organization_id=org.id, first_name='A', last_name='B', email='a@example.com')
        dto2 = CreateMemberDTO(organization_id=org.id, first_name='C', last_name='D', email='c@example.com')
        m1 = CreateMemberService(repo).execute(dto1)
        m2 = CreateMemberService(repo).execute(dto2)
        assert m1.member_code != m2.member_code


@pytest.mark.django_db
class TestFaceDescriptor:
    """face_descriptor lo calcula el navegador (face-api.js) y viaja tal cual —
    el backend solo lo persiste y lo devuelve para la verificación 1:1 en check-in."""

    def test_stored_on_create(self, repo, org):
        descriptor = [0.1, 0.2, 0.3]
        dto = CreateMemberDTO(
            organization_id=org.id, first_name='Ana', last_name='Gomez', email='ana2@example.com',
            face_descriptor=descriptor,
        )
        member = CreateMemberService(repo).execute(dto)
        assert member.face_descriptor == descriptor

    def test_null_when_not_provided(self, repo, org):
        dto = CreateMemberDTO(organization_id=org.id, first_name='B', last_name='C', email='bc@example.com')
        member = CreateMemberService(repo).execute(dto)
        assert member.face_descriptor is None

    def test_update_sets_descriptor(self, repo, org):
        from application.members.dtos import UpdateMemberDTO
        from application.members.services import UpdateMemberService

        created = CreateMemberService(repo).execute(
            CreateMemberDTO(organization_id=org.id, first_name='D', last_name='E', email='de@example.com')
        )
        assert created.face_descriptor is None

        updated = UpdateMemberService(repo).execute(
            UpdateMemberDTO(member_id=created.id, organization_id=org.id, face_descriptor=[0.5, 0.6])
        )
        assert updated.face_descriptor == [0.5, 0.6]
