class ClassTypeNotFoundError(Exception):
    """No se encontró el tipo de clase."""


class ScheduleNotFoundError(Exception):
    """No se encontró el horario recurrente."""


class ClassValidationError(Exception):
    """Datos inválidos para el tipo de clase, horario o sesión."""


class SessionNotFoundError(Exception):
    """No se encontró la sesión."""


class SessionFullError(Exception):
    """La sesión ya alcanzó su cupo máximo."""


class EnrollmentNotFoundError(Exception):
    """No se encontró la inscripción."""


class AlreadyEnrolledError(Exception):
    """El miembro ya tiene una inscripción activa en esta sesión."""
