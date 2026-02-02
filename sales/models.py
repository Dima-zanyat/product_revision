"""
Модели приложения sales.

Содержит:
- Location - точка производства (пекарня, цех и т.д.)
- Sales - продажи из МойКассир
- Incoming - поступления ингредиентов/готовых продуктов
- Inventory - текущие остатки по продуктам на точке
"""

from django.db import models
from products.models import Product, Ingredient


class Location(models.Model):
    """Точка производства (пекарня, цех, филиал и т.д.)"""

    title = models.CharField(
        max_length=100,
        verbose_name='Название точки производства'
    )
    address = models.CharField(
        max_length=255,
        verbose_name='Адрес',
        blank=True
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Код точки (из МойКассир)',
        help_text='Уникальный код для интеграции с кассой'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Точка производства'
        verbose_name_plural = 'Точки производства'

    def __str__(self):
        return self.title


class Sales(models.Model):
    """
    Продажи из МойКассир.

    Синхронизируется автоматически или вручную из кассовой системы.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='sales',
        verbose_name='Продукт'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='sales',
        verbose_name='Точка производства'
    )
    date = models.DateField(
        verbose_name='Дата продажи'
    )
    moykassir_id = models.CharField(
        max_length=100,
        verbose_name='ID из МойКассир',
        blank=True,
        null=True
    )
    quantity = models.PositiveIntegerField(
        verbose_name='Количество продано (штук)',
        help_text='Целое число >= 0'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания записи'
    )

    class Meta:
        verbose_name = 'Продажа'
        verbose_name_plural = 'Продажи'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['location', 'date']),
            models.Index(fields=['product', 'date']),
        ]

    def __str__(self):
        return f"{self.product.title} - {self.quantity}  ({self.date})"


class Incoming(models.Model):
    """
    Поступления ингредиентов на точку производства.

    Может быть заполнено вручную перед ревизией или при поступлении товара.
    """

    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='incoming',
        verbose_name='Ингредиент'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='incoming',
        verbose_name='Точка производства'
    )
    date = models.DateField(
        verbose_name='Дата поступления'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Количество поступило'
    )
    comment = models.TextField(
        blank=True,
        verbose_name='Комментарий'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Поступление'
        verbose_name_plural = 'Поступления'
        ordering = ['-date']

    def __str__(self):
        return (f"{self.ingredient.title}"
                f"- {self.quantity}"
                f"{self.ingredient.unit} ({self.date})"
                )


class Inventory(models.Model):
    """
    Текущие остатки продуктов на каждой точке производства.

    Примечание: в основном продукты продаются быстро и не хранятся дольше
    дня.Этот класс предназначен только для исключительных случаев
    (остатки, списания,ручной пересчет). По умолчанию сервис расчёта
    ревизии НЕ учитывает эти записи, если поле is_exceptional=False.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='inventories',
        verbose_name='Продукт'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='inventories',
        verbose_name='Точка производства'
    )
    quantity = models.PositiveIntegerField(
        verbose_name='Текущий остаток (штук)'
    )
    is_exceptional = models.BooleanField(
        default=False,
        verbose_name='Исключительный остаток',
        help_text='Если отмечено — учитывать этот остаток в расчётах ревизии как ручной/исключительный'
    )
    reason = models.TextField(
        blank=True,
        verbose_name='Причина/комментарий',
        help_text='Пояснение, почему используется ручной остаток'
    )
    recorded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата учёта',
        help_text='Когда был зафиксирован этот остаток (ручной пересчёт)'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата последнего обновления'
    )

    class Meta:
        verbose_name = 'Остаток продукта'
        verbose_name_plural = 'Остатки продуктов'
        unique_together = ('product', 'location')

    def __str__(self):
        flag = ' (исключение)' if self.is_exceptional else ''
        return (
            f"{self.product.title} на "
            f"{self.location.title}: {self.quantity}{flag}"
        )


class IngredientInventory(models.Model):
    """
    Текущие остатки ИНГРЕДИЕНТОВ на каждой точке производства.

    Обновляется после каждой ревизии на основе рассчитанного остатка.

    """

    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='inventories',
        verbose_name='Ингредиент'
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='ingredient_inventories',
        verbose_name='Точка производства'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Текущий остаток'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата последнего обновления'
    )

    class Meta:
        verbose_name = 'Остаток ингредиента'
        verbose_name_plural = 'Остатки ингредиентов'
        unique_together = ('ingredient', 'location')

    def __str__(self):
        return f"{self.ingredient.title} ({self.ingredient.unit}) на {self.location.title}: {self.quantity}"
