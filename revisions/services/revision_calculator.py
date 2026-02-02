"""
Сервис для расчета остатков и генерации отчетов по ревизии.

Логика:
1. Получить все продажи за период (от предыдущей ревизии до текущей)
2. Для каждого ингредиента рассчитать расход на основе рецептов
3. Рассчитать ожидаемый остаток: начальный + поступления - расход
4. Сравнить с фактическим остатком
5. Определить статус проблемы (ok, warning, critical)
6. Создать RevisionReport
"""

import logging
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from datetime import datetime, timedelta
from django.db.models import Sum
from products.models import Ingredient, RecipeItem
from sales.models import Sales, Incoming, IngredientInventory
from revisions.models import Revision, RevisionIngredientItem, RevisionReport

logger = logging.getLogger(__name__)


class RevisionCalculator:
    """Класс для расчета остатков и отчетов по ревизии."""

    # Пороги для определения статуса проблемы
    OK_THRESHOLD = Decimal('3.00')  # 0-3% = норма
    WARNING_THRESHOLD = Decimal('10.00')  # 3-10% = внимание
    # >10% = критично

    def __init__(self, revision: Revision):
        """
        Инициализация с объектом ревизии.

        Args:
            revision: Объект Revision
        """
        self.revision = revision
        self.location = revision.location
        self.revision_date = revision.revision_date
        logger.info(
            f"Инициализирован калькулятор для ревизии {revision.id} ({self.location.title})")

    def calculate_all(self) -> dict:
        """
        Главный метод расчета.

        Returns:
            dict с результатами расчета
        """
        try:
            logger.info(f"Начало расчета ревизии {self.revision.id}")

            # Получить предыдущую ревизию для определения начальных остатков
            previous_revision = self._get_previous_revision()
            logger.info(
                f"Предыдущая ревизия: {previous_revision.id if previous_revision else 'нет (первая ревизия)'}")

            # Получить все продажи за период
            sales_data = self._get_sales_data(previous_revision)
            logger.info(f"Получено {len(sales_data)} позиций продаж")

            # Получить все ингредиенты
            ingredients = Ingredient.objects.all()
            logger.info(f"Обработка {ingredients.count()} ингредиентов")

            # Расчитать расход для каждого ингредиента
            reports_created = 0
            for ingredient in ingredients:
                self._calculate_ingredient_report(
                    ingredient=ingredient,
                    sales_data=sales_data,
                    previous_revision=previous_revision
                )
                reports_created += 1

            logger.info(f"Расчет завершен. Создано {reports_created} отчетов")

            return {
                'status': 'success',
                'revision_id': self.revision.id,
                'reports_created': reports_created,
                'message': f'Создано {reports_created} отчетов по ингредиентам'
            }

        except Exception as e:
            logger.error(
                f"Ошибка при расчете ревизии: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e)
            }

    def _get_previous_revision(self) -> Revision:
        """
        Получить предыдущую ревизию для текущей точки.
        Нужна для определения начальных остатков.

        Returns:
            Объект Revision или None
        """
        previous = Revision.objects.filter(
            location=self.location,
            revision_date__lt=self.revision_date,
            status='completed'
        ).order_by('-revision_date').first()

        return previous

    def _get_sales_data(self, previous_revision: Revision) -> dict:
        """
        Получить все продажи за период между ревизиями.

        Args:
            previous_revision: Предыдущая ревизия (или None)

        Returns:
            dict вида {product_id: quantity}
        """
        # Определить начальную дату периода
        if previous_revision:
            start_date = previous_revision.revision_date + timedelta(days=1)
        else:
            # Если это первая ревизия, берем с начала месяца
            start_date = datetime(self.revision_date.year,
                                  self.revision_date.month, 1).date()

        logger.debug(
            f"Получение продаж за период: {start_date} - {self.revision_date}")

        # Получить все продажи за период
        sales = Sales.objects.filter(
            location=self.location,
            date__gte=start_date,
            date__lte=self.revision_date
        ).values('product_id').annotate(total_quantity=Sum('quantity'))

        # Преобразовать в dict, обрабатывая None значения
        sales_data = {}
        for item in sales:
            product_id = item['product_id']
            quantity = item['total_quantity']
            if quantity is not None:
                try:
                    sales_data[product_id] = int(quantity)
                except (ValueError, TypeError):
                    logger.warning(f"Некорректное количество для продукта {product_id}: {quantity}")
                    sales_data[product_id] = 0

        return sales_data

    def _get_initial_ingredient_quantity(self, ingredient: Ingredient, previous_revision: Revision) -> Decimal:
        """
        Получить начальный остаток ингредиента.

        Если есть предыдущая ревизия, берем фактический остаток из RevisionIngredientItem.
        Если это первая ревизия, берем из IngredientInventory или 0.

        Args:
            ingredient: Объект Ingredient
            previous_revision: Предыдущая ревизия или None

        Returns:
            Decimal количество
        """
        if previous_revision:
            # Получить фактический остаток из предыдущей ревизии
            previous_item = RevisionIngredientItem.objects.filter(
                revision=previous_revision,
                ingredient=ingredient
            ).first()

            if previous_item:
                qty = previous_item.actual_quantity
                if qty is not None:
                    try:
                        qty_decimal = Decimal(str(qty))
                        qty_decimal = qty_decimal.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
                        # Проверить пределы
                        if abs(qty_decimal) >= Decimal('10000000'):
                            logger.warning(f"Остаток из предыдущей ревизии слишком большой для {ingredient.title}: {qty_decimal}")
                            qty_decimal = Decimal('9999999.999') if qty_decimal > 0 else Decimal('-9999999.999')
                        return qty_decimal
                    except (InvalidOperation, ValueError, TypeError) as e:
                        logger.error(f"Ошибка при обработке остатка из предыдущей ревизии для {ingredient.title}: {e}")
                        return Decimal('0.000')
                return Decimal('0.000')
            else:
                logger.warning(
                    f"Ингредиент {ingredient.title} не найден в предыдущей ревизии")
                return Decimal('0.000')
        else:
            # Первая ревизия - берем из IngredientInventory
            inv = IngredientInventory.objects.filter(
                ingredient=ingredient,
                location=self.location
            ).first()

            if inv and inv.quantity is not None:
                try:
                    qty_decimal = Decimal(str(inv.quantity))
                    qty_decimal = qty_decimal.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
                    # Проверить пределы
                    if abs(qty_decimal) >= Decimal('10000000'):
                        logger.warning(f"Начальный остаток слишком большой для {ingredient.title}: {qty_decimal}")
                        qty_decimal = Decimal('9999999.999') if qty_decimal > 0 else Decimal('-9999999.999')
                    return qty_decimal
                except (InvalidOperation, ValueError, TypeError) as e:
                    logger.error(f"Ошибка при обработке начального остатка для {ingredient.title}: {e}")
                    return Decimal('0.000')
            else:
                logger.info(
                    f"Начальный остаток для {ingredient.title} = 0 (первая ревизия)")
                return Decimal('0.000')

    def _get_incoming_quantity(self, ingredient: Ingredient) -> Decimal:
        """
        Получить общее количество поступлений ингредиента за период.

        Args:
            ingredient: Объект Ingredient

        Returns:
            Decimal количество
        """
        # Определить начальную дату периода
        previous_revision = self._get_previous_revision()
        if previous_revision:
            start_date = previous_revision.revision_date + timedelta(days=1)
        else:
            start_date = datetime(self.revision_date.year,
                                  self.revision_date.month, 1).date()

        # Получить все поступления
        incoming = Incoming.objects.filter(
            ingredient=ingredient,
            location=self.location,
            date__gte=start_date,
            date__lte=self.revision_date
        ).aggregate(total=Sum('quantity'))

        total = incoming['total']
        if total is None:
            return Decimal('0.000')
        try:
            qty = Decimal(str(total))
            # Округлить до 3 знаков
            qty = qty.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
            # Проверить пределы
            if abs(qty) >= Decimal('10000000'):
                logger.warning(f"Поступления слишком большие для {ingredient.title}: {qty}")
                qty = Decimal('9999999.999') if qty > 0 else Decimal('-9999999.999')
            return qty
        except (InvalidOperation, ValueError, TypeError) as e:
            logger.error(f"Ошибка при обработке поступлений для {ingredient.title}: {e}")
            return Decimal('0.000')

    def _calculate_ingredient_expense(self, ingredient: Ingredient, sales_data: dict) -> Decimal:
        """
        Расчитать расход ингредиента на производство.

        Логика:
        1. Для каждого продукта получить его рецепт (количество ингредиента)
        2. Умножить на количество проданного продукта
        3. Суммировать по всем продуктам

        Формула: расход = Σ(рецепт_ингредиента_в_продукте × кол-во_проданных_единиц_продукта)

        Args:
            ingredient: Объект Ingredient
            sales_data: dict {product_id: quantity}

        Returns:
            Decimal расход в единицах ингредиента
        """
        total_expense = Decimal('0.000')

        # Получить все рецепты, содержащие этот ингредиент
        recipes = RecipeItem.objects.filter(ingredient=ingredient)

        for recipe in recipes:
            product_id = recipe.product_id

            # Если этот продукт продавался
            if product_id in sales_data:
                sold_quantity = sales_data[product_id]
                if sold_quantity is not None:
                    try:
                        # recipe.quantity уже DecimalField, но убедимся что это Decimal
                        recipe_qty = recipe.quantity
                        if not isinstance(recipe_qty, Decimal):
                            recipe_qty = Decimal(str(recipe_qty))
                        
                        # Преобразовать sold_quantity в Decimal
                        sold_decimal = Decimal(str(sold_quantity))
                        
                        # Расход = количество ингредиента в рецепте × количество проданного продукта
                        expense = recipe_qty * sold_decimal
                        total_expense += expense
                    except (InvalidOperation, ValueError, TypeError) as e:
                        logger.error(f"Ошибка при вычислении расхода для продукта {product_id}: {e}")
                        continue

        # Округлить до 3 знаков после запятой
        try:
            total_expense = total_expense.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
            # Проверить пределы
            if abs(total_expense) >= Decimal('10000000'):
                logger.warning(f"Общий расход слишком большой: {total_expense}")
                total_expense = Decimal('9999999.999') if total_expense > 0 else Decimal('-9999999.999')
        except (InvalidOperation, ValueError, TypeError) as e:
            logger.error(f"Ошибка при округлении расхода: {e}")
            total_expense = Decimal('0.000')
        
        return total_expense

    def _calculate_ingredient_report(self, ingredient: Ingredient, sales_data: dict, previous_revision: Revision):
        """
        Расчитать отчет для конкретного ингредиента.

        Args:
            ingredient: Объект Ingredient
            sales_data: dict {product_id: quantity}
            previous_revision: Предыдущая ревизия или None
        """
        # Получить начальный остаток
        try:
            initial_quantity = self._get_initial_ingredient_quantity(
                ingredient, previous_revision)
        except Exception as e:
            logger.error(f"Ошибка при получении начального остатка для {ingredient.title}: {e}")
            initial_quantity = Decimal('0.000')

        # Получить поступления
        try:
            incoming_quantity = self._get_incoming_quantity(ingredient)
        except Exception as e:
            logger.error(f"Ошибка при получении поступлений для {ingredient.title}: {e}")
            incoming_quantity = Decimal('0.000')

        # Расчитать расход
        try:
            expense_quantity = self._calculate_ingredient_expense(
                ingredient, sales_data)
        except Exception as e:
            logger.error(f"Ошибка при расчете расхода для {ingredient.title}: {e}")
            expense_quantity = Decimal('0.000')

        # Ожидаемый остаток = начальный + поступления - расход
        try:
            expected_quantity = initial_quantity + incoming_quantity - expense_quantity
            # Округлить до 3 знаков после запятой (соответствует decimal_places=3 в модели)
            # Используем ROUND_HALF_UP для стандартного округления
            expected_quantity = expected_quantity.quantize(
                Decimal('0.001'), 
                rounding=ROUND_HALF_UP
            )
            # Проверить, что значение в пределах max_digits=10
            if abs(expected_quantity) >= Decimal('10000000'):  # 10 digits - 3 decimal places = 7 digits before decimal
                logger.warning(f"Ожидаемый остаток слишком большой для {ingredient.title}: {expected_quantity}")
                expected_quantity = Decimal('9999999.999') if expected_quantity > 0 else Decimal('-9999999.999')
        except (InvalidOperation, ValueError, TypeError) as e:
            logger.error(f"Ошибка при вычислении ожидаемого остатка для {ingredient.title}: {e}")
            expected_quantity = Decimal('0.000')

        # Защита от отрицательных значений (если расход > начального)
        if expected_quantity < Decimal('0.000'):
            logger.warning(
                f"Отрицательный ожидаемый остаток для {ingredient.title}: {expected_quantity}")
            # Оставляем отрицательное значение для отображения проблемы

        # Получить фактический остаток из ревизии
        revision_item = RevisionIngredientItem.objects.filter(
            revision=self.revision,
            ingredient=ingredient
        ).first()

        if not revision_item:
            # Если ингредиента нет в ревизии, считаем его за 0
            actual_quantity = Decimal('0.000')
            logger.info(
                f"Ингредиент {ingredient.title} не найден в ревизии, используется 0")
        else:
            qty = revision_item.actual_quantity
            if qty is not None:
                try:
                    actual_quantity = Decimal(str(qty))
                    # Округлить до 3 знаков
                    actual_quantity = actual_quantity.quantize(
                        Decimal('0.001'),
                        rounding=ROUND_HALF_UP
                    )
                    # Проверить пределы
                    if abs(actual_quantity) >= Decimal('10000000'):
                        logger.warning(f"Фактический остаток слишком большой для {ingredient.title}: {actual_quantity}")
                        actual_quantity = Decimal('9999999.999') if actual_quantity > 0 else Decimal('-9999999.999')
                except (InvalidOperation, ValueError, TypeError) as e:
                    logger.error(f"Ошибка при обработке фактического остатка для {ingredient.title}: {e}")
                    actual_quantity = Decimal('0.000')
            else:
                actual_quantity = Decimal('0.000')

        # Разница и процент
        try:
            difference = actual_quantity - expected_quantity
            # Округлить разницу до 3 знаков
            difference = difference.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
            # Проверить пределы
            if abs(difference) >= Decimal('10000000'):
                logger.warning(f"Разница слишком большая для {ingredient.title}: {difference}")
                difference = Decimal('9999999.999') if difference > 0 else Decimal('-9999999.999')
        except (InvalidOperation, ValueError, TypeError) as e:
            logger.error(f"Ошибка при вычислении разницы для {ingredient.title}: {e}")
            difference = Decimal('0.000')

        # Безопасное вычисление процента
        try:
            if expected_quantity == Decimal('0.000') or abs(expected_quantity) < Decimal('0.001'):
                # Если ожидаемый остаток равен нулю или очень мал
                if actual_quantity == Decimal('0.000'):
                    percentage = Decimal('0.00')
                else:
                    # Если есть фактический остаток, но нет ожидаемого - считаем как 100% отклонение
                    percentage = Decimal('100.00')
            else:
                # Нормальное вычисление процента
                percentage = (abs(difference) / abs(expected_quantity)) * Decimal('100')
                # Округлить до 2 знаков после запятой (соответствует decimal_places=2 в модели)
                percentage = percentage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                # Проверить пределы (max_digits=5, decimal_places=2)
                if abs(percentage) >= Decimal('1000'):
                    logger.warning(f"Процент слишком большой для {ingredient.title}: {percentage}")
                    percentage = Decimal('999.99') if percentage > 0 else Decimal('-999.99')
        except (InvalidOperation, ValueError, TypeError, ZeroDivisionError) as e:
            logger.error(f"Ошибка при вычислении процента для {ingredient.title}: {e}")
            percentage = Decimal('0.00')

        # Определить статус
        status = self._determine_status(percentage)

        logger.debug(f"{ingredient.title}: ожид={expected_quantity}, факт={actual_quantity}, "
                     f"разница={difference}, {percentage}%, статус={status}")

        # Создать или обновить отчет
        RevisionReport.objects.update_or_create(
            revision=self.revision,
            ingredient=ingredient,
            defaults={
                'expected_quantity': expected_quantity,
                'actual_quantity': actual_quantity,
                'difference': difference,
                'percentage': percentage,
                'status': status
            }
        )

    def _determine_status(self, percentage: Decimal) -> str:
        """
        Определить статус проблемы на основе % отклонения.

        0-3% = ok (норма)
        3-10% = warning (внимание)
        >10% = critical (критично)

        Args:
            percentage: % отклонения

        Returns:
            str статус (ok, warning, critical)
        """
        if percentage <= self.OK_THRESHOLD:
            return 'ok'
        elif percentage <= self.WARNING_THRESHOLD:
            return 'warning'
        else:
            return 'critical'

    def update_inventory(self):
        """
        Обновить текущие остатки ингредиентов на основе отчета.

        Сохраняет фактические остатки в IngredientInventory для использования
        в следующей ревизии.
        """
        reports = RevisionReport.objects.filter(revision=self.revision)

        for report in reports:
            IngredientInventory.objects.update_or_create(
                ingredient=report.ingredient,
                location=self.location,
                defaults={
                    'quantity': report.actual_quantity
                }
            )
            logger.info(
                f"Обновлен остаток {report.ingredient.title}: {report.actual_quantity}")
