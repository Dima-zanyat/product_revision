"""ViewSets для REST API приложения sales."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Location
from .serializers import LocationSerializer


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для локаций (только чтение)."""

    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ('title', 'code', 'address')
    ordering_fields = ('title', 'created_at')
    ordering = ['title']
