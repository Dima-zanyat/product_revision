"""
Views для приложения users.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie


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
                    'email': getattr(user, 'email', ''),
                    'role': getattr(user, 'role', None),
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
        'email': getattr(user, 'email', ''),
        'role': getattr(user, 'role', None),
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
