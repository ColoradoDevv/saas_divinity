class PlanNotFoundError(Exception):
    """Se lanza cuando no se encuentra el plan solicitado (o está inactivo)."""


class PlanValidationError(Exception):
    """Se lanza cuando los datos del plan no pasan validación de dominio."""


class SubscriptionNotFoundError(Exception):
    """Se lanza cuando no se encuentra la suscripción solicitada."""


class SubscriptionValidationError(Exception):
    """Se lanza cuando una transición de estado de suscripción no es válida
    (ej. congelar una que no está activa, reanudar una que no está congelada)."""
