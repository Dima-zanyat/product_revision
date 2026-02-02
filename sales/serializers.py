"""
Serializers для приложения sales.
"""

from rest_framework import serializers
from .models import Location, Sales, Incoming, Inventory, IngredientInventory


class LocationSerializer(serializers.ModelSerializer):
    """Serializer для Location."""

    class Meta:
        model = Location
        fields = ('id', 'title', 'code', 'address', 'created_at')
        read_only_fields = ('created_at',)


class SalesSerializer(serializers.ModelSerializer):
    """Serializer для Sales."""

    product_title = serializers.CharField(
        source='product.title', read_only=True)
    location_title = serializers.CharField(
        source='location.title', read_only=True)

    class Meta:
        model = Sales
        fields = ('id', 'product', 'product_title', 'location', 'location_title',
                  'date', 'quantity', 'moykassir_id', 'created_at')
        read_only_fields = ('created_at',)


class IncomingSerializer(serializers.ModelSerializer):
    """Serializer для Incoming."""

    ingredient_title = serializers.CharField(
        source='ingredient.title', read_only=True)
    unit_display = serializers.CharField(
        source='ingredient.get_unit_display', read_only=True)
    location_title = serializers.CharField(
        source='location.title', read_only=True)

    class Meta:
        model = Incoming
        fields = ('id', 'ingredient', 'ingredient_title', 'location', 'location_title',
                  'date', 'quantity', 'unit_display', 'comment', 'created_at')
        read_only_fields = ('created_at',)


class InventorySerializer(serializers.ModelSerializer):
    """Serializer для Inventory."""

    product_title = serializers.CharField(
        source='product.title', read_only=True)
    location_title = serializers.CharField(
        source='location.title', read_only=True)

    class Meta:
        model = Inventory
        fields = ('id', 'product', 'product_title', 'location', 'location_title',
                  'quantity', 'updated_at')
        read_only_fields = ('updated_at',)


class IngredientInventorySerializer(serializers.ModelSerializer):
    """Serializer для IngredientInventory."""

    ingredient_title = serializers.CharField(
        source='ingredient.title', read_only=True)
    unit_display = serializers.CharField(
        source='ingredient.get_unit_display', read_only=True)
    location_title = serializers.CharField(
        source='location.title', read_only=True)

    class Meta:
        model = IngredientInventory
        fields = ('id', 'ingredient', 'ingredient_title', 'location', 'location_title',
                  'quantity', 'unit_display', 'updated_at')
        read_only_fields = ('updated_at',)
