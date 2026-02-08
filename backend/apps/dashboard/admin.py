from django.contrib import admin

from .models import DashboardUser, Role, RolePermission, SiteSettings


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_active', 'created_at', 'deleted_at']
    search_fields = ['name']
    list_filter = ['is_active', 'deleted_at']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'role', 'module', 'can_create', 'can_read', 'can_update', 'can_delete']
    list_filter = ['module']
    search_fields = ['role__name']


@admin.register(DashboardUser)
class DashboardUserAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'user', 'role', 'is_active', 'created_at', 'deleted_at']
    search_fields = ['full_name', 'user__email']
    list_filter = ['is_active', 'deleted_at']


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ['id', 'seo_title', 'updated_at']
