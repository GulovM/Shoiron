from django.conf import settings
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(TimestampedModel):
    deleted_at = models.DateTimeField(blank=True, null=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='%(app_label)s_%(class)s_deleted',
    )

    class Meta:
        abstract = True

    @property
    def is_deleted(self):
        return self.deleted_at is not None


class Role(SoftDeleteModel):
    name = models.CharField(max_length=120, unique=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class RolePermission(TimestampedModel):
    MODULE_AUTHORS = 'authors'
    MODULE_POEMS = 'poems'
    MODULE_EMPLOYEES = 'employees'
    MODULE_ROLES = 'roles'

    MODULE_CHOICES = [
        (MODULE_AUTHORS, 'Authors'),
        (MODULE_POEMS, 'Poems'),
        (MODULE_EMPLOYEES, 'Employees'),
        (MODULE_ROLES, 'Roles'),
    ]

    role = models.ForeignKey(Role, related_name='permissions', on_delete=models.CASCADE)
    module = models.CharField(max_length=30, choices=MODULE_CHOICES)
    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=False)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['role', 'module'], name='uniq_role_permission_module'),
        ]
        ordering = ['module']

    def __str__(self):
        return f'{self.role_id}:{self.module}'


class DashboardUser(SoftDeleteModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name='dashboard_profile', on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255, db_index=True)
    role = models.ForeignKey(Role, related_name='employees', on_delete=models.SET_NULL, blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    must_change_password = models.BooleanField(default=False)
    temp_password_expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name

    @property
    def email(self):
        return self.user.email

    def has_expired_temp_password(self):
        if not self.temp_password_expires_at:
            return False
        return timezone.now() > self.temp_password_expires_at


class SiteSettings(TimestampedModel):
    logo = models.ImageField(upload_to='site/', blank=True, null=True)
    seo_title = models.CharField(max_length=255, blank=True, default='')
    seo_description = models.TextField(blank=True, default='')
    contacts_phone = models.CharField(max_length=64, blank=True, default='')
    contacts_email = models.EmailField(blank=True, default='')
    contacts_address = models.CharField(max_length=255, blank=True, default='')
    contacts_telegram = models.CharField(max_length=255, blank=True, default='')
    about_markdown = models.TextField(blank=True, default='')
    analytics_google_analytics_tag = models.CharField(max_length=255, blank=True, default='')
    analytics_google_search_console_tag = models.CharField(max_length=255, blank=True, default='')
    analytics_yandex_metrica_tag = models.CharField(max_length=255, blank=True, default='')
    analytics_yandex_webmaster_tag = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        verbose_name = 'Site settings'
        verbose_name_plural = 'Site settings'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
