from rest_framework import serializers

from domain.billing.duration import VALID_DURATION_UNITS

_METHOD_CHOICES = ['cash', 'card', 'transfer', 'other']


# ------------------------------------------------------------------ #
# Plan serializers                                                     #
# ------------------------------------------------------------------ #

class PlanReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    duration_value = serializers.IntegerField(read_only=True)
    duration_unit = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)


class PlanWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    duration_value = serializers.IntegerField(min_value=1, default=1)
    duration_unit = serializers.ChoiceField(choices=sorted(VALID_DURATION_UNITS), default='month')


class PlanUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    duration_value = serializers.IntegerField(min_value=1, required=False)
    duration_unit = serializers.ChoiceField(choices=sorted(VALID_DURATION_UNITS), required=False)
    is_active = serializers.BooleanField(required=False)


# ------------------------------------------------------------------ #
# Subscription serializers                                            #
# ------------------------------------------------------------------ #

class SubscriptionReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    member_id = serializers.IntegerField(read_only=True)
    member_name = serializers.CharField(read_only=True)
    plan_id = serializers.IntegerField(read_only=True)
    plan_name = serializers.CharField(read_only=True)
    start_date = serializers.CharField(read_only=True)
    end_date = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    frozen_since = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.CharField(read_only=True, allow_null=True)


class RenewMembershipSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    plan_id = serializers.IntegerField()
    method = serializers.ChoiceField(choices=_METHOD_CHOICES, default='cash')
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    paid_at = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


# ------------------------------------------------------------------ #
# Payment serializer                                                   #
# ------------------------------------------------------------------ #

class PaymentReadSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    member_id = serializers.IntegerField(read_only=True)
    member_name = serializers.CharField(read_only=True)
    subscription_id = serializers.IntegerField(read_only=True, allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    method = serializers.CharField(read_only=True)
    paid_at = serializers.CharField(read_only=True)
    notes = serializers.CharField(read_only=True, allow_blank=True)
    registered_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    registered_by_name = serializers.CharField(read_only=True, allow_blank=True)
    created_at = serializers.CharField(read_only=True, allow_null=True)
