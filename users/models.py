"""
Файл моделей приложения users

содержит следующие поля:
    * User - Класс наследуемый от AbstractUser
    для переопределения стандартного класса User.
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

from .constant import ROLE_CHOICES


class Production(models.Model):
    """Производство (пекарня/цех) с собственными справочниками."""

    unique_key = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        verbose_name='Уникальный ключ',
        blank=True
    )
    name = models.CharField(
        max_length=150,
        verbose_name='Название пекарни'
    )
    city = models.CharField(
        max_length=100,
        verbose_name='Город'
    )
    legal_name = models.CharField(
        max_length=200,
        verbose_name='Название ИП'
    )
    inn = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='ИНН'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )

    class Meta:
        verbose_name = 'Производство'
        verbose_name_plural = 'Производства'

    def __str__(self):
        return f"{self.name} ({self.city})"

    def save(self, *args, **kwargs):
        if not self.unique_key:
            self.unique_key = uuid.uuid4().hex[:12]
        super().save(*args, **kwargs)


class ProductionInvite(models.Model):
    """Инвайт-ссылка для регистрации производства и менеджера."""

    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name='Токен'
    )
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invites',
        verbose_name='Кем создан'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата использования'
    )
    used_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='used_invites',
        verbose_name='Кем использован'
    )
    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='invites',
        verbose_name='Производство'
    )

    class Meta:
        verbose_name = 'Инвайт производства'
        verbose_name_plural = 'Инвайты производств'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    @property
    def is_used(self):
        return bool(self.used_at)


class User(AbstractUser):
    """
    Class User.

    наследуемый от AbstractUser для переопределения стандартного класса User.
    """

    role = models.CharField(
        max_length=50,
        verbose_name='Роль',
        choices=ROLE_CHOICES,
    )
    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Производство'
    )
    created_by = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_users',
        verbose_name='Кем создан'
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.username}, ({self.get_role_display()})"
