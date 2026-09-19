import os
from pathlib import Path

from dotenv import load_dotenv

# Carga .env si existe (desarrollo local) — en producción las variables ya
# vienen inyectadas por la plataforma y load_dotenv() no sobreescribe nada.
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

# Valores de desarrollo por defecto — en producción vienen de la plataforma.
# setdefault no sobreescribe si la variable ya existe en el entorno real.
os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-dev-only-not-for-production')
os.environ.setdefault('DJANGO_DEBUG', 'True')

from .settings_base import *  # noqa: E402
from .settings_local import *  # noqa: E402
