from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .assistant_service import generate_assistant_reply


def spa(request):
    index_path = Path(settings.BASE_DIR) / 'frontend' / 'build' / 'index.html'
    if not index_path.exists():
        return HttpResponseNotFound(
            'Frontend build not found. Build it with: cd frontend && npm ci && npm run build'
        )

    return HttpResponse(index_path.read_text(encoding='utf-8'), content_type='text/html')


@api_view(['POST'])
@permission_classes([AllowAny])
def assistant_chat(request):
    """Чат-эндпоинт ассистента."""
    if not isinstance(request.data, dict):
        return Response(
            {'error': 'Некорректное тело запроса'},
            status=status.HTTP_400_BAD_REQUEST
        )

    message = request.data.get('message', '')
    if message is not None and not isinstance(message, str):
        return Response(
            {'error': 'Поле "message" должно быть строкой'},
            status=status.HTTP_400_BAD_REQUEST
        )

    payload = {
        'message': message or '',
        'history': request.data.get('history', []),
        'context': request.data.get('context', {}),
    }
    reply = generate_assistant_reply(payload=payload, user=request.user)
    return Response(reply)
