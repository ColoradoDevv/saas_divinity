from .models import MemberFieldConfigModel

# field_name -> is_required. Set recomendado para altas de miembro en gimnasios:
# identidad + contacto de emergencia son obligatorios, el resto queda habilitado
# pero opcional para no bloquear el alta si el staff no tiene el dato a mano.
RECOMMENDED_GYM_FIELDS = {
    'id_number': True,
    'birth_date': True,
    'emergency_contact_name': True,
    'emergency_contact_phone': True,
    'gender': False,
    'phone_secondary': False,
    'address': False,
    'medical_conditions': False,
    'goal': False,
    'referred_by': False,
    'notes': False,
}


def seed_recommended_member_fields(organization) -> int:
    """
    Activa el set de campos recomendado para gimnasios, únicamente para los
    field_name que la organización todavía no tiene configurados. Nunca
    sobreescribe una configuración ya existente (manual o de un seed previo).
    Devuelve la cantidad de campos creados.
    """
    existing = set(
        MemberFieldConfigModel.objects.filter(organization_id=organization.id)
        .values_list('field_name', flat=True)
    )
    to_create = [
        MemberFieldConfigModel(
            organization_id=organization.id,
            field_name=field_name,
            is_enabled=True,
            is_required=is_required,
        )
        for field_name, is_required in RECOMMENDED_GYM_FIELDS.items()
        if field_name not in existing
    ]
    if to_create:
        MemberFieldConfigModel.objects.bulk_create(to_create)
    return len(to_create)
