"""
Emisión de tokens para el portal de autoservicio del miembro.

Deliberadamente NO usa SimpleJWTTokenProvider: ese token lleva `user_id` y
`role`, los claims que el resto del backend usa (vía JWTAuthentication de
DRF) para resolver request.user y decidir permisos. Un token del portal
lleva member_id/organization_id/kind='member_portal' y nada más — así
ningún endpoint existente puede autenticarlo por accidente (les falta el
claim que necesitan), sin tener que auditar cada vista una por una.

Nota: el claim propio se llama "kind", no "token_type" — ese nombre ya lo
usa internamente rest_framework_simplejwt para distinguir access/refresh,
y sobrescribirlo rompe la validación interna del token (levanta
TokenError "Token has wrong type" al decodificarlo).
"""

from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import MemberModel
from domain.authentication.entities import TokenPair

MEMBER_PORTAL_TOKEN_KIND = 'member_portal'


class MemberPortalTokenProvider:
    def create_token_pair(self, member: MemberModel) -> TokenPair:
        refresh = RefreshToken()
        refresh['member_id'] = member.id
        refresh['organization_id'] = member.organization_id
        refresh['kind'] = MEMBER_PORTAL_TOKEN_KIND

        access = refresh.access_token
        access['member_id'] = member.id
        access['organization_id'] = member.organization_id
        access['kind'] = MEMBER_PORTAL_TOKEN_KIND

        return TokenPair(access=str(access), refresh=str(refresh))
