"""ViewSets для управления пользователями и производствами."""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Production
from .serializers import UserSerializer, ProductionSerializer

User = get_user_model()


class ProductionViewSet(viewsets.ModelViewSet):
    """ViewSet для производств."""

    queryset = Production.objects.all()
    serializer_class = ProductionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return super().get_queryset()
        if getattr(user, 'production_id', None):
            return super().get_queryset().filter(id=user.production_id)
        return super().get_queryset().none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Недостаточно прав для создания производства'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Недостаточно прав для удаления производства'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if not user.is_superuser and instance.id != getattr(user, 'production_id', None):
            return Response(
                {'error': 'Недостаточно прав для изменения производства'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet для пользователей (кабинет менеджера)."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return super().get_queryset()
        if getattr(user, 'role', None) == 'manager':
            return super().get_queryset().filter(Q(created_by=user) | Q(id=user.id))
        return super().get_queryset().none()

    def create(self, request, *args, **kwargs):
        user = request.user
        data_role = request.data.get('role')

        if user.is_superuser:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            production_id = request.data.get('production')
            production = None
            if production_id:
                try:
                    production = Production.objects.get(id=production_id)
                except Production.DoesNotExist:
                    return Response(
                        {'error': 'Производство не найдено'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            serializer.save(production=production, created_by=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        if getattr(user, 'role', None) != 'manager':
            return Response(
                {'error': 'Недостаточно прав для создания пользователей'},
                status=status.HTTP_403_FORBIDDEN
            )

        if data_role not in ['staff', 'accounting']:
            return Response(
                {'error': 'Менеджер может создавать только staff и accounting'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not getattr(user, 'production_id', None):
            return Response(
                {'error': 'Менеджер не привязан к производству'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(production=user.production, created_by=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _check_update_permissions(self, request, instance):
        user = request.user

        if not user.is_superuser:
            if getattr(user, 'role', None) != 'manager':
                return Response(
                    {'error': 'Недостаточно прав для изменения пользователей'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if instance != user and instance.created_by != user:
                return Response(
                    {'error': 'Можно изменять только своих пользователей'},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Запрещаем менеджеру менять роль
            if 'role' in request.data and request.data.get('role') != instance.role:
                return Response(
                    {'error': 'Менеджер не может менять роли'},
                    status=status.HTTP_403_FORBIDDEN
                )

        return None

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        denied = self._check_update_permissions(request, instance)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        denied = self._check_update_permissions(request, instance)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()

        if user.is_superuser:
            return super().destroy(request, *args, **kwargs)

        if getattr(user, 'role', None) != 'manager':
            return Response(
                {'error': 'Недостаточно прав для удаления пользователей'},
                status=status.HTTP_403_FORBIDDEN
            )

        if instance == user:
            return Response(
                {'error': 'Нельзя удалить самого себя'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if instance.created_by != user:
            return Response(
                {'error': 'Можно удалять только своих пользователей'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(request, *args, **kwargs)
