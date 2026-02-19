from pathlib import Path

import dj_database_url
from decouple import config


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
ENVIRONMENT = config('ENVIRONMENT', default='development')
IS_PRODUCTION = ENVIRONMENT.lower() in ('prod', 'production')
SECRET_KEY = config('SECRET_KEY', default='unsafe-development-key' if not IS_PRODUCTION else None)
if IS_PRODUCTION and not SECRET_KEY:
    raise RuntimeError('Missing required env var SECRET_KEY for production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=(not IS_PRODUCTION), cast=bool)

_render_hostname = config('RENDER_EXTERNAL_HOSTNAME', default='product-revision.onrender.com').strip()
_default_hosts = ['localhost', '127.0.0.1']
if _render_hostname:
    _default_hosts.append(_render_hostname)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default=','.join(_default_hosts)).split(',')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]
FRONTEND_BASE_URL = config(
    'FRONTEND_BASE_URL',
    default=(f"https://{_render_hostname}" if _render_hostname else "http://localhost:3000")
)


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'users',
    'products',
    'sales',
    'revisions',
    'rest_framework',
    'corsheaders',


]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'frontend' / 'build',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=IS_PRODUCTION,
        )
    }
else:
    # Локальный fallback, чтобы проект мог стартовать без Postgres env.
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Europe/Moscow'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
_frontend_static_dir = BASE_DIR / 'frontend' / 'build' / 'static'
STATICFILES_DIRS = [p for p in [_frontend_static_dir] if p.exists()]

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}


AUTH_USER_MODEL = 'users.User'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if _render_hostname:
    CORS_ALLOWED_ORIGINS.append(f"https://{_render_hostname}")

CORS_ALLOW_CREDENTIALS = True

# CSRF settings для работы с CORS
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if _render_hostname:
    CSRF_TRUSTED_ORIGINS.append(f"https://{_render_hostname}")
CSRF_COOKIE_HTTPONLY = False  # Чтобы JavaScript мог читать cookie
CSRF_COOKIE_SAMESITE = 'Lax'

# Security (production behind proxy like Render)
USE_HTTPS = config('USE_HTTPS', default=IS_PRODUCTION, cast=bool)
if USE_HTTPS:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
