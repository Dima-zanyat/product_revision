"""
Модели приложения products.

Содержит:
- Product - продукт (могут производиться на разных точках)
- Ingredient - ингредиент с единицей измерения
- RecipeItem - рецепт (из каких ингредиентов состоит продукт)
"""

from django.db import models
from users.models import Production


CHOICES_UNIT = [
    ('g', 'Граммы'),
    ('kg', 'Килограммы'),
    ('l', 'Литры'),
    ('pcs', 'Штук')
]


class Ingredient(models.Model):
    """Ингредиент с единицей измерения."""

    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        related_name='ingredients',
        verbose_name='Производство',
        null=True,
        blank=True
    )
    title = models.CharField(
        max_length=50,
        verbose_name='Название'
    )
    unit = models.CharField(
        verbose_name='Единица измерения',
        choices=CHOICES_UNIT,
        max_length=10,
        default='g'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Ингредиент'
        verbose_name_plural = 'Ингредиенты'

    def __str__(self):
        return f"{self.title} ({self.get_unit_display()})"


class Product(models.Model):
    """Продукт, который может производиться на разных точках."""

    production = models.ForeignKey(
        Production,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='Производство',
        null=True,
        blank=True
    )
    title = models.CharField(
        max_length=50,
        verbose_name='Название продукта'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Описание',
        null=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания',
        null=True
    )

    class Meta:
        verbose_name = 'Продукт'
        verbose_name_plural = 'Продукты'

    def __str__(self):
        return self.title


class RecipeItem(models.Model):
    """
    Рецепт - какой ингредиент в каком количестве нужен для продукта.

    Пример: для 1 пиццы нужно 300г муки, 120г сыра, 50г соуса
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='recipe_items',
        verbose_name='Продукт'
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='used_in',
        verbose_name='Ингредиент'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Количество ингредиента на единицу продукта'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания',
        null=True
    )

    class Meta:
        verbose_name = 'Рецепт'
        verbose_name_plural = 'Рецепты'
        unique_together = ('product', 'ingredient')

    def __str__(self):
        return f"{self.product.title} - {self.ingredient.title} ({self.quantity}{self.ingredient.unit})"


class Recipe(Product):
    """Прокси-модель для удобного редактирования рецептов в админке."""

    class Meta:
        proxy = True
        verbose_name = 'Новый рецепт'
        verbose_name_plural = 'Новые рецепты'
