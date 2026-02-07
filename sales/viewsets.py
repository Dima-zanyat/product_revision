"""ViewSets для REST API приложения sales."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
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
