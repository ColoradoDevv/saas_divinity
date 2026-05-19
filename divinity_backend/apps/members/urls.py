from django.urls import path

from .views import CustomFieldViewSet, FieldConfigViewSet, MemberViewSet

# /api/members/
member_list = MemberViewSet.as_view({'get': 'list', 'post': 'create'})
member_detail = MemberViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'update', 'delete': 'destroy'})

# /api/members/field-config/
field_config_list = FieldConfigViewSet.as_view({'get': 'list'})
field_config_bulk = FieldConfigViewSet.as_view({'post': 'bulk_update'})
field_config_detail = FieldConfigViewSet.as_view({'put': 'update', 'patch': 'update'})

# /api/members/custom-fields/
custom_field_list = CustomFieldViewSet.as_view({'get': 'list', 'post': 'create'})
custom_field_detail = CustomFieldViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'update',
    'delete': 'destroy',
})

urlpatterns = [
    path('', member_list, name='member-list'),
    path('<int:pk>/', member_detail, name='member-detail'),
    path('field-config/', field_config_list, name='field-config-list'),
    path('field-config/bulk/', field_config_bulk, name='field-config-bulk'),
    path('field-config/<str:pk>/', field_config_detail, name='field-config-detail'),
    path('custom-fields/', custom_field_list, name='custom-field-list'),
    path('custom-fields/<int:pk>/', custom_field_detail, name='custom-field-detail'),
]
