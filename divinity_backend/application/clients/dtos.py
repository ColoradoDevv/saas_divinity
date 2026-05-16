from dataclasses import dataclass


@dataclass(frozen=True)
class CreateClientDTO:
    organization_id: int
    first_name: str
    last_name: str
    email: str
    phone: str = ''
