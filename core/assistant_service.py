"""Локальный ассистент проекта без внешнего LLM."""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from django.utils import timezone

from products.models import Ingredient, Product, RecipeItem
from revisions.models import Revision
from sales.models import Incoming, IngredientInventory, Location


SECTION_DEFINITIONS = [
    {
        'key': 'revisions',
        'title': 'Ревизии',
        'path': '/',
        'description': 'Создание ревизий, заполнение продаж, номенклатуры, расчет и подтверждение.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'incoming',
        'title': 'Поступления',
        'path': '/incoming',
        'description': 'Учет поступлений позиции номенклатуры в граммах.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'recipe-cards',
        'title': 'Технологические карты',
        'path': '/recipe-cards',
        'description': 'Состав продукта: позиции номенклатуры и нормы расхода в граммах.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'how-it-works',
        'title': 'Как это работает',
        'path': '/how-it-works',
        'description': 'Подробная инструкция по работе с системой простыми шагами.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'inventories',
        'title': 'Текущие остатки',
        'path': '/ingredient-inventories',
        'description': 'Текущие остатки позиции номенклатуры (для manager).',
        'visible_for': {'manager'},
    },
    {
        'key': 'cabinet',
        'title': 'Кабинет',
        'path': '/cabinet',
        'description': 'Профиль, производство, точки и сотрудники (для manager).',
        'visible_for': {'manager'},
    },
]

STATUS_GUIDE = {
    'draft': 'Черновик — можно заполнять и редактировать.',
    'submitted': 'Отправлена на обработку — отправлена staff, ожидает действия руководящих ролей.',
    'processing': 'В обработке — можно считать/пересчитывать и подтверждать.',
    'completed': 'Завершена — подтверждена, но пересчет ревизии остается доступным.',
}


def _resolve_role(user) -> str | None:
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if getattr(user, 'role', None):
        return user.role
    if getattr(user, 'is_superuser', False):
        return 'admin'
    return None


def _is_managerial(role: str | None, user) -> bool:
    return bool(
        getattr(user, 'is_superuser', False)
        or getattr(user, 'is_staff', False)
        or role in {'admin', 'manager', 'accounting'}
    )


def _available_sections(role: str | None) -> list[dict[str, Any]]:
    if not role:
        return []
    return [section for section in SECTION_DEFINITIONS if role in section['visible_for']]


def _allowed_paths(role: str | None) -> set[str]:
    paths = {section['path'] for section in _available_sections(role)}
    if role in {'admin', 'manager', 'accounting', 'staff'}:
        paths.add('/revisions/new')
    return paths


def _normalize_history(history: Any) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []
    normalized = []
    for item in history:
        if not isinstance(item, dict):
            continue
        message_role = item.get('role')
        text = item.get('text')
        if message_role not in {'user', 'assistant'}:
            continue
        if not isinstance(text, str) or not text.strip():
            continue
        normalized.append({'role': message_role, 'text': text.strip()[:2000]})
    return normalized


def _normalize_actions(actions: Any, role: str | None) -> list[dict[str, str]]:
    if not isinstance(actions, list):
        return []

    allowed_paths = _allowed_paths(role)
    normalized: list[dict[str, str]] = []
    seen_paths = set()
    for action in actions:
        if not isinstance(action, dict):
            continue
        label = str(action.get('label', '')).strip()
        path = str(action.get('path', '')).strip()
        if not label or not path or path not in allowed_paths or path in seen_paths:
            continue
        normalized.append({'label': label[:60], 'path': path})
        seen_paths.add(path)
        if len(normalized) >= 6:
            break
    return normalized


def _filter_by_production(queryset, user, relation_path: str | None = None):
    if getattr(user, 'is_superuser', False):
        return queryset

    production_id = getattr(user, 'production_id', None)
    if not production_id:
        return queryset.none()

    field_name = f'{relation_path}__production_id' if relation_path else 'production_id'
    return queryset.filter(**{field_name: production_id})


def _visible_revisions_queryset(user):
    queryset = Revision.objects.all()
    if getattr(user, 'is_superuser', False):
        return queryset

    production_id = getattr(user, 'production_id', None)
    if not production_id:
        return queryset.none()

    queryset = queryset.filter(location__production_id=production_id)
    if getattr(user, 'role', None) == 'staff':
        return queryset.filter(author=user, status='draft')
    return queryset


def _build_default_actions(role: str | None, limit: int = 4) -> list[dict[str, str]]:
    return [
        {'label': section['title'], 'path': section['path']}
        for section in _available_sections(role)[:limit]
    ]


def _get_revision_snapshot(pathname: str, user) -> dict[str, Any] | None:
    match = re.match(r'^/revisions/(\d+)$', pathname.strip())
    if not match:
        return None

    revision_id = int(match.group(1))
    revision = _visible_revisions_queryset(user).filter(id=revision_id).first()
    if not revision:
        return None

    return {
        'id': revision.id,
        'status': revision.status,
        'status_text': STATUS_GUIDE.get(revision.status, revision.status),
        'product_items': revision.product_items.count(),
        'ingredient_items': revision.ingredient_items.count(),
        'reports': revision.reports.count(),
        'location_title': getattr(revision.location, 'title', ''),
        'revision_date': str(revision.revision_date),
    }


def _project_stats(user) -> dict[str, int]:
    revisions = _visible_revisions_queryset(user)
    locations = _filter_by_production(Location.objects.all(), user)
    products = _filter_by_production(Product.objects.all(), user)
    ingredients = _filter_by_production(Ingredient.objects.all(), user)
    recipe_items = _filter_by_production(RecipeItem.objects.all(), user, relation_path='product')
    incoming = _filter_by_production(Incoming.objects.all(), user, relation_path='location')
    ingredient_inventory = _filter_by_production(
        IngredientInventory.objects.all(),
        user,
        relation_path='location',
    )

    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    return {
        'locations_total': locations.count(),
        'products_total': products.count(),
        'ingredients_total': ingredients.count(),
        'recipe_items_total': recipe_items.count(),
        'incoming_30d': incoming.filter(date__gte=thirty_days_ago).count(),
        'ingredient_inventory_total': ingredient_inventory.count(),
        'revisions_total': revisions.count(),
        'revisions_draft': revisions.filter(status='draft').count(),
        'revisions_processing': revisions.filter(status='processing').count(),
        'revisions_completed': revisions.filter(status='completed').count(),
    }


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _role_permissions_text(role: str | None, user) -> str:
    if not role:
        return "Без авторизации доступна только форма входа и регистрация менеджера по токену."

    if role == 'staff':
        return (
            "Роль staff:\n"
            "• В ревизии: заполняет продажи, номенклатуру и поступления.\n"
            "• Может отправить ревизию на обработку.\n"
            "• Не подтверждает, не отклоняет, не удаляет ревизии.\n"
            "• Не редактирует продукты, номенклатуру и технологические карты."
        )

    if _is_managerial(role, user):
        extra = "• Для manager дополнительно доступен кабинет и текущие остатки."
        if role != 'manager':
            extra = "• Кабинет и текущие остатки доступны только manager."
        return (
            f"Роль {role}:\n"
            "• Полный цикл по ревизии: заполнение, расчет/пересчет, подтверждение.\n"
            "• Может удалять ревизии.\n"
            "• Может редактировать продукты, позиции номенклатуры, технологические карты, поступления.\n"
            f"{extra}"
        )

    return f"Роль {role}: проверьте доступы в интерфейсе и через менеджера/администратора."


def _revision_workflow_text(role: str | None, user) -> str:
    if role == 'staff':
        return (
            "Как работает ревизия для staff:\n"
            "1) Создайте ревизию и заполните раздел «Продажи» (шт.).\n"
            "2) Заполните «Номенклатура» и «Поступления» (в граммах).\n"
            "3) Нажмите «Отправить на обработку»."
        )

    if _is_managerial(role, user):
        return (
            "Как работает ревизия для руководящих ролей:\n"
            "1) Создайте/откройте ревизию и заполните продажи (шт.).\n"
            "2) Заполните номенклатуру и поступления (в граммах).\n"
            "3) Нажмите «Рассчитать ревизию».\n"
            "4) Проверьте отчет и нажмите «Подтвердить».\n"
            "5) При необходимости используйте «Пересчитать ревизию» даже в статусе «Завершена»."
        )

    return "Для начала войдите в систему."


def _status_help_text() -> str:
    return (
        "Статусы ревизии:\n"
        f"• draft — {STATUS_GUIDE['draft']}\n"
        f"• submitted — {STATUS_GUIDE['submitted']}\n"
        f"• processing — {STATUS_GUIDE['processing']}\n"
        f"• completed — {STATUS_GUIDE['completed']}"
    )


def _report_help_text() -> str:
    return (
        "Отчет по ревизии:\n"
        "• Ожидаемый остаток = расчет по техкартам и продажам с учетом поступлений.\n"
        "• Фактический остаток = введенное значение в номенклатуре.\n"
        "• Разница = факт - ожидаемый.\n"
        "• Статусы: Норма (0-3%), Внимание (3-10%), Критично (>10%)."
    )


def _full_manual_text(role: str | None, user) -> str:
    manager_block = (
        "Для manager дополнительно доступны:\n"
        "• Раздел «Текущие остатки».\n"
        "• Раздел «Кабинет» (пользователи, точки, профиль, производство).\n"
    )
    if role != 'manager':
        manager_block = (
            "Разделы «Текущие остатки» и «Кабинет» доступны только manager.\n"
        )

    workflow_block = _revision_workflow_text(role, user)

    return (
        "Подробная инструкция по системе Product Revision:\n\n"
        "1) Что означают разделы в шапке:\n"
        "• Ревизии — основной рабочий раздел.\n"
        "• Поступления — журнал поступлений номенклатуры.\n"
        "• Технологические карты — состав продуктов.\n"
        "• Как это работает — подробная инструкция.\n"
        f"{manager_block}\n"
        "2) Главные единицы измерения:\n"
        "• Продажи в ревизии: только штуки.\n"
        "• Номенклатура, поступления, техкарты: только граммы.\n\n"
        "3) Порядок работы:\n"
        f"{workflow_block}\n\n"
        "4) Что проверить перед расчетом ревизии:\n"
        "• Техкарты заполнены для нужных продуктов.\n"
        "• Продажи внесены в штуках.\n"
        "• Фактический остаток номенклатуры внесен в граммах.\n"
        "• Поступления (если были) внесены с датой и точкой.\n\n"
        "5) Как читать отчет:\n"
        "• Ожидаемый остаток — расчет системы.\n"
        "• Фактический остаток — что ввели вручную.\n"
        "• Разница = факт - ожидаемый.\n"
        "• Критично (>10%), Внимание (3-10%), Норма (0-3%).\n\n"
        "6) Частые ошибки:\n"
        "• Ввод не в тех единицах (шт вместо граммов).\n"
        "• Не выбрана позиция номенклатуры из списка.\n"
        "• Нажали «Подтвердить» без расчета.\n"
        "• Ищут кнопки, недоступные для текущей роли.\n\n"
        "7) Если не знаете, что делать:\n"
        "• Спросите ассистента: «что делать на этой странице».\n"
        "• Откройте вкладку «Как это работает»."
    )


def _current_page_help(pathname: str, role: str | None, user) -> dict[str, Any]:
    if pathname == '/' or pathname.startswith('/revisions'):
        snapshot = _get_revision_snapshot(pathname, user)
        if snapshot:
            return {
                'text': (
                    f"Ревизия #{snapshot['id']} ({snapshot['location_title']}, {snapshot['revision_date']}).\n"
                    f"Статус: {snapshot['status']} — {snapshot['status_text']}\n"
                    f"Продажи: {snapshot['product_items']}, Номенклатура: {snapshot['ingredient_items']}, Отчетов: {snapshot['reports']}.\n"
                    "В продажах количество в штуках, в номенклатуре и поступлениях — в граммах."
                ),
                'actions': [
                    {'label': 'Список ревизий', 'path': '/'},
                    {'label': 'Новая ревизия', 'path': '/revisions/new'},
                ],
            }
        return {
            'text': (
                "Раздел «Ревизии»: создайте ревизию, внесите продажи (шт.), "
                "заполните номенклатуру/поступления (граммы), затем рассчитайте и подтвердите."
            ),
            'actions': [
                {'label': 'Список ревизий', 'path': '/'},
                {'label': 'Новая ревизия', 'path': '/revisions/new'},
            ],
        }

    if pathname.startswith('/incoming'):
        return {
            'text': (
                "Раздел «Поступления»: здесь фиксируются поступления позиции номенклатуры.\n"
                "Заполняйте количество в граммах, обязательно выбирайте точку и дату."
            ),
            'actions': [{'label': 'Поступления', 'path': '/incoming'}],
        }

    if pathname.startswith('/recipe-cards'):
        return {
            'text': (
                "Раздел «Технологические карты»: задайте состав продукта.\n"
                "Каждая позиция номенклатуры указывается в граммах на единицу продукта."
            ),
            'actions': [{'label': 'Технологические карты', 'path': '/recipe-cards'}],
        }

    if pathname.startswith('/how-it-works'):
        return {
            'text': (
                "Раздел «Как это работает» содержит полную пошаговую инструкцию.\n"
                "Если вы новичок, проходите раздел сверху вниз по порядку."
            ),
            'actions': [{'label': 'Как это работает', 'path': '/how-it-works'}],
        }

    if pathname.startswith('/ingredient-inventories'):
        return {
            'text': (
                "Раздел «Текущие остатки»: показывает актуальные остатки позиции номенклатуры.\n"
                "Раздел доступен только manager."
            ),
            'actions': [{'label': 'Текущие остатки', 'path': '/ingredient-inventories'}],
        }

    if pathname.startswith('/cabinet'):
        return {
            'text': (
                "Раздел «Кабинет»: управление профилем, производством, точками и пользователями.\n"
                "Менеджер может создавать/редактировать/удалять пользователей, которых создал."
            ),
            'actions': [{'label': 'Кабинет', 'path': '/cabinet'}],
        }

    return {
        'text': "Спросите, что сделать на текущей странице, и я дам пошаговый план.",
        'actions': _build_default_actions(role),
    }


def _stats_text(user) -> str:
    stats = _project_stats(user)
    return (
        "Сводка по вашему доступу:\n"
        f"• Точки: {stats['locations_total']}\n"
        f"• Продукты: {stats['products_total']}\n"
        f"• Позиции номенклатуры: {stats['ingredients_total']}\n"
        f"• Позиции техкарт: {stats['recipe_items_total']}\n"
        f"• Поступления за 30 дней: {stats['incoming_30d']}\n"
        f"• Записей текущих остатков: {stats['ingredient_inventory_total']}\n"
        f"• Ревизии: всего {stats['revisions_total']} (черновик {stats['revisions_draft']}, "
        f"в обработке {stats['revisions_processing']}, завершено {stats['revisions_completed']})"
    )


def _fallback_reply(
    *,
    message: str,
    pathname: str,
    role: str | None,
    is_authenticated: bool,
    user,
) -> dict[str, Any]:
    normalized = (message or '').strip().lower()

    if not is_authenticated:
        return {
            'text': (
                "Войдите в аккаунт. После входа я буду подсказывать по вашей роли, "
                "доступным разделам и шагам по ревизии."
            ),
            'actions': [],
            'source': 'local',
        }

    if not normalized:
        reply = _current_page_help(pathname, role, user)
        reply['actions'] = _normalize_actions(reply.get('actions', []), role)
        reply['source'] = 'local'
        return reply

    if _contains_any(normalized, ['что делать', 'эта страниц', 'этой страниц', 'куда нажать', 'что дальше']):
        reply = _current_page_help(pathname, role, user)
        reply['actions'] = _normalize_actions(reply.get('actions', []), role)
        reply['source'] = 'local'
        return reply

    if _contains_any(normalized, ['права', 'роль', 'доступ', 'что могу', 'могу ли']):
        return {
            'text': _role_permissions_text(role, user),
            'actions': _build_default_actions(role, limit=5),
            'source': 'local',
        }

    if _contains_any(normalized, ['инструкц', 'как это работает', 'обуч', 'руководств', 'мануал', 'помощь по приложению']):
        return {
            'text': _full_manual_text(role, user),
            'actions': _normalize_actions(
                [
                    {'label': 'Как это работает', 'path': '/how-it-works'},
                    {'label': 'Ревизии', 'path': '/'},
                ],
                role,
            ),
            'source': 'local',
        }

    if _contains_any(normalized, ['статус', 'черновик', 'submitted', 'processing', 'завершен']):
        return {
            'text': _status_help_text(),
            'actions': [{'label': 'Ревизии', 'path': '/'}],
            'source': 'local',
        }

    if _contains_any(normalized, ['ревиз', 'расчет', 'пересчет', 'подтверд', 'отправ']):
        return {
            'text': _revision_workflow_text(role, user),
            'actions': _normalize_actions(
                [
                    {'label': 'Список ревизий', 'path': '/'},
                    {'label': 'Новая ревизия', 'path': '/revisions/new'},
                ],
                role,
            ),
            'source': 'local',
        }

    if _contains_any(normalized, ['отчет', 'критично', 'внимание', 'норма', 'разница', 'ожидаем']):
        return {
            'text': _report_help_text(),
            'actions': [{'label': 'Ревизии', 'path': '/'}],
            'source': 'local',
        }

    if _contains_any(normalized, ['поступлен', 'приход']):
        return {
            'text': (
                "Поступления фиксируются по позиции номенклатуры, точке и дате.\n"
                "Количество всегда вводится в граммах."
            ),
            'actions': _normalize_actions(
                [
                    {'label': 'Поступления', 'path': '/incoming'},
                    {'label': 'Ревизии', 'path': '/'},
                ],
                role,
            ),
            'source': 'local',
        }

    if _contains_any(normalized, ['тех', 'карт', 'рецепт', 'состав']):
        return {
            'text': (
                "Технологическая карта = продукт + позиции номенклатуры.\n"
                "Для каждой позиции укажите норму в граммах на единицу продукта."
            ),
            'actions': [{'label': 'Технологические карты', 'path': '/recipe-cards'}],
            'source': 'local',
        }

    if _contains_any(normalized, ['остатк', 'инвентар']):
        if role != 'manager':
            return {
                'text': (
                    "Раздел «Текущие остатки» доступен только manager.\n"
                    "Для других ролей основной контроль выполняется через отчет ревизии."
                ),
                'actions': [{'label': 'Ревизии', 'path': '/'}],
                'source': 'local',
            }
        return {
            'text': (
                "Откройте «Текущие остатки». Там видны актуальные остатки по позиции номенклатуры "
                "в разрезе точек."
            ),
            'actions': [{'label': 'Текущие остатки', 'path': '/ingredient-inventories'}],
            'source': 'local',
        }

    if _contains_any(normalized, ['кабинет', 'сотруд', 'пользоват', 'точк', 'профил', 'производств']):
        if role != 'manager':
            return {
                'text': "Кабинет управления доступен роли manager.",
                'actions': [{'label': 'Ревизии', 'path': '/'}],
                'source': 'local',
            }
        return {
            'text': (
                "В кабинете manager доступно:\n"
                "• редактирование профиля и производства,\n"
                "• создание/редактирование/удаление точек,\n"
                "• создание/редактирование/удаление пользователей staff/accounting."
            ),
            'actions': [{'label': 'Кабинет', 'path': '/cabinet'}],
            'source': 'local',
        }

    if _contains_any(normalized, ['грамм', 'единиц', 'единиц измерения', 'в чем вводить']):
        return {
            'text': (
                "Единицы ввода:\n"
                "• В продажах — количество в штуках.\n"
                "• В номенклатуре, поступлениях и техкартах — количество в граммах."
            ),
            'actions': _normalize_actions(
                [
                    {'label': 'Ревизии', 'path': '/'},
                    {'label': 'Поступления', 'path': '/incoming'},
                    {'label': 'Технологические карты', 'path': '/recipe-cards'},
                ],
                role,
            ),
            'source': 'local',
        }

    if _contains_any(normalized, ['статист', 'сводк', 'сколько', 'итог']):
        return {
            'text': _stats_text(user),
            'actions': _build_default_actions(role, limit=5),
            'source': 'local',
        }

    return {
        'text': (
            "Могу помочь по ревизиям, ролям, статусам, поступлениям, техкартам, "
            "остаткам, кабинету, подробной инструкции и сводке данных.\n"
            "Например: «как провести ревизию», «мои права», «покажи инструкцию», «сводка по данным»."
        ),
        'actions': _build_default_actions(role, limit=5),
        'source': 'local',
    }


def generate_assistant_reply(payload: dict[str, Any], user) -> dict[str, Any]:
    """Построить ответ ассистента для фронтенда."""
    payload = payload or {}
    history = _normalize_history(payload.get('history'))
    message = str(payload.get('message', '') or '').strip()
    if not message:
        for item in reversed(history):
            if item.get('role') == 'user':
                message = item.get('text', '')
                break

    context = payload.get('context') if isinstance(payload.get('context'), dict) else {}
    pathname = str(context.get('pathname', '/') or '/')
    role = _resolve_role(user)
    is_authenticated = bool(user and getattr(user, 'is_authenticated', False))

    return _fallback_reply(
        message=message,
        pathname=pathname,
        role=role,
        is_authenticated=is_authenticated,
        user=user,
    )
