from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission

from .rbac import get_dashboard_access, user_has_any_read_permission, user_has_permission


class DashboardSessionAuthentication(SessionAuthentication):
    pass


class DashboardAccessPermission(BasePermission):
    message = 'Access denied.'

    def has_permission(self, request, view):
        access = get_dashboard_access(request.user)
        if not access.is_allowed:
            self.message = 'Authentication required.'
            return False

        profile = access.profile
        if profile and profile.must_change_password and not getattr(view, 'allow_when_password_change_required', False):
            self.message = 'Password change required.'
            return False

        required_module = getattr(view, 'required_module', None)
        required_action = getattr(view, 'required_action', None)

        if getattr(view, 'requires_any_read', False):
            return user_has_any_read_permission(request.user)

        if required_module and required_action:
            allowed = user_has_permission(request.user, required_module, required_action)
            if not allowed:
                self.message = 'Insufficient permissions.'
            return allowed

        return True
