"""
Admin интерфейс для приложения products.
"""

from django.contrib import admin
from .models import Ingredient, Product, Recipe, RecipeItem


class RecipeItemInline(admin.TabularInline):
    """Inline для элементов рецепта продукта."""

    model = RecipeItem
    extra = 1
    fields = ('ingredient', 'quantity')
    autocomplete_fields = ('ingredient',)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Admin для ингредиентов."""

    list_display = ('id', 'title', 'unit', 'production', 'created_at')
    list_filter = ('unit', 'production', 'created_at')
    search_fields = ('title',)
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('title', 'unit', 'production')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin для продуктов."""

    list_display = ('id', 'title', 'production', 'recipe_count', 'created_at')
    list_filter = ('production', 'created_at')
    list_display_links = ('id', 'title')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at',)
    inlines = [RecipeItemInline]

    fieldsets = (
        ('Информация', {
            'fields': ('title', 'description', 'production')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    @admin.display(description='Ингредиентов в рецепте')
    def recipe_count(self, obj):
        """Показать количество ингредиентов в рецепте."""
        return obj.recipe_items.count()


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    """
    Отдельная вкладка "Рецепты": выбираешь продукт и добавляешь несколько ингредиентов.

    Технически это тот же Product (proxy), но в админке отображается как "Рецепты".
    """

    list_display = ('id', 'title', 'recipe_count', 'created_at')
    list_display_links = ('id', 'title')
    list_filter = ('created_at',)
    search_fields = ('title', 'description')
    readonly_fields = ('created_at',)
    inlines = [RecipeItemInline]

    fieldsets = (
        ('Продукт', {
            'fields': ('title', 'description', 'production')
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    @admin.display(description='Ингредиентов в рецепте')
    def recipe_count(self, obj):
        """Показать количество ингредиентов в рецепте."""
        return obj.recipe_items.count()
