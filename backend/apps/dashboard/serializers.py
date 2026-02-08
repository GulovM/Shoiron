from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.authors.models import Author
from apps.poems.models import Poem
from .models import DashboardUser, Role, RolePermission, SiteSettings
from .utils import date_to_year, parse_year_to_date


User = get_user_model()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, max_length=128)
    confirm_password = serializers.CharField(min_length=8, max_length=128)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ['module', 'can_create', 'can_read', 'can_update', 'can_delete']


class RoleSerializer(serializers.ModelSerializer):
    employees_count = serializers.IntegerField(read_only=True)
    permissions = RolePermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
            'employees_count',
            'permissions',
        ]


class RoleWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    is_active = serializers.BooleanField(default=True)
    permissions = RolePermissionSerializer(many=True)
    employee_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)


class DashboardUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = DashboardUser
        fields = [
            'id',
            'full_name',
            'email',
            'role',
            'is_active',
            'must_change_password',
            'temp_password_expires_at',
            'created_at',
            'updated_at',
            'deleted_at',
        ]

    def get_role(self, obj):
        if not obj.role:
            return None
        return {
            'id': obj.role_id,
            'name': obj.role.name,
            'is_active': obj.role.is_active,
        }

    def get_email(self, obj):
        return obj.user.email


class DashboardUserWriteSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    role_id = serializers.IntegerField()
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, required=False, allow_blank=False)
    password_confirm = serializers.CharField(min_length=8, max_length=128, required=False, allow_blank=False)
    is_active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm = attrs.get('password_confirm')
        creating = self.context.get('creating', False)
        if creating and not password:
            raise serializers.ValidationError({'password': 'Password is required.'})
        if password and password != confirm:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs


class DashboardUserResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, max_length=128)
    confirm_password = serializers.CharField(min_length=8, max_length=128)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class AuthorAdminSerializer(serializers.ModelSerializer):
    birth_year = serializers.SerializerMethodField()
    death_year = serializers.SerializerMethodField()
    poems_count = serializers.IntegerField(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'birth_year',
            'death_year',
            'biography_md',
            'photo_url',
            'avatar_crop',
            'is_published',
            'poems_count',
            'created_at',
            'updated_at',
            'deleted_at',
        ]

    def get_birth_year(self, obj):
        return date_to_year(obj.birth_date)

    def get_death_year(self, obj):
        return date_to_year(obj.death_date)

    def get_photo_url(self, obj):
        if obj.photo:
            url = obj.photo.url
            if settings.PUBLIC_BASE_URL:
                return f'{settings.PUBLIC_BASE_URL}{url}'
            request = self.context.get('request')
            return request.build_absolute_uri(url) if request else url
        return obj.photo_url


class AuthorWriteSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    birth_year = serializers.IntegerField(required=False, allow_null=True)
    death_year = serializers.IntegerField(required=False, allow_null=True)
    biography_md = serializers.CharField(required=False, allow_blank=True)
    is_published = serializers.BooleanField(default=True)
    avatar_crop = serializers.JSONField(required=False)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        value['birth_date'] = parse_year_to_date(value.pop('birth_year', None))
        value['death_date'] = parse_year_to_date(value.pop('death_year', None))
        return value


class PoemAdminSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = Poem
        fields = [
            'id',
            'title',
            'text',
            'author',
            'is_published',
            'views',
            'created_at',
            'updated_at',
            'deleted_at',
        ]

    def get_author(self, obj):
        return {
            'id': obj.author_id,
            'full_name': obj.author.full_name,
            'is_published': obj.author.is_published,
            'deleted_at': obj.author.deleted_at,
        }


class PoemWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    text = serializers.CharField()
    author_id = serializers.IntegerField()
    is_published = serializers.BooleanField(default=True)


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            'id',
            'logo_url',
            'logo',
            'seo_title',
            'seo_description',
            'contacts_phone',
            'contacts_email',
            'contacts_address',
            'contacts_telegram',
            'about_markdown',
            'analytics_google_analytics_tag',
            'analytics_google_search_console_tag',
            'analytics_yandex_metrica_tag',
            'analytics_yandex_webmaster_tag',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'logo': {'write_only': True, 'required': False},
        }

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        url = obj.logo.url
        if settings.PUBLIC_BASE_URL:
            return f'{settings.PUBLIC_BASE_URL}{url}'
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url
