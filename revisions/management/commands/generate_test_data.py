"""
Management команда для генерации тестовых данных.

Использование:
    python manage.py generate_test_data [--revisions N] [--products-per-revision N] [--ingredients-per-revision N]
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal

from products.models import Product, Ingredient
from sales.models import Location
from revisions.models import Revision, RevisionProductItem, RevisionIngredientItem, RevisionReport

User = get_user_model()


class Command(BaseCommand):
    help = 'Генерирует тестовые данные для проверки сервиса на большие объемы'

    def add_arguments(self, parser):
        parser.add_argument(
            '--revisions',
            type=int,
            default=50,
            help='Количество ревизий для создания (по умолчанию: 50)',
        )
        parser.add_argument(
            '--products-per-revision',
            type=int,
            default=20,
            help='Количество продуктов на ревизию (по умолчанию: 20)',
        )
        parser.add_argument(
            '--ingredients-per-revision',
            type=int,
            default=30,
            help='Количество ингредиентов на ревизию (по умолчанию: 30)',
        )

    def handle(self, *args, **options):
        revisions_count = options['revisions']
        products_per_revision = options['products_per_revision']
        ingredients_per_revision = options['ingredients_per_revision']

        self.stdout.write(f'Генерация тестовых данных...')
        self.stdout.write(f'Ревизий: {revisions_count}')
        self.stdout.write(f'Продуктов на ревизию: {products_per_revision}')
        self.stdout.write(f'Ингредиентов на ревизию: {ingredients_per_revision}')

        # Получить или создать необходимые объекты
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR('Нет пользователей в системе. Создайте хотя бы одного пользователя.'))
            return

        locations = list(Location.objects.all())
        if not locations:
            self.stdout.write(self.style.ERROR('Нет локаций в системе. Создайте хотя бы одну локацию.'))
            return

        # Создать продукты и ингредиенты если их нет
        if Product.objects.count() < 100:
            self.stdout.write('Создание продуктов...')
            for i in range(100):
                Product.objects.get_or_create(
                    title=f'Продукт {i+1}',
                    defaults={'description': f'Описание продукта {i+1}'}
                )

        if Ingredient.objects.count() < 100:
            self.stdout.write('Создание ингредиентов...')
            units = ['г', 'кг', 'л', 'мл', 'шт']
            for i in range(100):
                Ingredient.objects.get_or_create(
                    title=f'Ингредиент {i+1}',
                    defaults={'unit': random.choice(units)}
                )

        products = list(Product.objects.all())
        ingredients = list(Ingredient.objects.all())

        # Создать ревизии
        self.stdout.write('Создание ревизий...')
        statuses = ['draft', 'submitted', 'processing', 'completed']
        
        for i in range(revisions_count):
            revision_date = timezone.now().date() - timedelta(days=random.randint(0, 365))
            status = random.choice(statuses)
            author = random.choice(users)
            location = random.choice(locations)

            revision, created = Revision.objects.get_or_create(
                location=location,
                revision_date=revision_date,
                defaults={
                    'author': author,
                    'status': status,
                    'comments': f'Тестовая ревизия {i+1}',
                }
            )

            if created:
                # Создать продукты для ревизии
                selected_products = random.sample(products, min(products_per_revision, len(products)))
                for product in selected_products:
                    RevisionProductItem.objects.get_or_create(
                        revision=revision,
                        product=product,
                        defaults={
                            'actual_quantity': random.randint(1, 1000),
                            'comments': f'Комментарий к продукту {product.title}',
                        }
                    )

                # Создать ингредиенты для ревизии
                selected_ingredients = random.sample(ingredients, min(ingredients_per_revision, len(ingredients)))
                for ingredient in selected_ingredients:
                    RevisionIngredientItem.objects.get_or_create(
                        revision=revision,
                        ingredient=ingredient,
                        defaults={
                            'actual_quantity': Decimal(str(random.uniform(0.1, 1000.0))).quantize(Decimal('0.001')),
                            'comments': f'Комментарий к ингредиенту {ingredient.title}',
                        }
                    )

                # Если ревизия завершена, создать отчеты
                if status == 'completed':
                    for ingredient_item in revision.ingredient_items.all():
                        expected = Decimal(str(random.uniform(100, 1000))).quantize(Decimal('0.001'))
                        actual = ingredient_item.actual_quantity
                        difference = actual - expected
                        percentage = abs((difference / expected * 100).quantize(Decimal('0.01'))) if expected > 0 else Decimal('0')
                        
                        if percentage > 10:
                            report_status = 'critical'
                        elif percentage > 3:
                            report_status = 'warning'
                        else:
                            report_status = 'ok'

                        RevisionReport.objects.get_or_create(
                            revision=revision,
                            ingredient=ingredient_item.ingredient,
                            defaults={
                                'expected_quantity': expected,
                                'actual_quantity': actual,
                                'difference': difference,
                                'percentage': percentage,
                                'status': report_status,
                            }
                        )

            if (i + 1) % 10 == 0:
                self.stdout.write(f'Создано {i + 1}/{revisions_count} ревизий...')

        self.stdout.write(self.style.SUCCESS(
            f'\nУспешно создано тестовых данных:\n'
            f'- Ревизий: {Revision.objects.count()}\n'
            f'- Продуктов в ревизиях: {RevisionProductItem.objects.count()}\n'
            f'- Ингредиентов в ревизиях: {RevisionIngredientItem.objects.count()}\n'
            f'- Отчетов: {RevisionReport.objects.count()}'
        ))
