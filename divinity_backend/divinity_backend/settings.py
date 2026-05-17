import os

# Valores de desarrollo por defecto — en producción vienen de la plataforma.
# setdefault no sobreescribe si la variable ya existe en el entorno real.
os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-dev-only-not-for-production')
os.environ.setdefault('DJANGO_DEBUG', 'True')

from .settings_base import *  # noqa: E402
from .settings_local import *  # noqa: E402
