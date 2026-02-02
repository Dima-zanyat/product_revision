"""
Модели приложения revisions.

Содержит:
- Revision - ревизия (проверка остатков на конец месяца)
- RevisionProductItem - остаток продукта в ревизии (из Excel файла)
- RevisionIngredientItem - остаток ингредиента в ревизии
- RevisionReport - отчет с расчетом расходов и разиц
"""

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product, Ingredient
from sales.models import Location

User = get_user_model()

REVISION_STATUS_CHOICES = [
    ('draft', 'Черновик'),
    ('submitted', 'Отправлена на обработку'),
    ('processing', 'В обработке'),
    ('completed', 'Завершена'),
]

REPORT_STATUS_CHOICES = [
    ('ok', '✅ Норма (0-3%)'),
    ('warning', '⚠️ Внимание (3-10%)'),
    ('critical', '🔴 Критично (>10%)'),
]


class Revision(models.Model):
    """
    Ревизия - проверка остатков на конец месяца.

    Заполняется из Excel файла, который содержит:
    - Номенклатура (Product)
    - Категория
    - Количество (в штуках для продуктов, в дробных числах для ингредиентов)
    """

    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='revisions',
        verbose_name='Точка производства'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='revisions',
        verbose_name='Автор ревизии (сотрудник)',
    )
    revision_date = models.DateField(
        verbose_name='Дата ревизии',
        help_text='Дата, на которую проводится ревизия',
    )
    status = models.CharField(
        max_length=20,
        verbose_name='Статус ревизии',
        default='draft',
        choices=REVISION_STATUS_CHOICES,
    )
    comments = models.TextField(
        blank=True,
        verbose_name='Комментарии',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления',
    )

    class Meta:
        verbose_name = 'Ревизия'
        verbose_name_plural = 'Ревизии'
        ordering = ['-revision_date', 'location']
        unique_together = ('location', 'revision_date')
        indexes = [
            models.Index(fields=['location', 'revision_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Ревизия {self.location.title} - {self.revision_date}"


class RevisionProductItem(models.Model):
    """
    Элемент ревизии - информация о конкретном ПРОДУКТЕ.

    Заполняется из Excel файла с колонками:
    - Номенклатура → product (ForeignKey на Product)
    - Категория → (опционально, для справки)
    - Ед.Измерения → в штуках (ЦЕЛЫЕ ЧИСЛА)
    - Количество → actual_quantity
    """

    revision = models.ForeignKey(
        Revision,
        on_delete=models.CASCADE,
        related_name='product_items',
        verbose_name='Ревизия'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Продукт (Номенклатура)'
    )
    actual_quantity = models.PositiveIntegerField(
        verbose_name='Фактическое количество (штук)',
        help_text='Из колонки "Количество" в Excel'
    )
    comments = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарии',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания',
    )

    class Meta:
        verbose_name = 'Остаток продукта'
        verbose_name_plural = 'Остатки продуктов'
        unique_together = ('revision', 'product')

    def __str__(self):
        return f"{self.product.title} - {self.actual_quantity} шт."


class RevisionIngredientItem(models.Model):
    """
    Элемент ревизии - информация о конкретном ИНГРЕДИЕНТЕ.

    Ингредиенты исчисляются в ДРОБНЫХ ЧИСЛАХ (г, кг, л и т.д.).
    """

    revision = models.ForeignKey(
        Revision,
        on_delete=models.CASCADE,
        related_name='ingredient_items',
        verbose_name='Ревизия'
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        verbose_name='Ингредиент'
    )
    actual_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Фактическое количество'
    )
    comments = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарии',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания',
    )

    class Meta:
        verbose_name = 'Остаток ингредиента'
        verbose_name_plural = 'Остатки ингредиентов'
        unique_together = ('revision', 'ingredient')

    def __str__(self):
        return f"{self.ingredient.title} - {self.actual_quantity} {self.ingredient.unit}"


class RevisionReport(models.Model):
    """
    Отчет по ревизии ИНГРЕДИЕНТОВ с расчетами.

    Логика:
    1. Продукты разлагаются на компоненты (ингредиенты) по рецептам
    2. Расчитывается расход ингредиентов: sold_quantity * ingredient_amount_per_unit
    3. Сравнивается с фактическими остатками ингредиентов
    4. Выявляются недостачи/излишки только по ингредиентам

    Содержит:
    - expected_quantity - расчетный остаток ингредиента
    - actual_quantity - фактический остаток (из ревизии)
    - difference - разница (фактический - ожидаемый)
    - percentage - % отклонения
    - status - уровень проблемы (ok, warning, critical)
    """

    revision = models.ForeignKey(
        Revision,
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name='Ревизия'
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        verbose_name='Ингредиент'
    )
    expected_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Расчетный остаток',
        help_text='Начальный - расход_на_продукцию + поступления'
    )
    actual_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Фактический остаток',
        help_text='Прислали из ревизии ингредиентов'
    )
    difference = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Разница (факт - ожидаемый)',
        help_text='Отрицательное число = недостача'
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='% отклонения'
    )
    status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS_CHOICES,
        verbose_name='Статус проблемы'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Отчет по ревизии'
        verbose_name_plural = 'Отчеты по ревизиям'
        ordering = ['-revision__revision_date']
        unique_together = ('revision', 'ingredient')

    def __str__(self):
        return f"{self.ingredient.title} - {self.status}"
