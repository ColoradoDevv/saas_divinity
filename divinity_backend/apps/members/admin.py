from django.contrib import admin

from .models import (
    MemberCustomFieldModel,
    MemberCustomFieldValueModel,
    MemberFieldConfigModel,
    MemberModel,
    MemberStandardFieldValueModel,
)

admin.site.register(MemberModel)
admin.site.register(MemberFieldConfigModel)
admin.site.register(MemberCustomFieldModel)
admin.site.register(MemberCustomFieldValueModel)
admin.site.register(MemberStandardFieldValueModel)
