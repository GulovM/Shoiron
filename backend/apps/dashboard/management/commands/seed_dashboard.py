import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.dashboard.models import DashboardUser, Role
from apps.dashboard.rbac import MODULES, ensure_role_permission_rows


class Command(BaseCommand):
    help = 'Seed dashboard role and admin user.'

    def handle(self, *args, **options):
        role_name = os.environ.get('DASHBOARD_ADMIN_ROLE', 'Administrator')
        email = os.environ.get('DASHBOARD_ADMIN_EMAIL') or os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('DASHBOARD_ADMIN_PASSWORD') or os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        full_name = os.environ.get('DASHBOARD_ADMIN_NAME', 'Dashboard Admin')

        role, _ = Role.objects.get_or_create(
            name=role_name,
            defaults={'is_active': True},
        )
        role.is_active = True
        role.deleted_at = None
        role.deleted_by = None
        role.save(update_fields=['is_active', 'deleted_at', 'deleted_by', 'updated_at'])

        ensure_role_permission_rows(role)
        for permission in role.permissions.filter(module__in=MODULES):
            permission.can_create = True
            permission.can_read = True
            permission.can_update = True
            permission.can_delete = True
            permission.save(update_fields=['can_create', 'can_read', 'can_update', 'can_delete', 'updated_at'])

        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        if not user:
            user = user_model.objects.create_user(
                username=email.lower(),
                email=email.lower(),
                password=password,
                is_staff=True,
                is_active=True,
            )
            created_user = True
        else:
            created_user = False
            user.email = email.lower()
            user.username = user.username or email.lower()
            user.is_staff = True
            user.is_active = True
            user.set_password(password)
            user.save()

        profile, _ = DashboardUser.objects.get_or_create(
            user=user,
            defaults={
                'full_name': full_name,
                'role': role,
                'is_active': True,
            },
        )
        profile.full_name = full_name
        profile.role = role
        profile.is_active = True
        profile.deleted_at = None
        profile.deleted_by = None
        profile.must_change_password = False
        profile.temp_password_expires_at = None
        profile.save()

        message = 'created' if created_user else 'updated'
        self.stdout.write(self.style.SUCCESS(f'Dashboard admin user {message}: {email}'))
