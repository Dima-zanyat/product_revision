"""Сервис ассистента: LLM-ответ + локальный fallback."""

import json
import logging
import re
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


SECTION_DEFINITIONS = [
    {
        'key': 'revisions',
        'title': 'Ревизии',
        'path': '/',
        'description': 'Создание и ведение ревизий, расчет и подтверждение.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'incoming',
        'title': 'Поступления',
        'path': '/incoming',
        'description': 'Ввод поступлений позиции номенклатуры в граммах.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'recipe-cards',
        'title': 'Технологические карты',
        'path': '/recipe-cards',
        'description': 'Состав продукта: позиции номенклатуры и расход в граммах.',
        'visible_for': {'admin', 'manager', 'accounting', 'staff'},
    },
    {
        'key': 'inventories',
        'title': 'Текущие остатки',
        'path': '/ingredient-inventories',
        'description': 'Сводка отклонений по остаткам (только менеджер).',
        'visible_for': {'manager'},
    },
    {
        'key': 'cabinet',
        'title': 'Кабинет',
        'path': '/cabinet',
        'description': 'Профиль, производство, точки и сотрудники (только менеджер).',
        'visible_for': {'manager'},
    },
]


def _resolve_role(user) -> str | None:
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if getattr(user, 'role', None):
        return user.role
    if getattr(user, 'is_superuser', False):
        return 'admin'
    return None


def _available_sections(role: str | None) -> list[dict[str, Any]]:
    if not role:
        return []
    return [
        section for section in SECTION_DEFINITIONS
        if role in section['visible_for']
    ]


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
        role = item.get('role')
        text = item.get('text')
        if role not in {'user', 'assistant'}:
            continue
        if not isinstance(text, str) or not text.strip():
            continue
        normalized.append({'role': role, 'text': text.strip()[:2000]})
    return normalized


def _normalize_actions(actions: Any, role: str | None) -> list[dict[str, str]]:
    allowed_paths = _allowed_paths(role)
    if not isinstance(actions, list):
        return []

    normalized = []
    seen = set()
    for action in actions:
        if not isinstance(action, dict):
            continue
        label = str(action.get('label', '')).strip()
        path = str(action.get('path', '')).strip()
        if not label or not path:
            continue
        if path not in allowed_paths:
            continue
        if path in seen:
            continue
        normalized.append({'label': label[:60], 'path': path})
        seen.add(path)
        if len(normalized) >= 5:
            break
    return normalized


def _extract_json_object(raw_text: str) -> dict[str, Any] | None:
    text = raw_text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def _llm_system_prompt(role: str | None, available_sections: list[dict[str, Any]]) -> str:
    sections_text = '\n'.join(
        f"- {section['title']} ({section['path']}): {section['description']}"
        for section in available_sections
    ) or '- Нет доступных разделов (пользователь не авторизован)'

    return (
        "Ты ассистент веб-приложения Product Revision.\n"
        "Отвечай на русском, кратко, по делу.\n"
        "Не выдумывай функционал и права доступа.\n"
        "В количестве позиции номенклатуры и поступлений используй единицы: граммы.\n"
        "Если данных недостаточно, прямо так и скажи.\n\n"
        f"Текущая роль пользователя: {role or 'не авторизован'}.\n"
        "Доступные разделы:\n"
        f"{sections_text}\n\n"
        "Верни СТРОГО JSON без markdown:\n"
        "{\n"
        '  "text": "текст ответа",\n'
        '  "actions": [{"label": "Название", "path": "/path"}]\n'
        "}\n"
        "actions должен содержать только доступные пользователю пути."
    )


def _build_default_actions(role: str | None, limit: int = 3) -> list[dict[str, str]]:
    return [
        {'label': section['title'], 'path': section['path']}
        for section in _available_sections(role)[:limit]
    ]


def _current_page_help(pathname: str, role: str | None) -> dict[str, Any]:
    if pathname.startswith('/incoming'):
        return {
            'text': (
                "Поступления: укажите позицию номенклатуры, количество в граммах, "
                "точку и дату. Эти данные участвуют в расчете ревизии."
            ),
            'actions': [{'label': 'Поступления', 'path': '/incoming'}],
        }
    if pathname.startswith('/recipe-cards'):
        return {
            'text': (
                "Технологические карты: для каждого продукта задайте позиции "
                "номенклатуры и норму расхода в граммах."
            ),
            'actions': [{'label': 'Технологические карты', 'path': '/recipe-cards'}],
        }
    if pathname.startswith('/ingredient-inventories'):
        return {
            'text': (
                "Текущие остатки: отслеживайте отклонения по позициям номенклатуры "
                "и переходите в ревизии для детальной сверки."
            ),
            'actions': [{'label': 'Ревизии', 'path': '/'}],
        }
    if pathname.startswith('/cabinet'):
        return {
            'text': (
                "Кабинет: редактирование профиля и производства, управление точками "
                "и сотрудниками."
            ),
            'actions': [{'label': 'Кабинет', 'path': '/cabinet'}],
        }
    if pathname == '/' or pathname.startswith('/revisions'):
        return {
            'text': (
                "Ревизии: создайте ревизию, заполните продажи и номенклатуру, "
                "выполните расчет, затем подтвердите."
            ),
            'actions': [
                {'label': 'Список ревизий', 'path': '/'},
                {'label': 'Новая ревизия', 'path': '/revisions/new'},
            ],
        }

    return {
        'text': "Задайте вопрос по текущему разделу, и я подскажу следующий шаг.",
        'actions': _build_default_actions(role),
    }


def _fallback_reply(message: str, pathname: str, role: str | None, is_authenticated: bool) -> dict[str, Any]:
    normalized = (message or '').strip().lower()

    if not is_authenticated:
        return {
            'text': (
                "Войдите в аккаунт, чтобы получить подсказки по вашей роли и "
                "доступным разделам."
            ),
            'actions': [],
            'source': 'fallback',
        }

    if (
        not normalized
        or 'что делать' in normalized
        or 'эта страниц' in normalized
        or 'этой страниц' in normalized
    ):
        page_help = _current_page_help(pathname, role)
        page_help['source'] = 'fallback'
        page_help['actions'] = _normalize_actions(page_help.get('actions'), role)
        return page_help

    if 'прав' in normalized or 'роль' in normalized:
        if role == 'staff':
            text = (
                "Роль staff: заполняете ревизию и отправляете на проверку. "
                "Подтверждение и расчет выполняют руководящие роли."
            )
        else:
            text = (
                f"Роль {role}: доступно полное ведение ревизии — заполнение, "
                "расчет, подтверждение и пересчет."
            )
        return {
            'text': text,
            'actions': _build_default_actions(role, limit=4),
            'source': 'fallback',
        }

    if 'раздел' in normalized or 'доступ' in normalized or 'ссылк' in normalized:
        sections = _available_sections(role)
        text = "Доступные разделы:\n" + '\n'.join(
            f"{idx + 1}) {section['title']} — {section['description']}"
            for idx, section in enumerate(sections)
        )
        return {
            'text': text,
            'actions': _build_default_actions(role, limit=5),
            'source': 'fallback',
        }

    if 'ревиз' in normalized:
        return {
            'text': (
                "Порядок работы: 1) заполните продажи, 2) внесите номенклатуру "
                "и поступления, 3) рассчитайте ревизию, 4) подтвердите результат."
            ),
            'actions': _normalize_actions(
                [
                    {'label': 'Список ревизий', 'path': '/'},
                    {'label': 'Новая ревизия', 'path': '/revisions/new'},
                ],
                role
            ),
            'source': 'fallback',
        }

    return {
        'text': (
            "Уточните вопрос. Я могу помочь по ревизиям, поступлениям, "
            "технологическим картам, ролям и доступным разделам."
        ),
        'actions': _build_default_actions(role),
        'source': 'fallback',
    }


def _call_openai_assistant(
    *,
    message: str,
    history: list[dict[str, str]],
    role: str | None,
    pathname: str,
    is_authenticated: bool,
    username: str,
) -> dict[str, Any] | None:
    if not settings.ASSISTANT_ENABLE_LLM:
        return None
    if not settings.OPENAI_API_KEY:
        return None

    available_sections = _available_sections(role)
    system_prompt = _llm_system_prompt(role, available_sections)

    context_payload = {
        'pathname': pathname,
        'is_authenticated': is_authenticated,
        'username': username,
        'role': role,
        'available_sections': [
            {
                'title': section['title'],
                'path': section['path'],
                'description': section['description'],
            }
            for section in available_sections
        ],
    }

    messages = [
        {'role': 'system', 'content': system_prompt},
        {
            'role': 'system',
            'content': f"Контекст:\n{json.dumps(context_payload, ensure_ascii=False)}",
        },
    ]

    max_history = max(0, int(settings.ASSISTANT_MAX_HISTORY))
    for item in history[-max_history:]:
        messages.append({'role': item['role'], 'content': item['text']})
    messages.append({'role': 'user', 'content': message or 'Подскажи, что делать дальше.'})

    endpoint = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        'Authorization': f'Bearer {settings.OPENAI_API_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': settings.OPENAI_MODEL,
        'messages': messages,
        'temperature': 0.2,
    }

    response = requests.post(
        endpoint,
        headers=headers,
        json=payload,
        timeout=25,
    )
    response.raise_for_status()
    data = response.json()

    content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    if isinstance(content, list):
        content = ''.join(
            item.get('text', '')
            for item in content
            if isinstance(item, dict)
        )
    content = str(content or '').strip()
    if not content:
        return None

    parsed = _extract_json_object(content)
    if parsed is None:
        return {
            'text': content[:2500],
            'actions': _build_default_actions(role),
            'source': 'llm',
        }

    text = str(parsed.get('text', '')).strip()
    actions = _normalize_actions(parsed.get('actions', []), role)
    if not text:
        text = "Не удалось сформировать ответ. Уточните вопрос."
    if not actions:
        actions = _build_default_actions(role)

    return {
        'text': text[:2500],
        'actions': actions,
        'source': 'llm',
    }


def generate_assistant_reply(payload: dict[str, Any], user) -> dict[str, Any]:
    """Построить ответ ассистента для фронтенда."""
    payload = payload or {}
    message = str(payload.get('message', '') or '').strip()
    history = _normalize_history(payload.get('history'))
    context = payload.get('context') if isinstance(payload.get('context'), dict) else {}
    pathname = str(context.get('pathname', '/') or '/')

    role = _resolve_role(user)
    is_authenticated = bool(user and getattr(user, 'is_authenticated', False))
    username = getattr(user, 'username', '') if is_authenticated else ''

    try:
        llm_reply = _call_openai_assistant(
            message=message,
            history=history,
            role=role,
            pathname=pathname,
            is_authenticated=is_authenticated,
            username=username,
        )
        if llm_reply:
            return llm_reply
    except Exception as exc:
        logger.warning("LLM assistant fallback activated: %s", exc)

    return _fallback_reply(
        message=message,
        pathname=pathname,
        role=role,
        is_authenticated=is_authenticated,
    )
