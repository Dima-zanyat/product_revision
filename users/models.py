"""
Файл моделей приложения users

содержит следующие поля:
    * User - Класс наследуемый от AbstractUser
    для переопределения стандартного класса User.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models

from .constant import ROLE_CHOICES


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
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.username}, ({self.get_role_display()})"
