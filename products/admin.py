"""
Admin интерфейс для приложения products.
"""

from django.contrib import admin
from .models import Ingredient, Product, RecipeItem


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Admin для ингредиентов."""

    list_display = ('id', 'title', 'unit', 'created_at')
    list_filter = ('unit', 'created_at')
    search_fields = ('title',)
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('title', 'unit')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin для продуктов."""

    list_display = ('id', 'title', 'recipe_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'description')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('title', 'description')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def recipe_count(self, obj):
        """Показать количество ингредиентов в рецепте."""
        return obj.recipe_items.count()
    recipe_count.short_description = 'Ингредиентов в рецепте'


class RecipeItemInline(admin.TabularInline):
    """Inline для элементов рецепта."""

    model = RecipeItem
    extra = 1
    fields = ('ingredient', 'quantity')


@admin.register(RecipeItem)
class RecipeItemAdmin(admin.ModelAdmin):
    """Admin для рецептов."""

    list_display = ('product', 'ingredient', 'quantity', 'get_unit')
    list_filter = ('product', 'ingredient__unit')
    search_fields = ('product__title', 'ingredient__title')
    inlines = [RecipeItemInline]
    fieldsets = (
        ('Информация', {
            'fields': ('product', 'ingredient', 'quantity')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ('created_at',)

    def get_unit(self, obj):
        """Показать единицу измерения."""
        return obj.ingredient.get_unit_display()
    get_unit.short_description = 'Ед.изм.'
