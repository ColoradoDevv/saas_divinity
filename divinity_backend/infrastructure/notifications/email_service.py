"""
Envío de emails reales vía el framework de mail de Django (backend SMTP
genérico, configurable por variables de entorno — ver settings_base.py).

Un fallo de envío (SMTP mal configurado, sin conexión, etc.) nunca debe romper
el flujo principal (crear un miembro, cobrar una cuota) — por eso todas las
funciones acá atrapan la excepción y solo la loguean.
"""

import logging
from datetime import date
from decimal import Decimal

from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _send(subject: str, body: str, to_email: str) -> None:
    if not to_email:
        return
    try:
        send_mail(subject=subject, message=body, from_email=None, recipient_list=[to_email])
    except Exception:
        logger.exception('Error al enviar email a %s: %s', to_email, subject)


def send_welcome_email(*, to_email: str, first_name: str, organization_name: str) -> None:
    _send(
        subject=f'¡Bienvenido/a a {organization_name}!',
        body=(
            f'Hola {first_name},\n\n'
            f'Tu registro en {organization_name} fue exitoso. '
            f'¡Nos alegra tenerte con nosotros!'
        ),
        to_email=to_email,
    )


def send_payment_confirmation_email(
    *, to_email: str, first_name: str, organization_name: str,
    amount: Decimal, plan_name: str, end_date: date,
) -> None:
    _send(
        subject=f'Pago confirmado — {organization_name}',
        body=(
            f'Hola {first_name},\n\n'
            f'Registramos tu pago de ${amount} por el plan "{plan_name}". '
            f'Tu membresía queda vigente hasta el {end_date.strftime("%d/%m/%Y")}.'
        ),
        to_email=to_email,
    )


def send_expiring_reminder_email(
    *, to_email: str, first_name: str, organization_name: str,
    plan_name: str, end_date: date,
) -> None:
    _send(
        subject=f'Tu membresía está por vencer — {organization_name}',
        body=(
            f'Hola {first_name},\n\n'
            f'Tu plan "{plan_name}" en {organization_name} vence el '
            f'{end_date.strftime("%d/%m/%Y")}. Pasá a renovarlo para no perder tu acceso.'
        ),
        to_email=to_email,
    )


def send_portal_invite_email(
    *, to_email: str, first_name: str, organization_name: str, activation_url: str,
) -> None:
    _send(
        subject=f'Activa tu acceso al portal — {organization_name}',
        body=(
            f'Hola {first_name},\n\n'
            f'{organization_name} te invita a activar tu portal de miembro, donde vas a poder '
            f'ver tu membresía, tus pagos, tu código QR y reservar clases.\n\n'
            f'Para activarlo, entra a: {activation_url}'
        ),
        to_email=to_email,
    )


def send_class_cancelled_email(
    *, to_email: str, first_name: str, class_name: str, session_date: date, session_time,
) -> None:
    _send(
        subject=f'Clase cancelada: {class_name}',
        body=(
            f'Hola {first_name},\n\n'
            f'Te avisamos que la clase de "{class_name}" del {session_date.strftime("%d/%m/%Y")} '
            f'a las {session_time.strftime("%H:%M")} fue cancelada. Disculpá las molestias.'
        ),
        to_email=to_email,
    )
