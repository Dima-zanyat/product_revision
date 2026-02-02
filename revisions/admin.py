"""
Admin интерфейс для приложения revisions.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Revision, RevisionProductItem, RevisionIngredientItem, RevisionReport
from .services import RevisionCalculator


@admin.register(Revision)
class RevisionAdmin(admin.ModelAdmin):
    """Admin для ревизий."""

    list_display = ('id', 'location', 'revision_date',
                    'status_badge', 'author', 'created_at')
    list_filter = ('status', 'location', 'revision_date')
    search_fields = ('location__title', 'author__username')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'revision_date'

    fieldsets = (
        ('Основная информация', {
            'fields': ('location', 'revision_date', 'author', 'status')
        }),
        ('Комментарии', {
            'fields': ('comments',),
            'classes': ('collapse',)
        }),
        ('Сроки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['calculate_revision']

    def status_badge(self, obj):
        """Выводить статус с цветными бейджами."""
        colors = {
            'draft': '#FFA500',  # Оранжевый
            'submitted': '#87CEEB',  # Голубой
            'processing': '#FFD700',  # Золотой
            'completed': '#90EE90',  # Зелёный
        }
        color = colors.get(obj.status, '#808080')
        return format_html(
            '<span style="background-color: {}; padding: 3px 10px; border-radius: 3px; color: white;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Статус'

    def calculate_revision(self, request, queryset):
        """Action для расчета ревизии."""
        count = 0
        for revision in queryset:
            if revision.status == 'draft':
                calculator = RevisionCalculator(revision)
                result = calculator.calculate_all()
                if result['status'] == 'success':
                    revision.status = 'completed'
                    revision.save()
                    calculator.update_inventory()
                    count += 1

        self.message_user(request, f'Рассчитано {count} ревизий')

    calculate_revision.short_description = 'Расчитать выбранные ревизии'


@admin.register(RevisionProductItem)
class RevisionProductItemAdmin(admin.ModelAdmin):
    """Admin для остатков продуктов в ревизии."""

    list_display = ('revision', 'product', 'actual_quantity', 'created_at')
    list_filter = ('revision__location', 'created_at')
    search_fields = ('product__title', 'revision__location__title')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('revision', 'product', 'actual_quantity')
        }),
        ('Комментарии', {
            'fields': ('comments',),
            'classes': ('collapse',)
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(RevisionIngredientItem)
class RevisionIngredientItemAdmin(admin.ModelAdmin):
    """Admin для остатков ингредиентов в ревизии."""

    list_display = ('revision', 'ingredient',
                    'actual_quantity', 'get_unit', 'created_at')
    list_filter = ('revision__location', 'created_at')
    search_fields = ('ingredient__title', 'revision__location__title')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Информация', {
            'fields': ('revision', 'ingredient', 'actual_quantity')
        }),
        ('Комментарии', {
            'fields': ('comments',),
            'classes': ('collapse',)
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def get_unit(self, obj):
        """Показать единицу измерения ингредиента."""
        return obj.ingredient.get_unit_display()
    get_unit.short_description = 'Ед.изм.'


@admin.register(RevisionReport)
class RevisionReportAdmin(admin.ModelAdmin):
    """Admin для отчетов по ревизии."""

    list_display = ('revision', 'ingredient', 'expected_quantity', 'actual_quantity',
                    'difference_display', 'percentage', 'status_badge')
    list_filter = ('status', 'revision__location', 'revision__revision_date')
    search_fields = ('ingredient__title', 'revision__location__title')
    readonly_fields = ('created_at', 'difference', 'percentage')

    fieldsets = (
        ('Информация', {
            'fields': ('revision', 'ingredient')
        }),
        ('Остатки', {
            'fields': ('expected_quantity', 'actual_quantity', 'difference', 'percentage')
        }),
        ('Статус', {
            'fields': ('status',)
        }),
        ('Сроки', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def difference_display(self, obj):
        """Показать разницу с цветом."""
        if obj.difference < 0:
            color = 'red'  # Недостача
            icon = '❌'
        elif obj.difference > 0:
            color = 'blue'  # Излишек
            icon = '⚠️'
        else:
            color = 'green'  # Норма
            icon = '✅'

        return format_html(
            '<span style="color: {};">{} {}</span>',
            color,
            icon,
            obj.difference
        )
    difference_display.short_description = 'Разница'

    def status_badge(self, obj):
        """Выводить статус с цветными бейджами."""
        colors = {
            'ok': '#90EE90',  # Зелёный
            'warning': '#FFD700',  # Золотой
            'critical': '#FF6B6B',  # Красный
        }
        color = colors.get(obj.status, '#808080')
        return format_html(
            '<span style="background-color: {}; padding: 3px 10px; border-radius: 3px; color: white;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Статус'
