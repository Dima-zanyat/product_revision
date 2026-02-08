"""
URL конфигурация проекта.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from revisions.viewsets import (
    RevisionViewSet,
    RevisionProductItemViewSet,
    RevisionIngredientItemViewSet,
    RevisionReportViewSet,
)
from sales.viewsets import LocationViewSet, IncomingViewSet
from products.viewsets import ProductViewSet, IngredientViewSet, RecipeItemViewSet
from users.views import login_view, logout_view, current_user, csrf_token
from revisions.views import upload_excel_products
from core.views import spa

# Создать router для API
router = DefaultRouter()
router.register(r'revisions', RevisionViewSet, basename='revision')
router.register(r'revision-product-items',
                RevisionProductItemViewSet, basename='revision-product-item')
router.register(r'revision-ingredient-items',
                RevisionIngredientItemViewSet, basename='revision-ingredient-item')
router.register(r'revision-reports', RevisionReportViewSet,
                basename='revision-report')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'incoming', IncomingViewSet, basename='incoming')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'recipe-items', RecipeItemViewSet, basename='recipe-item')

urlpatterns = [
    path('admin/', admin.site.urls),
    path(
        'api/health/',
        lambda request: JsonResponse({'status': 'ok'}),
        name='health_check'
    ),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/me/', current_user, name='current_user'),
    path('api/auth/csrf/', csrf_token, name='csrf_token'),
    path(
        'api/revision-product-items/upload-excel/',
        upload_excel_products,
        name='upload_excel_products'
    ),
    # React SPA entrypoint (must be last)
    re_path(r'^(?!api/|admin/).*$', spa),
]
