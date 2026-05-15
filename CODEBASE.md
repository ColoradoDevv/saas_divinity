# SaaS Divinity — Documentación Completa del Proyecto

> **Última actualización**: 2026-05-15 — módulo auth completado  
> Actualizar este archivo cada vez que se agreguen features, cambien modelos, rutas o lógica relevante.

---

## Estructura General

```
saas_divinity/
├── divinity_backend/              # Django REST API (Clean Architecture)
│   ├── application/               # Capa de aplicación (use cases)
│   │   ├── authentication/
│   │   │   ├── dtos.py            # LoginDTO
│   │   │   └── services.py        # AuthService
│   │   └── clients/
│   │       ├── dtos.py            # CreateClientDTO
│   │       └── services.py        # CreateClientService
│   ├── apps/                      # Django apps (capa REST)
│   │   ├── authentication/
│   │   │   ├── apps.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py           # LoginView, MeView
│   │   │   └── urls.py
│   │   └── clients/
│   │       ├── models.py          # ClientModel
│   │       ├── serializers.py
│   │       ├── views.py           # ClientViewSet
│   │       ├── urls.py
│   │       ├── admin.py
│   │       └── migrations/
│   ├── domain/                    # Entidades y reglas de negocio
│   │   ├── authentication/
│   │   │   ├── entities.py        # AuthenticatedUser, TokenPair, AuthSession
│   │   │   └── exceptions.py      # InvalidCredentialsError, UserNotFoundError
│   │   └── clients/
│   │       ├── entities.py        # Client
│   │       └── exceptions.py      # ClientValidationError, ClientAlreadyExistsError
│   ├── infrastructure/            # Acceso a datos y servicios externos
│   │   ├── authentication/
│   │   │   └── jwt.py             # SimpleJWTTokenProvider
│   │   ├── persistence/
│   │   │   ├── repositories.py    # DjangoORMClientRepository
│   │   │   └── user_repositories.py  # DjangoORMUserRepository
│   │   └── notifications/
│   │       └── email_service.py   # EmailNotificationService (mock)
│   ├── interfaces/                # Contratos / interfaces abstractas
│   │   ├── authentication.py      # TokenProviderInterface
│   │   ├── repositories.py        # ClientRepositoryInterface, UserRepositoryInterface
│   │   └── notifications.py       # NotificationServiceInterface
│   ├── divinity_backend/          # Config de Django
│   │   ├── settings.py            # Importa settings_base + settings_local
│   │   ├── settings_base.py       # Configuración base
│   │   ├── settings_local.py      # Overrides locales (DEBUG=True)
│   │   ├── urls.py                # Root URLs
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── manage.py
│   ├── requirements.txt
│   └── db.sqlite3
│
└── divinity_fronted/              # React 19 + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── router/AppRouter.tsx       # React Router 7 config
    │   │   ├── providers/QueryProvider.tsx # TanStack React Query
    │   │   └── store/auth.ts              # Zustand auth store
    │   ├── modules/
    │   │   ├── auth/
    │   │   │   ├── components/PrivateRoute.tsx
    │   │   │   ├── hooks/useAuthBootstrap.ts
    │   │   │   ├── hooks/useAuthMe.ts
    │   │   │   ├── hooks/useLogin.ts
    │   │   │   ├── pages/LoginPage.tsx
    │   │   │   ├── services/authService.ts
    │   │   │   └── types/auth.ts
    │   │   ├── clients/
    │   │   │   ├── components/ClientList.tsx
    │   │   │   ├── hooks/useClients.ts
    │   │   │   ├── pages/ClientsPage.tsx
    │   │   │   ├── services/clientService.ts
    │   │   │   └── types/index.ts
    │   │   └── dashboard/
    │   │       └── pages/DashboardPage.tsx
    │   ├── shared/
    │   │   ├── api/api.ts          # Axios + interceptores JWT
    │   │   ├── layouts/DashboardLayout.tsx
    │   │   ├── types/index.ts      # ApiResponse, PaginatedResponse
    │   │   └── ui/material.ts      # Clases Tailwind Material Design 3
    │   ├── main.tsx
    │   └── index.css
    ├── vite.config.js
    ├── tsconfig.json
    ├── package.json
    └── index.html
```

---

## Backend

### Patrón Arquitectónico: Clean Architecture (Hexagonal)

```
Request -> apps/ (REST) -> application/ (use cases) -> domain/ (entidades)
                    ↑                        ↑
              interfaces/              infrastructure/ (implementaciones)
```

### Configuración Django

**settings_base.py**
- Django 6.0
- Apps instaladas: `corsheaders`, `rest_framework`, `apps.authentication`, `apps.clients`
- JWT: `rest_framework_simplejwt` — access 15min, refresh 7 días, HS256, `ROTATE_REFRESH_TOKENS=True`
- Throttling DRF: `anon=200/h`, `user=1000/h`, scope `login=10/min` (aplicado en `LoginView`)
- CORS: permite `http://localhost:5173`
- DB: SQLite (desarrollo)

**settings_local.py**
- `DEBUG = True`
- `ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']`

### URLs raíz

```
/admin/           -> Django admin
/api/auth/        -> apps.authentication.urls
/api/clients/     -> apps.clients.urls
```

---

## Autenticación

### Endpoints

| Método | URL | Auth | Throttle | Descripción |
|--------|-----|------|----------|-------------|
| POST | `/api/auth/login` | No | `login` 10/min | Login con email + password |
| GET | `/api/auth/me` | Sí | — | Usuario autenticado actual |
| POST | `/api/auth/refresh` | No | — | Renovar access token (devuelve nuevo refresh si `ROTATE_REFRESH_TOKENS=True`) |

### Serializers (`apps/authentication/serializers.py`)

- **LoginSerializer**: `email`, `password` (write_only)
- **AuthenticatedUserSerializer**: `id`, `username`, `email`, `first_name`, `last_name`, `is_active`, `is_staff`, `is_superuser`
- **TokenPairSerializer**: `access`, `refresh` (read_only)
- **AuthSessionSerializer**: `user` (AuthenticatedUserSerializer), `tokens` (TokenPairSerializer)

### Dominio (`domain/authentication/entities.py`)

```python
@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    is_staff: bool
    is_superuser: bool
    def to_primitives() -> dict

@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str
    def to_primitives() -> dict

@dataclass(frozen=True)
class AuthSession:
    user: AuthenticatedUser
    tokens: TokenPair
    def to_primitives() -> dict
```

### Servicio (`application/authentication/services.py`)

```python
class AuthService:
    def __init__(self, user_repository, token_provider)
    def login(dto: LoginDTO) -> AuthSession       # Autentica, crea tokens
    def get_authenticated_user(user_id) -> AuthenticatedUser
```

### Repositorio (`infrastructure/persistence/user_repositories.py`)

```python
class DjangoORMUserRepository(UserRepositoryInterface):
    def authenticate(email, password) -> AuthenticatedUser | None
    def get_by_id(user_id) -> AuthenticatedUser | None
```

### JWT Provider (`infrastructure/authentication/jwt.py`)

```python
class SimpleJWTTokenProvider(TokenProviderInterface):
    def create_token_pair(user: AuthenticatedUser) -> TokenPair
    # Agrega user_id y email al payload del token
```

---

## Clientes

### Modelo (`apps/clients/models.py`)

```python
class ClientModel(models.Model):
    first_name   = CharField(max_length=60)
    last_name    = CharField(max_length=60)
    email        = EmailField(unique=True)
    phone        = CharField(max_length=30, blank=True)
    is_active    = BooleanField(default=True)
    created_at   = DateTimeField(auto_now_add=True)
    updated_at   = DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'client'
        ordering = ['-created_at']
```

### Endpoints

| Método | URL | Auth | Descripción |
|--------|-----|------|-------------|
| GET | `/api/clients/` | Sí | Listar clientes activos (paginado) |
| POST | `/api/clients/` | Sí | Crear cliente |
| GET | `/api/clients/{id}/` | Sí | Obtener cliente |
| PUT | `/api/clients/{id}/` | Sí | Actualizar cliente |
| DELETE | `/api/clients/{id}/` | Sí | Eliminar cliente |

### Serializers (`apps/clients/serializers.py`)

- **CreateClientSerializer**: `first_name`, `last_name`, `email`, `phone` (opcional)
- **ClientReadSerializer**: `id`, `first_name`, `last_name`, `email`, `phone`, `is_active`, `created_at`

### Entidad de dominio (`domain/clients/entities.py`)

```python
@dataclass(frozen=True)
class Client:
    id: int | None
    first_name: str
    last_name: str
    email: str
    phone: str
    is_active: bool
    created_at: datetime
    
    @classmethod
    def create(first_name, last_name, email, phone='') -> Client
    # Validaciones: first_name y last_name no vacíos, email contiene '@'
    
    def to_primitives() -> dict
```

### Servicio (`application/clients/services.py`)

```python
class CreateClientService:
    def __init__(self, client_repository, notification_service)
    def execute(dto: CreateClientDTO) -> Client
    # 1. get_by_email -> si existe: ClientAlreadyExistsError
    # 2. Client.create() -> validación dominio
    # 3. client_repository.save()
    # 4. notification_service.send_client_welcome() (mock)
```

### Repositorio (`infrastructure/persistence/repositories.py`)

```python
class DjangoORMClientRepository(ClientRepositoryInterface):
    def get_by_email(email) -> Client | None
    def save(client) -> Client        # create o update
    def list_active() -> Sequence[Client]
```

### Servicio de notificaciones (`infrastructure/notifications/email_service.py`)

```python
class EmailNotificationService(NotificationServiceInterface):
    def send_client_welcome(client)        # Mock: solo loggea
    def send_account_alert(client, subject, body)  # Mock
```

### DTOs

```python
@dataclass(frozen=True)
class LoginDTO:
    email: str
    password: str

@dataclass(frozen=True)
class CreateClientDTO:
    first_name: str
    last_name: str
    email: str
    phone: str = ''
```

### Excepciones de dominio

```
domain/authentication/exceptions.py:
  - InvalidCredentialsError
  - UserNotFoundError

domain/clients/exceptions.py:
  - ClientValidationError
  - ClientAlreadyExistsError
```

### Interfaces (contratos para DI)

```python
# interfaces/authentication.py
class TokenProviderInterface(ABC):
    @abstractmethod
    def create_token_pair(user: AuthenticatedUser) -> TokenPair

# interfaces/repositories.py
class UserRepositoryInterface(ABC):
    @abstractmethod
    def authenticate(email, password) -> AuthenticatedUser | None
    @abstractmethod
    def get_by_id(user_id) -> AuthenticatedUser | None

class ClientRepositoryInterface(ABC):
    @abstractmethod
    def get_by_email(email) -> Client | None
    @abstractmethod
    def save(client) -> Client
    @abstractmethod
    def list_active() -> Sequence[Client]

# interfaces/notifications.py
class NotificationServiceInterface(ABC):
    @abstractmethod
    def send_client_welcome(client)
    @abstractmethod
    def send_account_alert(client, subject, body)
```

---

## Frontend

### Stack tecnológico

| Librería | Versión | Uso |
|----------|---------|-----|
| React | 19.2.5 | UI |
| React Router DOM | 7.14.2 | Routing |
| Axios | 1.15.2 | HTTP client |
| TanStack React Query | 5.100.5 | Server state |
| Zustand | 5.0.12 | Client state |
| TypeScript | 6.0.3 | Tipado |
| Vite | 8.0.10 | Bundler |
| Tailwind CSS | 4.3.0 | Estilos |

### Routing (`src/app/router/AppRouter.tsx`)

```tsx
/login          -> LoginPage (sin auth)
/               -> redirect a /dashboard
/dashboard      -> DashboardPage    ← protegida por PrivateRoute
/clients        -> ClientsPage      ← protegida
/payments       -> PlaceholderPage  ← protegida (no implementado)
/attendance     -> PlaceholderPage  ← protegida (no implementado)
/reports        -> PlaceholderPage  ← protegida (no implementado)
*               -> redirect a /
```

Rutas protegidas envueltas en `ProtectedLayout` que usa `PrivateRoute` + `DashboardLayout`.

### Zustand Auth Store (`src/app/store/auth.ts`)

```typescript
interface AuthState {
    user: AuthUser | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isBootstrapping: boolean        // no se persiste
    
    setSession(tokens, user?): void
    setUser(user): void
    setBootstrapping(value): void
    clearSession(): void
}
// Persiste en localStorage como 'divinity-auth'
// Al rehidratar: setBootstrapping(true) para validar sesión
```

### Tipos Auth (`src/modules/auth/types/auth.ts`)

```typescript
interface AuthUser {
    id: number; username: string; email: string
    first_name: string; last_name: string
    is_active: boolean; is_staff: boolean; is_superuser: boolean
}
interface AuthTokens { access: string; refresh: string }
interface LoginPayload { email: string; password: string }
interface AuthSessionResponse { user: AuthUser; tokens: AuthTokens }
```

### Tipos Clientes (`src/modules/clients/types/index.ts`)

```typescript
interface Client {
    id: number; name: string; email: string
    phone?: string; address?: string
    created_at: string; updated_at: string
}
interface CreateClientData { name: string; email: string; phone?: string; address?: string }
interface UpdateClientData extends Partial<CreateClientData> { id: number }
```

### Tipos compartidos (`src/shared/types/index.ts`)

```typescript
interface ApiResponse<T> { data: T; message?: string; success: boolean }
interface PaginatedResponse<T> { results: T[]; count: number; next: string|null; previous: string|null }
```

### Configuración Axios (`src/shared/api/api.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const publicApi = axios.create({ baseURL: API_BASE_URL })  // Sin auth
export const api = axios.create({ baseURL: API_BASE_URL })        // Con auth

// Request interceptor: agrega Authorization: Bearer ${accessToken}
// Response interceptor (401):
//   1. Si hay refreshToken: POST /auth/refresh -> nuevos tokens -> retry request
//   2. Si falla refresh: clearSession() + redirect a /login
```

### Hooks de autenticación

**`useAuthBootstrap`** — valida sesión al cargar la app:
```
1. Si no hay tokens: clearSession()
2. Si hay tokens: GET /api/auth/me
   - OK: setUser(), setBootstrapping(false)
   - Error: clearSession()
```

**`useLogin`** — mutación de login:
```
1. POST /api/auth/login -> { user, tokens }
2. setSession(tokens)
3. setUser(session.user)     ← usa el user del response, sin segunda llamada
4. setBootstrapping(false)   ← evita el spinner de carga al navegar al dashboard
```

**`useAuthMe`** — query del usuario actual:
```typescript
useQuery({ queryKey: ['auth', 'me'], queryFn: authService.getCurrentUser, staleTime: 60_000 })
```

### Hooks de clientes (`src/modules/clients/hooks/useClients.ts`)

```typescript
useClients(page, search)  // GET /api/clients/?page=&search=
useCreateClient()         // POST /api/clients/   -> invalida ['clients']
useUpdateClient()         // PUT /api/clients/{id}/ -> invalida ['clients']
useDeleteClient()         // DELETE /api/clients/{id}/ -> invalida ['clients']
```

### Servicios

**`authService`** (`src/modules/auth/services/authService.ts`):
```typescript
login(payload)        // publicApi.post('/auth/login', payload)
getCurrentUser()      // api.get('/auth/me')
```

**`clientService`** (`src/modules/clients/services/clientService.ts`):
```typescript
getClients(page, search)  // api.get('/clients/?page=&search=')
getClient(id)             // api.get('/clients/{id}/')
createClient(data)        // api.post('/clients/', data)
updateClient(data)        // api.put('/clients/{id}/', data)
deleteClient(id)          // api.delete('/clients/{id}/')
```

### Layout (`src/shared/layouts/DashboardLayout.tsx`)

Navegación lateral con:
- Dashboard, Clients, Payments, Attendance, Reports
- Info del usuario (nombre, email)
- Botón "Sign out" → clearSession() + navigate('/login')

Header con mensaje de bienvenida y email del usuario.

### Material Design 3 (`src/shared/ui/material.ts`)

Clases Tailwind exportadas:
- `md3SurfaceClass`, `md3SurfaceHighClass`, `md3CardClass`, `md3CardRaisedClass`
- `md3HeadlineSmallClass`, `md3BodyLargeClass`, `md3LabelLargeClass`, `md3TitleMediumClass`
- `md3FilledButtonClass`, `md3TonalButtonClass`, `md3OutlinedButtonClass`, `md3TextButtonClass`, `md3DestructiveButtonClass`
- `md3TextFieldClass`, `md3InputLabelClass`
- `md3ErrorBannerClass`, `md3SuccessBannerClass`, `md3InfoBannerClass`
- `md3NavItemClass(isActive: boolean)`
- `md3PageClass` — padding estándar para páginas

Colores via CSS variables: `primary`, `secondary`, `error`, `surface`, `background`, `on-surface`, `outline-variant`, etc.

### Vite (`vite.config.js`)

```javascript
plugins: [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })]
resolve: { alias: { '@': './src' } }
```

### Entry point (`src/main.tsx`)

Provider hierarchy:
```
StrictMode -> QueryProvider -> AppRouter
```

---

## Flujos de datos

### Login completo

```
LoginPage form submit
  -> useLogin.mutateAsync(payload)
  -> authService.login() -> POST /api/auth/login
  -> Backend: LoginView -> AuthService.login() -> DjangoORMUserRepository.authenticate()
            -> SimpleJWTTokenProvider.create_token_pair() -> AuthSession
  -> Frontend recibe { user, tokens }
  -> setSession(tokens) -> Zustand + localStorage
  -> authService.getCurrentUser() -> GET /api/auth/me
  -> setUser(user) -> Zustand
  -> navigate('/dashboard')
```

### Restauración de sesión (page load)

```
PrivateRoute mounted
  -> useAuthBootstrap()
  -> ¿hay accessToken + refreshToken en store?
     NO: clearSession() -> redirect /login
     SÍ: GET /api/auth/me
         OK: setUser(), setBootstrapping(false) -> muestra contenido
         Error: clearSession() -> redirect /login
```

### Refresh automático de token

```
api.interceptors.response (401)
  -> ¿tiene refreshToken?
     SÍ: POST /api/auth/refresh { refresh }
         OK: setSession(newTokens), retry request original
         Error: clearSession(), window.location = '/login'
```

### Logout

```
DashboardLayout "Sign out" click
  -> clearSession() -> limpia Zustand + localStorage
  -> navigate('/login')
```

### Crear cliente

```
ClientsPage form submit
  -> useCreateClient.mutateAsync(data)
  -> clientService.createClient(data) -> POST /api/clients/
  -> Backend: ClientViewSet.create() -> CreateClientService.execute()
            -> get_by_email() -> si existe: ClientAlreadyExistsError
            -> Client.create() (validación dominio)
            -> DjangoORMClientRepository.save()
            -> EmailNotificationService.send_client_welcome() (mock)
  -> Frontend: queryClient.invalidateQueries(['clients']) -> refetch lista
```

### Eliminar cliente (con confirmación)

```
ClientList "Eliminar" click -> setConfirmingId(id) -> muestra botones confirmar/cancelar
"Confirmar borrado" click
  -> deleteClientMutation.mutateAsync(id)
  -> clientService.deleteClient(id) -> DELETE /api/clients/{id}/
  -> queryClient.invalidateQueries(['clients'])
  -> feedback: "Cliente eliminado exitosamente"
```

---

## Pendientes / No implementado

| Feature | Estado |
|---------|--------|
| Crear cliente (UI modal/form) | Botón existe, UI pendiente |
| Editar cliente (UI modal/form) | Botón existe, UI pendiente |
| Módulo Payments | Placeholder |
| Módulo Attendance | Placeholder |
| Módulo Reports | Placeholder |
| Email Service real | Mocked (solo loggea) |
| Password Reset | No implementado |
| Search filtering backend | Servicio listo, UI pendiente |

---

## Dependencias Backend (`requirements.txt`)

```
Django>=6.0,<7.0
djangorestframework>=3.14
djangorestframework-simplejwt>=5.5,<6.0
django-cors-headers>=4.9,<5.0
```

## Dependencias Frontend (`package.json`)

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.100.5",
    "@tanstack/react-query-devtools": "^5.100.5",
    "axios": "^1.15.2",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.14.2",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@rolldown/plugin-babel": "...",
    "@tailwindcss/vite": "^4.3.0",
    "@vitejs/plugin-react": "^6.0.1",
    "tailwindcss": "^4.3.0",
    "typescript": "^6.0.3",
    "vite": "^8.0.10"
  }
}
```
