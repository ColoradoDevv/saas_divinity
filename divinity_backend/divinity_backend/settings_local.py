import os

# Proveer valores de desarrollo antes de que settings_base los lea desde el entorno.
# En producción estas líneas nunca se cargan; las vars vienen de la plataforma (Railway, Heroku, etc.)
os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-dev-only-not-for-production')
os.environ.setdefault('DJANGO_DEBUG', 'True')

from .settings_base import *  # noqa: E402

DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
