"""
ViewSets для REST API приложения revisions.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Revision, RevisionProductItem, RevisionIngredientItem, RevisionReport

logger = logging.getLogger(__name__)
from .serializers import (
    RevisionSerializer,
    RevisionDetailSerializer,
    RevisionProductItemSerializer,
    RevisionIngredientItemSerializer,
    RevisionReportSerializer,
)
from .services import RevisionCalculator


class RevisionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления ревизиями."""

    queryset = Revision.objects.all()
    serializer_class = RevisionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('location__title', 'author__username')
    ordering_fields = ('revision_date', 'created_at', 'status')
    ordering = ['-revision_date']

    def get_queryset(self):
        """Ограничить доступ по ролям и применить фильтрацию."""
        queryset = super().get_queryset()
        user = self.request.user

        # Фильтр по производству
        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(location__production_id=user.production_id)
            else:
                return queryset.none()
        
        # Сотрудник видит только свои черновики (не видит отправленные)
        if hasattr(user, 'role') and user.role == 'staff':
            queryset = queryset.filter(author=user, status='draft')
        # admin, manager, accounting видят все
        
        # Применить фильтрацию по статусу из query параметров
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Применить фильтрацию по локации
        location_filter = self.request.query_params.get('location', None)
        if location_filter:
            queryset = queryset.filter(location=location_filter)
        
        # Применить фильтрацию по дате
        revision_date_filter = self.request.query_params.get('revision_date', None)
        if revision_date_filter:
            queryset = queryset.filter(revision_date=revision_date_filter)
        
        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Получить ревизию и автоматически изменить статус при просмотре."""
        instance = self.get_object()
        user = request.user
        
        # Автоматически изменить статус с "submitted" на "processing" 
        # при просмотре admin, manager, accounting
        if (hasattr(user, 'role') and 
            user.role in ['admin', 'manager', 'accounting'] and
            instance.status == 'submitted'):
            instance.status = 'processing'
            instance.save(update_fields=['status'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_serializer_class(self):
        """Использовать детальный serializer для retrieve."""
        if self.action == 'retrieve':
            return RevisionDetailSerializer
        return RevisionSerializer

    def perform_create(self, serializer):
        """Установить текущего пользователя как автора."""
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Удалить ревизию (запрещено для staff)."""
        user = request.user
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для удаления ревизии'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """
        Расчитать ревизию.

        POST /api/revisions/{id}/calculate/
        """
        revision = self.get_object()
        user = request.user

        # Сотрудник не рассчитывает ревизии — только отправляет на обработку
        if hasattr(user, 'role') and user.role == 'staff':
            return Response(
                {'error': 'Недостаточно прав для расчета ревизии'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Admin, manager, accounting могут рассчитывать processing и completed
        elif hasattr(user, 'role') and user.role in ['admin', 'manager', 'accounting']:
            if revision.status not in ['draft', 'processing', 'completed']:
                return Response(
                    {'error': 'Можно расчитать только ревизию в статусе "Черновик", "В обработке" или "Завершена"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if revision.status != 'draft':
                return Response(
                    {'error': 'Можно расчитать только ревизию в статусе "Черновик"'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            calculator = RevisionCalculator(revision)
            result = calculator.calculate_all()

            if result['status'] == 'success':
                # Статус после расчета:
                # - draft/submitted -> processing (ожидает подтверждения)
                # - processing/completed -> остается как есть
                if revision.status in ['draft', 'submitted']:
                    revision.status = 'processing'
                    revision.save(update_fields=['status'])
                elif revision.status == 'completed':
                    # Если ревизия уже завершена, пересчет должен обновить инвентарь
                    try:
                        calculator.update_inventory()
                    except Exception as e:
                        logger.error(f"Ошибка при обновлении инвентаря: {e}")

                return Response({
                    'status': 'success',
                    'message': result['message'],
                    'reports_created': result['reports_created']
                })
            else:
                return Response(
                    {'error': result['message']},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.error(f"Ошибка при расчете ревизии {revision.id}: {e}", exc_info=True)
            error_message = str(e)
            # Если это ошибка Decimal, дать более понятное сообщение
            if 'InvalidOperation' in str(type(e)):
                error_message = 'Ошибка при вычислениях. Проверьте корректность данных в ревизии.'
            return Response(
                {'error': error_message},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        Получить сводку по ревизии.

        GET /api/revisions/{id}/summary/
        """
        revision = self.get_object()

        reports = RevisionReport.objects.filter(revision=revision)

        summary = {
            'total_ingredients': reports.count(),
            'ok_count': reports.filter(status='ok').count(),
            'warning_count': reports.filter(status='warning').count(),
            'critical_count': reports.filter(status='critical').count(),
            'total_difference': sum(r.difference for r in reports),
            'avg_percentage': sum(r.percentage for r in reports) / reports.count() if reports.count() > 0 else 0,
        }

        return Response(summary)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Отправить ревизию на обработку (для сотрудника).

        POST /api/revisions/{id}/submit/
        """
        revision = self.get_object()
        user = request.user

        # Только автор может отправить ревизию
        if revision.author != user:
            return Response(
                {'error': 'Вы можете отправить только свою ревизию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if revision.status != 'draft':
            return Response(
                {'error': 'Можно отправить только ревизию в статусе "Черновик"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        revision.status = 'submitted'
        revision.save(update_fields=['status'])

        return Response({
            'success': True,
            'message': 'Ревизия отправлена на обработку',
            'revision': RevisionSerializer(revision).data
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Подтвердить и завершить ревизию (для admin, manager, accounting).

        POST /api/revisions/{id}/approve/
        """
        revision = self.get_object()
        user = request.user

        # Проверка прав доступа
        if not hasattr(user, 'role') or user.role not in ['admin', 'manager', 'accounting']:
            return Response(
                {'error': 'Недостаточно прав для подтверждения ревизии'},
                status=status.HTTP_403_FORBIDDEN
            )

        if revision.status not in ['draft', 'processing', 'submitted']:
            return Response(
                {'error': 'Можно подтвердить только ревизию в статусе "Черновик", "В обработке" или "Отправлена на обработку"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Если ревизия еще не рассчитана, рассчитать её
        # Но не обновлять инвентарь до подтверждения
        if not revision.reports.exists():
            try:
                calculator = RevisionCalculator(revision)
                result = calculator.calculate_all()
                if result['status'] != 'success':
                    return Response(
                        {'error': f'Ошибка при расчете: {result["message"]}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Не обновляем инвентарь при подтверждении - это будет сделано после завершения
            except Exception as e:
                return Response(
                    {'error': f'Ошибка при расчете: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        revision.status = 'completed'
        revision.save(update_fields=['status'])
        
        # Обновить инвентарь после подтверждения
        try:
            calculator = RevisionCalculator(revision)
            calculator.update_inventory()
        except Exception as e:
            logger.error(f"Ошибка при обновлении инвентаря: {e}")

        return Response({
            'success': True,
            'message': 'Ревизия подтверждена и завершена',
            'revision': RevisionSerializer(revision).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Отклонить ревизию и вернуть в черновик (для admin, manager, accounting).

        POST /api/revisions/{id}/reject/
        Body: { "reason": "Причина отклонения" }
        """
        revision = self.get_object()
        user = request.user

        # Проверка прав доступа
        if not hasattr(user, 'role') or user.role not in ['admin', 'manager', 'accounting']:
            return Response(
                {'error': 'Недостаточно прав для отклонения ревизии'},
                status=status.HTTP_403_FORBIDDEN
            )

        if revision.status not in ['processing', 'submitted']:
            return Response(
                {'error': 'Можно отклонить только ревизию в статусе "В обработке" или "Отправлена на обработку"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        revision.status = 'draft'
        if reason:
            revision.comments = (revision.comments or '') + f'\n[Отклонено: {reason}]'
        revision.save(update_fields=['status', 'comments'])

        return Response({
            'success': True,
            'message': 'Ревизия отклонена и возвращена в черновик',
            'revision': RevisionSerializer(revision).data
        })


class RevisionProductItemViewSet(viewsets.ModelViewSet):
    """ViewSet для элементов ревизии (продукты)."""

    queryset = RevisionProductItem.objects.all()
    serializer_class = RevisionProductItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ('revision', 'product')
    search_fields = ('product__title',)

    def get_queryset(self):
        """Ограничить доступ по ролям."""
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(revision__location__production_id=user.production_id)
            else:
                return queryset.none()
        
        # Сотрудник видит только свои ревизии
        if hasattr(user, 'role') and user.role == 'staff':
            queryset = queryset.filter(revision__author=user)
        
        return queryset


class RevisionIngredientItemViewSet(viewsets.ModelViewSet):
    """ViewSet для элементов ревизии (ингредиенты)."""

    queryset = RevisionIngredientItem.objects.all()
    serializer_class = RevisionIngredientItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ('revision', 'ingredient')
    search_fields = ('ingredient__title',)

    def get_queryset(self):
        """Ограничить доступ по ролям."""
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(revision__location__production_id=user.production_id)
            else:
                return queryset.none()
        
        # Сотрудник видит только свои ревизии
        if hasattr(user, 'role') and user.role == 'staff':
            queryset = queryset.filter(revision__author=user)
        
        return queryset


class RevisionReportViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для отчетов по ревизии (только чтение)."""

    queryset = RevisionReport.objects.all()
    serializer_class = RevisionReportSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ('revision', 'ingredient', 'status')
    search_fields = ('ingredient__title',)
    ordering_fields = ('percentage', 'status')
    ordering = ['-percentage']

    def get_queryset(self):
        """Ограничить доступ по ролям."""
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_superuser:
            if getattr(user, 'production_id', None):
                queryset = queryset.filter(revision__location__production_id=user.production_id)
            else:
                return queryset.none()
        
        # Сотрудник видит только свои ревизии
        if hasattr(user, 'role') and user.role == 'staff':
            queryset = queryset.filter(revision__author=user)
        
        return queryset
