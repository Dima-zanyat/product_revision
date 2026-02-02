"""ViewSets для REST API приложения products."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Product, Ingredient
from .serializers import ProductSerializer, IngredientSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для продуктов (только чтение)."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ('title', 'description')
    ordering_fields = ('title', 'created_at')
    ordering = ['title']


class IngredientViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для ингредиентов (только чтение)."""

    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ('title',)
    ordering_fields = ('title', 'created_at')
    ordering = ['title']
