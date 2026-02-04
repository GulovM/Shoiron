import hashlib


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def get_user_hash(request):
    cookie_uuid = request.COOKIES.get('shoieron_uid')
    if cookie_uuid:
        raw = f'shoieron:{cookie_uuid}'
    else:
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        raw = f'shoieron_ip:{ip}:{ua}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def slugify_fallback(value, fallback):
    try:
        from django.utils.text import slugify
    except Exception:
        return fallback
    slug = slugify(value)
    return slug or fallback
