"""
Registro central de verticales ("servicios") de negocio.

Cada organización (tenant) queda asignada a un business_type al crearse.
El business_type determina qué módulos puede tener habilitados esa
organización: el superadmin ya no elige de una lista plana global, sino
del catálogo propio del vertical contratado.

Agregar un vertical nuevo (ej. barbería) es agregar una entrada en
VERTICAL_MODULE_CATALOG y su choice — no requiere cambios de arquitectura
en serializers ni vistas.
"""

BUSINESS_TYPE_GENERIC = 'generic'
BUSINESS_TYPE_GYM = 'gym'

BUSINESS_TYPE_CHOICES = [
    (BUSINESS_TYPE_GENERIC, 'Genérico'),
    (BUSINESS_TYPE_GYM, 'Gimnasio'),
]

BUSINESS_TYPE_LABELS: dict[str, str] = dict(BUSINESS_TYPE_CHOICES)

_BASE_MODULES = [
    {'key': 'members', 'label': 'Miembros'},
    {'key': 'workers', 'label': 'Trabajadores'},
    {'key': 'payments', 'label': 'Pagos'},
    {'key': 'attendance', 'label': 'Asistencia'},
    {'key': 'reports', 'label': 'Reportes'},
]

# Módulos específicos de gimnasio — no tiene sentido ofrecerlos a un vertical
# genérico (ej. una barbería no maneja horarios de clases grupales).
_GYM_ONLY_MODULES = [
    {'key': 'classes', 'label': 'Clases'},
]

# Complementos: NO forman parte del catálogo normal que el propio admin de la
# organización puede autoactivar desde el onboarding o /organizations/me/
# (get_valid_module_keys). Solo el superadmin los puede otorgar por
# organización (get_grantable_module_keys) — representan algo que el negocio
# adquiere aparte del plan, típicamente porque implica instalación manual de
# hardware/software (ej. un lector de huella digital).
_ADDON_MODULES = [
    {'key': 'biometric_devices', 'label': 'Huella digital'},
]

VERTICAL_MODULE_CATALOG: dict[str, list[dict]] = {
    BUSINESS_TYPE_GENERIC: list(_BASE_MODULES),
    BUSINESS_TYPE_GYM: list(_BASE_MODULES) + list(_GYM_ONLY_MODULES),
}


def get_module_catalog(business_type: str) -> list[dict]:
    """Catálogo de módulos (key + label) disponibles para ese vertical."""
    return VERTICAL_MODULE_CATALOG.get(business_type, [])


def get_valid_module_keys(business_type: str) -> set[str]:
    """Claves de módulo válidas para ese vertical, para validar enabled_modules
    en flujos de autoservicio (onboarding, /organizations/me/). Nunca incluye
    complementos."""
    return {m['key'] for m in get_module_catalog(business_type)}


def get_addon_catalog() -> list[dict]:
    """Catálogo de complementos (key + label), igual para cualquier vertical."""
    return list(_ADDON_MODULES)


def get_grantable_module_keys(business_type: str) -> set[str]:
    """Claves válidas para el superadmin: catálogo normal del vertical +
    complementos. Úsese solo en la vista de administración de superadmin."""
    return get_valid_module_keys(business_type) | {m['key'] for m in _ADDON_MODULES}
