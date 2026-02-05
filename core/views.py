from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound


def spa(request):
    index_path = Path(settings.BASE_DIR) / 'frontend' / 'build' / 'index.html'
    if not index_path.exists():
        return HttpResponseNotFound(
            'Frontend build not found. Build it with: cd frontend && npm ci && npm run build'
        )

    return HttpResponse(index_path.read_text(encoding='utf-8'), content_type='text/html')

