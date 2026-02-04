from rest_framework.throttling import SimpleRateThrottle

from config.utils import get_client_ip, get_user_hash


class UserHashRateThrottle(SimpleRateThrottle):
    scope = 'default'

    def get_cache_key(self, request, view):
        ident = get_user_hash(request) or get_client_ip(request)
        if not ident:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class ReactionRateThrottle(UserHashRateThrottle):
    scope = 'reactions'


class SearchRateThrottle(UserHashRateThrottle):
    scope = 'search'


class ViewRateThrottle(SimpleRateThrottle):
    scope = 'views'

    def get_cache_key(self, request, view):
        ident = get_user_hash(request) or get_client_ip(request)
        poem_id = view.kwargs.get('pk') or request.data.get('poem_id')
        if not ident or not poem_id:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': f'{ident}:{poem_id}'}
