"""
Serializers для приложения revisions.
"""

from datetime import timedelta
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Revision, RevisionProductItem, RevisionIngredientItem, RevisionReport
 

class RevisionSerializer(serializers.ModelSerializer):
    """Serializer для Revision."""

    location_title = serializers.CharField(
        source='location.title', read_only=True)
    author_username = serializers.CharField(
        source='author.username', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)

    class Meta:
        model = Revision
        fields = ('id', 'location', 'location_title', 'author', 'author_username',
                  'revision_date', 'status', 'status_display', 'comments',
                  'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

    def validate_location(self, value):
        request = self.context.get('request')
        if request is None:
            return value
        user = request.user
        if user.is_superuser:
            return value
        if not getattr(user, 'production_id', None):
            raise ValidationError('Пользователь не привязан к производству')
        if value.production_id != user.production_id:
            raise ValidationError('Точка производства относится к другому производству')
        return value


class RevisionProductItemSerializer(serializers.ModelSerializer):
    """Serializer для RevisionProductItem."""

    product_title = serializers.CharField(
        source='product.title', read_only=True)

    class Meta:
        model = RevisionProductItem
        fields = ('id', 'revision', 'product', 'product_title',
                  'actual_quantity', 'comments', 'created_at')
        read_only_fields = ('created_at',)

    def validate(self, attrs):
        revision = attrs.get('revision') or getattr(self.instance, 'revision', None)
        product = attrs.get('product') or getattr(self.instance, 'product', None)
        if revision and product:
            if revision.location.production_id and product.production_id != revision.location.production_id:
                raise ValidationError('Продукт должен принадлежать тому же производству, что и ревизия')
        return attrs


class RevisionIngredientItemSerializer(serializers.ModelSerializer):
    """Serializer для RevisionIngredientItem."""

    ingredient_title = serializers.CharField(
        source='ingredient.title', read_only=True)
    unit_display = serializers.CharField(
        source='ingredient.get_unit_display', read_only=True)

    class Meta:
        model = RevisionIngredientItem
        fields = ('id', 'revision', 'ingredient', 'ingredient_title',
                  'actual_quantity', 'unit_display', 'comments', 'created_at')
        read_only_fields = ('created_at',)

    def validate(self, attrs):
        revision = attrs.get('revision') or getattr(self.instance, 'revision', None)
        ingredient = attrs.get('ingredient') or getattr(self.instance, 'ingredient', None)
        if revision and ingredient:
            if revision.location.production_id and ingredient.production_id != revision.location.production_id:
                raise ValidationError('Позиция номенкулатуры должна принадлежать тому же производству, что и ревизия')
        return attrs


class RevisionReportSerializer(serializers.ModelSerializer):
    """Serializer для RevisionReport."""

    ingredient_title = serializers.CharField(
        source='ingredient.title', read_only=True)
    unit_display = serializers.CharField(
        source='ingredient.get_unit_display', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)

    class Meta:
        model = RevisionReport
        fields = ('id', 'revision', 'ingredient', 'ingredient_title', 'unit_display',
                  'expected_quantity', 'actual_quantity', 'difference',
                  'percentage', 'status', 'status_display', 'created_at')
        read_only_fields = ('created_at', 'difference', 'percentage')


class RevisionDetailSerializer(serializers.ModelSerializer):
    """Детальный serializer для Revision с элементами и отчетами."""

    location_title = serializers.CharField(
        source='location.title', read_only=True)
    author_username = serializers.CharField(
        source='author.username', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)
    product_items = RevisionProductItemSerializer(many=True, read_only=True)
    ingredient_items = RevisionIngredientItemSerializer(
        many=True, read_only=True)
    reports = RevisionReportSerializer(many=True, read_only=True)
    previous_revision_date = serializers.SerializerMethodField()
    period_start_date = serializers.SerializerMethodField()

    class Meta:
        model = Revision
        fields = ('id', 'location', 'location_title', 'author', 'author_username',
                  'revision_date', 'status', 'status_display', 'comments',
                  'product_items', 'ingredient_items', 'reports',
                  'previous_revision_date', 'period_start_date',
                  'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

    def _get_previous_revision(self, obj):
        return Revision.objects.filter(
            location=obj.location,
            revision_date__lt=obj.revision_date,
            status='completed'
        ).order_by('-revision_date').first()

    def get_previous_revision_date(self, obj):
        previous = self._get_previous_revision(obj)
        return previous.revision_date if previous else None

    def get_period_start_date(self, obj):
        previous = self._get_previous_revision(obj)
        if previous:
            return previous.revision_date + timedelta(days=1)
        return obj.revision_date.replace(day=1)
