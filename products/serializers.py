"""
Serializers для приложения products.
"""

from rest_framework import serializers
from .models import Ingredient, Product, RecipeItem


class IngredientSerializer(serializers.ModelSerializer):
    """Serializer для Ingredient."""

    unit_display = serializers.CharField(
        source='get_unit_display', read_only=True)

    class Meta:
        model = Ingredient
        fields = ('id', 'title', 'unit', 'unit_display', 'created_at')
        read_only_fields = ('created_at',)


class RecipeItemSerializer(serializers.ModelSerializer):
    """Serializer для RecipeItem."""

    product_title = serializers.CharField(
        source='product.title', read_only=True)
    ingredient_title = serializers.CharField(
        source='ingredient.title', read_only=True)
    unit_display = serializers.CharField(
        source='ingredient.get_unit_display', read_only=True)

    class Meta:
        model = RecipeItem
        fields = ('id', 'product', 'product_title', 'ingredient', 'ingredient_title',
                  'quantity', 'unit_display', 'created_at')
        read_only_fields = ('created_at',)


class ProductSerializer(serializers.ModelSerializer):
    """Serializer для Product."""

    recipe_items = RecipeItemSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'title', 'description', 'recipe_items', 'created_at')
        read_only_fields = ('created_at',)


class ProductDetailSerializer(serializers.ModelSerializer):
    """Детальный serializer для Product с рецептом."""

    recipe_items = RecipeItemSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'title', 'description', 'recipe_items', 'created_at')
        read_only_fields = ('created_at',)
