from dataclasses import dataclass


@dataclass(frozen=True)
class LoginDTO:
    email: str
    password: str
