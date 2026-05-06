"""Signals для каскадного удаления связанных сущностей users."""

from __future__ import annotations

from threading import local

from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver

from .models import Production, User


_deletion_state = local()


def _get_deleting_production_ids() -> set[int]:
    ids = getattr(_deletion_state, 'production_ids', None)
    if ids is None:
        ids = set()
        _deletion_state.production_ids = ids
    return ids


@receiver(pre_delete, sender=Production)
def mark_production_deleting(sender, instance: Production, **kwargs):
    """Пометить production как удаляемое, чтобы избежать рекурсивного удаления."""
    _get_deleting_production_ids().add(instance.id)


@receiver(post_delete, sender=Production)
def unmark_production_deleting(sender, instance: Production, **kwargs):
    """Снять пометку после удаления production."""
    _get_deleting_production_ids().discard(instance.id)


@receiver(post_delete, sender=User)
def cascade_delete_production_on_manager_delete(sender, instance: User, **kwargs):
    """
    При удалении manager удаляем его производство.

    Это удалит все связанные сущности производства через каскадные FK.
    """
    production_id = getattr(instance, 'production_id', None)
    if not production_id:
        return
    if getattr(instance, 'role', None) != 'manager':
        return
    if production_id in _get_deleting_production_ids():
        return
    Production.objects.filter(id=production_id).delete()
