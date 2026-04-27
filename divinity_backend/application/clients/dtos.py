from dataclasses import dataclass


@dataclass(frozen=True)
class CreateClientDTO:
    first_name: str
    last_name: str
    email: str
    phone: str = ''
