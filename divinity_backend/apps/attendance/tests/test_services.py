import pytest

from application.attendance.dtos import CheckInDTO
from application.attendance.services import CheckInService
from domain.attendance.exceptions import CheckInValidationError, MemberNotFoundForCheckInError
from infrastructure.persistence.attendance_repositories import DjangoORMAttendanceRepository
from infrastructure.persistence.member_repositories import DjangoORMMemberRepository


@pytest.fixture
def service():
    return CheckInService(DjangoORMAttendanceRepository(), DjangoORMMemberRepository())


@pytest.mark.django_db
class TestCheckInService:
    def test_checkin_by_member_id(self, service, org, make_member):
        member = make_member(org)
        checkin = service.execute(
            CheckInDTO(organization_id=org.id, method='manual', member_id=member.id)
        )
        assert checkin.member_id == member.id
        assert checkin.method == 'manual'
        assert checkin.checked_in_at is not None

    def test_checkin_by_member_code(self, service, org, make_member):
        member = make_member(org, member_code='ABC123')
        checkin = service.execute(
            CheckInDTO(organization_id=org.id, method='code', member_code='ABC123')
        )
        assert checkin.member_id == member.id

    def test_unknown_member_id_raises(self, service, org):
        with pytest.raises(MemberNotFoundForCheckInError):
            service.execute(CheckInDTO(organization_id=org.id, method='manual', member_id=999999))

    def test_unknown_code_raises(self, service, org):
        with pytest.raises(MemberNotFoundForCheckInError):
            service.execute(CheckInDTO(organization_id=org.id, method='code', member_code='NOPE'))

    def test_invalid_method_raises(self, service, org, make_member):
        member = make_member(org)
        with pytest.raises(CheckInValidationError):
            service.execute(CheckInDTO(organization_id=org.id, method='retina', member_id=member.id))

    def test_missing_identifier_raises(self, service, org):
        with pytest.raises(CheckInValidationError):
            service.execute(CheckInDTO(organization_id=org.id, method='manual'))

    def test_code_scoped_to_organization(self, service, org, make_org, make_member):
        other_org = make_org(slug='other-attendance-org')
        make_member(other_org, member_code='SHARED01')
        with pytest.raises(MemberNotFoundForCheckInError):
            service.execute(CheckInDTO(organization_id=org.id, method='code', member_code='SHARED01'))
