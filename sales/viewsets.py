"""ViewSets для REST API приложения sales."""

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
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

    def _forbid_staff(self, request):
        user = request.user
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для изменения поступлений'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def create(self, request, *args, **kwargs):
        forbidden = self._forbid_staff(request)
        if forbidden:
            return forbidden
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        forbidden = self._forbid_staff(request)
        if forbidden:
            return forbidden
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        forbidden = self._forbid_staff(request)
        if forbidden:
            return forbidden
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        forbidden = self._forbid_staff(request)
        if forbidden:
            return forbidden
        return super().destroy(request, *args, **kwargs)
