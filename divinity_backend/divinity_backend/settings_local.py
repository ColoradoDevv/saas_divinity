from .settings_base import *

DEBUG = True
# IP de LAN agregada para poder acceder desde otro dispositivo en la misma red
# durante desarrollo (ver también vite.config.js `server.host` y el .env del
# frontend con VITE_API_BASE_URL apuntando a esta misma IP).
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver', '192.168.1.10']

CORS_ALLOWED_ORIGINS += [
    'http://192.168.1.10:5173',
]
