"""
Views для приложения users.
"""

import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import ProductionInvite, Production, User

def _production_payload(user):
    production = getattr(user, 'production', None)
    if not production:
        return None
    if getattr(user, 'role', None) == 'staff':
        return None
    return {
        'id': production.id,
        'unique_key': production.unique_key,
        'name': production.name,
        'city': production.city,
        'legal_name': production.legal_name,
        'inn': production.inn,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    API endpoint для входа в систему.
    
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Необходимо указать username и password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request=request, username=username, password=password)
    
    if user is not None:
        if user.is_active:
            login(request, user)
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': getattr(user, 'email', ''),
                    'role': getattr(user, 'role', None),
                    'is_staff': bool(getattr(user, 'is_staff', False)),
                    'is_superuser': bool(getattr(user, 'is_superuser', False)),
                    'production': _production_payload(user),
                }
            })
        else:
            return Response(
                {'error': 'Аккаунт неактивен'},
                status=status.HTTP_403_FORBIDDEN
            )
    else:
        return Response(
            {'error': 'Неверное имя пользователя или пароль'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    API endpoint для выхода из системы.
    
    POST /api/auth/logout/
    """
    logout(request)
    return Response({'success': True, 'message': 'Вы успешно вышли из системы'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Получить информацию о текущем пользователе.
    
    GET /api/auth/me/
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': getattr(user, 'email', ''),
        'role': getattr(user, 'role', None),
        'is_staff': bool(getattr(user, 'is_staff', False)),
        'is_superuser': bool(getattr(user, 'is_superuser', False)),
        'production': _production_payload(user),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    """
    Получить CSRF токен.
    
    GET /api/auth/csrf/
    """
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_manager(request):
    """
    Регистрация менеджера по инвайт-ссылке.

    POST /api/auth/register/
    Body: { token, username, password, name, city, legal_name, inn?, first_name?, last_name?, email? }
    """
    token = request.data.get('token')
    username = request.data.get('username')
    password = request.data.get('password')
    name = request.data.get('name')
    city = request.data.get('city')
    legal_name = request.data.get('legal_name')
    inn = request.data.get('inn')

    if not token:
        return Response({'error': 'Не указан токен'}, status=status.HTTP_400_BAD_REQUEST)
    if not username or not password:
        return Response({'error': 'Необходимо указать username и password'}, status=status.HTTP_400_BAD_REQUEST)
    if not name or not city or not legal_name:
        return Response({'error': 'Не заполнены данные производства'}, status=status.HTTP_400_BAD_REQUEST)

    invite = ProductionInvite.objects.filter(token=token).first()
    if not invite:
        return Response({'error': 'Недействительный токен'}, status=status.HTTP_400_BAD_REQUEST)
    if invite.used_at:
        return Response({'error': 'Токен уже использован'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Пользователь с таким username уже существует'}, status=status.HTTP_400_BAD_REQUEST)

    def generate_unique_key():
        return uuid.uuid4().hex[:12]

    with transaction.atomic():
        unique_key = generate_unique_key()
        while Production.objects.filter(unique_key=unique_key).exists():
            unique_key = generate_unique_key()

        production = Production.objects.create(
            unique_key=unique_key,
            name=name,
            city=city,
            legal_name=legal_name,
            inn=inn or None,
        )

        user = User.objects.create_user(
            username=username,
            password=password,
            role='manager',
            first_name=request.data.get('first_name', '') or '',
            last_name=request.data.get('last_name', '') or '',
            email=request.data.get('email', '') or '',
            production=production,
            created_by=invite.created_by,
        )

        invite.used_at = timezone.now()
        invite.used_by = user
        invite.production = production
        invite.save(update_fields=['used_at', 'used_by', 'production'])

    return Response({
        'success': True,
        'message': 'Производство зарегистрировано',
        'production': {
            'id': production.id,
            'unique_key': production.unique_key,
            'name': production.name,
            'city': production.city,
            'legal_name': production.legal_name,
            'inn': production.inn,
        }
    }, status=status.HTTP_201_CREATED)
