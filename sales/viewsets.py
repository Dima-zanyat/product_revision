"""ViewSets для REST API приложения sales."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import Location, Incoming
from .serializers import LocationSerializer, IncomingSerializer


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для локаций (только чтение)."""

    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ('title', 'code', 'address')
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


class IncomingViewSet(viewsets.ModelViewSet):
    """ViewSet для поступлений ингредиентов."""

    queryset = Incoming.objects.all()
    serializer_class = IncomingSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ('ingredient__title', 'location__title')
    ordering_fields = ('date', 'created_at')
    ordering = ['-date']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(location__production_id=user.production_id)
            else:
                return queryset.none()
        params = self.request.query_params

        location = params.get('location')
        if location:
            queryset = queryset.filter(location=location)

        date = params.get('date')
        if date:
            queryset = queryset.filter(date=date)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def _validate_production(self, request, serializer):
        user = request.user
        if user.is_superuser:
            return
        if not getattr(user, 'production_id', None):
            raise ValidationError('Пользователь не привязан к производству')
        ingredient = serializer.validated_data.get('ingredient')
        location = serializer.validated_data.get('location')
        if not ingredient or not location:
            raise ValidationError('Не указан ингредиент или точка')
        if location.production_id != user.production_id or ingredient.production_id != user.production_id:
            raise ValidationError('Поступление должно относиться к вашему производству')

    def perform_create(self, serializer):
        self._validate_production(self.request, serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_production(self.request, serializer)
        serializer.save()
