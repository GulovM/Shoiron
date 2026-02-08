from __future__ import annotations

import secrets
import string
from datetime import date

from django.core.mail import send_mail
from django.utils import timezone


def parse_int(value, default, min_value=None, max_value=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    if min_value is not None:
        parsed = max(min_value, parsed)
    if max_value is not None:
        parsed = min(max_value, parsed)
    return parsed


def parse_page(request, default_size=25):
    page = parse_int(request.query_params.get('page'), 1, min_value=1)
    page_size = parse_int(request.query_params.get('page_size'), default_size, min_value=1, max_value=100)
    return page, page_size


def paginate_queryset(qs, page: int, page_size: int):
    total = qs.count()
    offset = (page - 1) * page_size
    return qs[offset : offset + page_size], total


def paginated_payload(items, total: int, page: int, page_size: int):
    return {
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': items,
    }


def parse_year_to_date(value):
    if value in (None, ''):
        return None
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None
    if year < 1:
        return None
    return date(year, 1, 1)


def date_to_year(value):
    if not value:
        return None
    return value.year


def current_month_start():
    now = timezone.localtime()
    return date(now.year, now.month, 1)


def current_month_label():
    now = timezone.localtime()
    return f'{now.month:02d}.{now.year}'


def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def send_temp_password_email(email: str, password: str):
    send_mail(
        subject='Shoiron Dashboard temporary password',
        message=f'Ваш временный пароль: {password}',
        from_email=None,
        recipient_list=[email],
        fail_silently=False,
    )
