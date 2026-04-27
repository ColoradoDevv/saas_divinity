from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from .exceptions import ClientValidationError


@dataclass(frozen=True)
class Client:
    id: Optional[int]
    first_name: str
    last_name: str
    email: str
    phone: str
    is_active: bool
    created_at: datetime

    @classmethod
    def create(
        cls,
        first_name: str,
        last_name: str,
        email: str,
        phone: str = '',
    ) -> 'Client':
        if not first_name.strip() or not last_name.strip():
            raise ClientValidationError('first_name and last_name are required.')
        if '@' not in email:
            raise ClientValidationError('email must be a valid address.')
        return cls(
            id=None,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip().lower(),
            phone=phone.strip(),
            is_active=True,
            created_at=datetime.utcnow(),
        )

    def to_primitives(self) -> dict:
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
        }
