"""
Admin интерфейс для приложения users.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.conf import settings
from django.utils.html import format_html
from .models import User, Production, ProductionInvite


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

    list_display = ('id', 'unique_key', 'name', 'city', 'legal_name', 'inn', 'created_at')
    search_fields = ('unique_key', 'name', 'city', 'legal_name', 'inn')


@admin.register(ProductionInvite)
class ProductionInviteAdmin(admin.ModelAdmin):
    """Admin для инвайтов."""

    list_display = ('id', 'token', 'created_by', 'created_at', 'is_used', 'registration_link')
    search_fields = ('token',)
    readonly_fields = ('token', 'created_by', 'created_at', 'used_at', 'used_by', 'production')

    def registration_link(self, obj):
        base = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        if not base:
            return obj.token
        return format_html('<a href="{0}/register/{1}" target="_blank">{0}/register/{1}</a>', base, obj.token)
    registration_link.short_description = 'Ссылка регистрации'

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
