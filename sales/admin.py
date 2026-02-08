"""
Admin интерфейс для приложения sales.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Location, Sales, Incoming, Inventory, IngredientInventory


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """Admin для точек производства."""

    list_display = ('id', 'title', 'production', 'code', 'address', 'created_at')
    list_filter = ('production', 'created_at')
    search_fields = ('title', 'code', 'address')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('title', 'production', 'code', 'address')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Sales)
class SalesAdmin(admin.ModelAdmin):
    """Admin для продаж."""

    list_display = ('id', 'product', 'location',
                    'date', 'quantity', 'created_at')
    list_filter = ('location', 'date', 'product')
    search_fields = ('product__title', 'location__title')
    readonly_fields = ('created_at',)
    date_hierarchy = 'date'

    fieldsets = (
        ('Информация', {
            'fields': ('product', 'location', 'date', 'quantity')
        }),
        ('МойКассир', {
            'fields': ('moykassir_id',),
            'classes': ('collapse',)
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Incoming)
class IncomingAdmin(admin.ModelAdmin):
    """Admin для поступлений ингредиентов."""

    list_display = ('id', 'ingredient', 'location', 'date',
                    'quantity_display', 'created_at')
    list_filter = ('location', 'date', 'ingredient')
    search_fields = ('ingredient__title', 'location__title')
    readonly_fields = ('created_at',)
    date_hierarchy = 'date'

    fieldsets = (
        ('Информация', {
            'fields': ('ingredient', 'location', 'date', 'quantity')
        }),
        ('Комментарии', {
            'fields': ('comment',),
            'classes': ('collapse',)
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def quantity_display(self, obj):
        """Показать количество с единицей измерения."""
        return f"{obj.quantity} {obj.ingredient.get_unit_display()}"
    quantity_display.short_description = 'Количество'


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    """Admin для остатков продуктов."""

    list_display = ('product', 'location', 'quantity', 'updated_at')
    list_filter = ('location', 'updated_at')
    search_fields = ('product__title', 'location__title')
    readonly_fields = ('updated_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('product', 'location', 'quantity')
        }),
        ('Сроки', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(IngredientInventory)
class IngredientInventoryAdmin(admin.ModelAdmin):
    """Admin для остатков ингредиентов."""

    list_display = ('ingredient', 'location', 'quantity_display', 'updated_at')
    list_filter = ('location', 'updated_at')
    search_fields = ('ingredient__title', 'location__title')
    readonly_fields = ('updated_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('ingredient', 'location', 'quantity')
        }),
        ('Сроки', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )

    def quantity_display(self, obj):
        """Показать количество с единицей измерения."""
        return f"{obj.quantity} {obj.ingredient.get_unit_display()}"
    quantity_display.short_description = 'Количество'
