from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from django.contrib.auth import get_user_model

from .models import DashboardUser, Role, RolePermission


MODULES = [
    RolePermission.MODULE_AUTHORS,
    RolePermission.MODULE_POEMS,
    RolePermission.MODULE_EMPLOYEES,
    RolePermission.MODULE_ROLES,
]

ACTION_FIELD = {
    'create': 'can_create',
    'read': 'can_read',
    'update': 'can_update',
    'delete': 'can_delete',
}


@dataclass
class DashboardAccess:
    profile: DashboardUser | None
    is_allowed: bool
    reason: str | None = None


def empty_permission_matrix() -> Dict[str, Dict[str, bool]]:
    return {module: {'create': False, 'read': False, 'update': False, 'delete': False} for module in MODULES}


def role_permission_matrix(role: Role | None) -> Dict[str, Dict[str, bool]]:
    matrix = empty_permission_matrix()
    if not role:
        return matrix

    for item in role.permissions.all():
        matrix[item.module] = {
            'create': item.can_create,
            'read': item.can_read,
            'update': item.can_update,
            'delete': item.can_delete,
        }
    return matrix


def role_has_permission(role: Role | None, module: str, action: str) -> bool:
    if not role or module not in MODULES:
        return False
    field = ACTION_FIELD.get(action)
    if not field:
        return False
    perm = role.permissions.filter(module=module).first()
    return bool(getattr(perm, field, False))


def get_dashboard_access(user) -> DashboardAccess:
    if not user or not user.is_authenticated:
        return DashboardAccess(profile=None, is_allowed=False, reason='auth_required')

    if user.is_superuser:
        try:
            profile = DashboardUser.objects.select_related('role', 'user').prefetch_related('role__permissions').get(
                user=user
            )
        except DashboardUser.DoesNotExist:
            profile = None
        return DashboardAccess(profile=profile, is_allowed=True, reason=None)

    try:
        profile = DashboardUser.objects.select_related('role', 'user').prefetch_related('role__permissions').get(user=user)
    except DashboardUser.DoesNotExist:
        return DashboardAccess(profile=None, is_allowed=False, reason='dashboard_user_missing')

    if profile.deleted_at:
        return DashboardAccess(profile=profile, is_allowed=False, reason='dashboard_user_deleted')
    if not profile.is_active or not profile.user.is_active:
        return DashboardAccess(profile=profile, is_allowed=False, reason='dashboard_user_inactive')
    if not profile.role:
        return DashboardAccess(profile=profile, is_allowed=False, reason='role_missing')
    if profile.role.deleted_at or not profile.role.is_active:
        return DashboardAccess(profile=profile, is_allowed=False, reason='role_inactive')

    return DashboardAccess(profile=profile, is_allowed=True, reason=None)


def user_has_permission(user, module: str, action: str) -> bool:
    access = get_dashboard_access(user)
    if not access.is_allowed:
        return False
    if user.is_superuser:
        return True
    return role_has_permission(access.profile.role, module, action)


def user_has_any_read_permission(user) -> bool:
    access = get_dashboard_access(user)
    if not access.is_allowed:
        return False
    if user.is_superuser:
        return True
    return any(role_has_permission(access.profile.role, module, 'read') for module in MODULES)


def is_admin_capable_role(role: Role | None) -> bool:
    if not role or role.deleted_at or not role.is_active:
        return False
    for module in MODULES:
        for action in ACTION_FIELD:
            if not role_has_permission(role, module, action):
                return False
    return True


def count_active_admin_capable_users(exclude_profile_id: int | None = None) -> int:
    qs = DashboardUser.objects.select_related('role', 'user').filter(
        deleted_at__isnull=True,
        is_active=True,
        user__is_active=True,
        role__deleted_at__isnull=True,
        role__is_active=True,
    )
    if exclude_profile_id:
        qs = qs.exclude(pk=exclude_profile_id)

    total = 0
    for profile in qs:
        if is_admin_capable_role(profile.role):
            total += 1
    return total


def ensure_role_permission_rows(role: Role):
    for module in MODULES:
        RolePermission.objects.get_or_create(role=role, module=module)
