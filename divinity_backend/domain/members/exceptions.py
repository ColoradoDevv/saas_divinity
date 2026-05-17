class MemberAlreadyExistsError(Exception):
    """Se lanza cuando ya existe un miembro con ese email en la organización."""


class MemberNotFoundError(Exception):
    """Se lanza cuando no se encuentra el miembro solicitado."""


class MemberValidationError(Exception):
    """Se lanza cuando los datos del miembro no pasan validación de dominio."""
