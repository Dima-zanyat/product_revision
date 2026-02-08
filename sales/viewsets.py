"""ViewSets для REST API приложения sales."""

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Location, Incoming
from .serializers import LocationSerializer, IncomingSerializer


class LocationViewSet(viewsets.ModelViewSet):
    """ViewSet для локаций."""

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

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_superuser and getattr(user, 'role', None) != 'manager':
            return Response(
                {'error': 'Недостаточно прав для создания точки'},
                status=status.HTTP_403_FORBIDDEN
            )
        if not user.is_superuser and not getattr(user, 'production_id', None):
            return Response(
                {'error': 'Менеджер не привязан к производству'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if user.is_superuser:
            serializer.save()
        else:
            serializer.save(production=user.production)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _check_location_access(self, user, location):
        if user.is_superuser:
            return None
        if getattr(user, 'role', None) != 'manager':
            return Response(
                {'error': 'Недостаточно прав для изменения точки'},
                status=status.HTTP_403_FORBIDDEN
            )
        if not getattr(user, 'production_id', None):
            return Response(
                {'error': 'Менеджер не привязан к производству'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if location.production_id != user.production_id:
            return Response(
                {'error': 'Точка относится к другому производству'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        denied = self._check_location_access(request.user, instance)
        if denied:
            return denied

        data = request.data.copy()
        if not request.user.is_superuser:
            data['production'] = request.user.production_id
        serializer = self.get_serializer(instance, data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        denied = self._check_location_access(request.user, instance)
        if denied:
            return denied

        data = request.data.copy()
        if not request.user.is_superuser:
            data['production'] = request.user.production_id
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        denied = self._check_location_access(request.user, instance)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)


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
