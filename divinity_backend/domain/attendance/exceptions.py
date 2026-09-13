class MemberNotFoundForCheckInError(Exception):
    """Se lanza cuando no se encuentra el miembro (por id o member_code) para el check-in."""


class CheckInValidationError(Exception):
    """Se lanza cuando los datos del check-in no son válidos (método desconocido,
    o no se indicó ni member_id ni member_code)."""
