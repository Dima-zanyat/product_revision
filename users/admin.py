"""
Admin интерфейс для приложения users.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Production


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin для пользователей."""

    list_display = ('id', 'username', 'email', 'role', 'production', 'created_by',
                    'is_active', 'date_joined')
    list_filter = ('role', 'production', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Роль', {
            'fields': ('role', 'production', 'created_by')
        }),
    )


@admin.register(Production)
class ProductionAdmin(admin.ModelAdmin):
    """Admin для производств."""

    list_display = ('id', 'name', 'city', 'legal_name', 'inn', 'created_at')
    search_fields = ('name', 'city', 'legal_name', 'inn')
