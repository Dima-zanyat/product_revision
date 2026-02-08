"""ViewSets для REST API приложения products."""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import ValidationError
from .models import Product, Ingredient, RecipeItem
from .serializers import ProductSerializer, IngredientSerializer, RecipeItemSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet для продуктов."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('title', 'description')
    ordering_fields = ('title', 'created_at')
    ordering = ['title']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if getattr(user, 'production_id', None):
            return queryset.filter(production_id=user.production_id)
        return queryset.none()

    def _deny_staff(self, request):
        user = request.user
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для изменения продуктов'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, 'production_id', None) and not user.is_superuser:
            raise ValidationError('Пользователь не привязан к производству')
        production = getattr(user, 'production', None)
        serializer.save(production=production)

    def create(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)


class IngredientViewSet(viewsets.ModelViewSet):
    """ViewSet для ингредиентов."""

    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('title',)
    ordering_fields = ('title', 'created_at')
    ordering = ['title']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if getattr(user, 'production_id', None):
            return queryset.filter(production_id=user.production_id)
        return queryset.none()

    def _deny_staff(self, request):
        user = request.user
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для изменения позиций номенкулатуры'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, 'production_id', None) and not user.is_superuser:
            raise ValidationError('Пользователь не привязан к производству')
        production = getattr(user, 'production', None)
        serializer.save(production=production)

    def create(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)


class RecipeItemViewSet(viewsets.ModelViewSet):
    """ViewSet для технологических карт (строк рецепта)."""

    queryset = RecipeItem.objects.all()
    serializer_class = RecipeItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('product__title', 'ingredient__title')
    ordering_fields = ('created_at',)
    ordering = ['created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(product__production_id=user.production_id)
            else:
                return queryset.none()
        params = self.request.query_params

        product = params.get('product')
        if product:
            queryset = queryset.filter(product=product)

        ingredient = params.get('ingredient')
        if ingredient:
            queryset = queryset.filter(ingredient=ingredient)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data.get('product') or getattr(serializer.instance, 'product', None)
        ingredient = serializer.validated_data.get('ingredient') or getattr(serializer.instance, 'ingredient', None)
        if not product or not ingredient:
            raise ValidationError('Не указан продукт или ингредиент')
        if not user.is_superuser:
            if not getattr(user, 'production_id', None):
                raise ValidationError('Пользователь не привязан к производству')
            if product.production_id != user.production_id or ingredient.production_id != user.production_id:
                raise ValidationError('Продукт и номенкулатура должны принадлежать вашему производству')
        if product.production_id != ingredient.production_id:
            raise ValidationError('Продукт и номенкулатура должны быть из одного производства')
        serializer.save()

    def perform_update(self, serializer):
        self.perform_create(serializer)

    def _deny_staff(self, request):
        user = request.user
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для изменения технологической карты'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def create(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._deny_staff(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)
