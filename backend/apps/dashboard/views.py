from __future__ import annotations

import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authors.models import Author
from apps.poems.models import Poem, PoemMonthlyVisit
from .models import DashboardUser, Role, RolePermission, SiteSettings
from .permissions import DashboardAccessPermission, DashboardSessionAuthentication
from .rbac import (
    MODULES,
    count_active_admin_capable_users,
    ensure_role_permission_rows,
    get_dashboard_access,
    is_admin_capable_role,
    role_permission_matrix,
    user_has_permission,
)
from .serializers import (
    AuthorAdminSerializer,
    AuthorWriteSerializer,
    ChangePasswordSerializer,
    DashboardUserResetPasswordSerializer,
    DashboardUserSerializer,
    DashboardUserWriteSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    PoemAdminSerializer,
    PoemWriteSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    SiteSettingsSerializer,
)
from .utils import (
    current_month_label,
    current_month_start,
    generate_temp_password,
    paginated_payload,
    paginate_queryset,
    parse_page,
    send_temp_password_email,
)


User = get_user_model()


def _deny_insufficient_permissions():
    return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)


def _check_permission(request, module: str, action: str):
    if request.user.is_superuser:
        return None
    if user_has_permission(request.user, module, action):
        return None
    return _deny_insufficient_permissions()


def _apply_trash_filter(qs, trash_value: str):
    trash = (trash_value or 'active').strip().lower()
    if trash == 'trash':
        return qs.filter(deleted_at__isnull=False)
    if trash == 'all':
        return qs
    return qs.filter(deleted_at__isnull=True)


def _apply_active_filter(qs, status_value: str):
    mode = (status_value or 'all').strip().lower()
    if mode == 'active':
        return qs.filter(is_active=True)
    if mode == 'inactive':
        return qs.filter(is_active=False)
    return qs


def _apply_published_filter(qs, published_value: str):
    mode = (published_value or 'all').strip().lower()
    if mode == 'published':
        return qs.filter(is_published=True)
    if mode == 'unpublished':
        return qs.filter(is_published=False)
    return qs


def _parse_sort(sort_value: str, mapping: dict[str, str], default: str):
    key = (sort_value or '').strip().lower()
    return mapping.get(key, default)


def _all_true_permissions():
    return {module: {'create': True, 'read': True, 'update': True, 'delete': True} for module in MODULES}


def _profile_payload(request):
    access = get_dashboard_access(request.user)
    profile = access.profile

    if request.user.is_superuser and not profile:
        return {
            'id': None,
            'full_name': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
            'role': {'id': None, 'name': 'Superuser', 'is_active': True},
            'is_active': True,
            'must_change_password': False,
            'permissions': _all_true_permissions(),
        }

    if not profile:
        return None

    permissions = _all_true_permissions() if request.user.is_superuser else role_permission_matrix(profile.role)

    return {
        'id': profile.id,
        'full_name': profile.full_name,
        'email': profile.user.email,
        'role': {
            'id': profile.role_id,
            'name': profile.role.name if profile.role else '',
            'is_active': profile.role.is_active if profile.role else False,
        },
        'is_active': profile.is_active,
        'must_change_password': profile.must_change_password,
        'permissions': permissions,
    }


def _get_monthly_poem_queryset(month_start):
    return (
        PoemMonthlyVisit.objects.filter(
            month_start=month_start,
            poem__deleted_at__isnull=True,
            poem__author__deleted_at__isnull=True,
        )
        .select_related('poem', 'poem__author')
        .order_by('-visits_count')
    )


def _json_or_raw(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return {}


class DashboardBaseView(APIView):
    authentication_classes = [DashboardSessionAuthentication]
    permission_classes = [DashboardAccessPermission]


class DashboardAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        profile = (
            DashboardUser.objects.select_related('user', 'role')
            .prefetch_related('role__permissions')
            .filter(user__email__iexact=email, deleted_at__isnull=True)
            .first()
        )

        if not profile:
            return Response({'detail': 'Неверный email или пароль.'}, status=status.HTTP_400_BAD_REQUEST)
        if not profile.is_active or not profile.user.is_active:
            return Response({'detail': 'Пользователь неактивен.'}, status=status.HTTP_403_FORBIDDEN)
        if not profile.role or profile.role.deleted_at or not profile.role.is_active:
            return Response({'detail': 'Роль пользователя неактивна.'}, status=status.HTTP_403_FORBIDDEN)
        if profile.must_change_password and profile.temp_password_expires_at and profile.has_expired_temp_password():
            return Response({'detail': 'Временный пароль истек.'}, status=status.HTTP_403_FORBIDDEN)

        user = authenticate(request, username=profile.user.get_username(), password=password)
        if not user:
            return Response({'detail': 'Неверный email или пароль.'}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)
        csrf_token = get_token(request)
        return Response(
            {
                'message': 'ok',
                'csrf_token': csrf_token,
                'force_change_password': profile.must_change_password,
                'profile': _profile_payload(request),
            }
        )


class DashboardAuthLogoutView(DashboardBaseView):
    allow_when_password_change_required = True

    def post(self, request):
        logout(request)
        return Response({'message': 'ok'})


class DashboardAuthMeView(DashboardBaseView):
    allow_when_password_change_required = True

    def get(self, request):
        csrf_token = get_token(request)
        return Response({'csrf_token': csrf_token, 'profile': _profile_payload(request)})


class DashboardAuthForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        profile = (
            DashboardUser.objects.select_related('user')
            .filter(user__email__iexact=email, deleted_at__isnull=True)
            .first()
        )
        if not profile:
            return Response({'message': 'Пользователя с таким email нет в систему!'}, status=status.HTTP_200_OK)

        ttl_minutes = int(settings.DASHBOARD_TEMP_PASSWORD_TTL_MINUTES)
        temp_password = generate_temp_password()
        try:
            send_temp_password_email(email, temp_password)
        except Exception:
            return Response({'detail': 'Не удалось отправить письмо.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        profile.user.set_password(temp_password)
        profile.user.save(update_fields=['password'])
        profile.must_change_password = True
        profile.temp_password_expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
        profile.save(update_fields=['must_change_password', 'temp_password_expires_at', 'updated_at'])
        return Response({'message': f'На почту {email} отправлен временный пароль'})


class DashboardAuthChangePasswordView(DashboardBaseView):
    allow_when_password_change_required = True

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = get_dashboard_access(request.user)
        profile = access.profile

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        update_session_auth_hash(request, request.user)

        if profile:
            profile.must_change_password = False
            profile.temp_password_expires_at = None
            profile.save(update_fields=['must_change_password', 'temp_password_expires_at', 'updated_at'])
        return Response({'message': 'Пароль успешно изменен.'})


class DashboardHomeView(DashboardBaseView):
    requires_any_read = True

    def get(self, request):
        month_start = current_month_start()
        monthly = _get_monthly_poem_queryset(month_start)

        total_visits = monthly.aggregate(total=Coalesce(Sum('visits_count'), 0))['total']
        top_poems = []
        for item in monthly[:5]:
            top_poems.append(
                {
                    'poem_id': item.poem_id,
                    'title': item.poem.title,
                    'author_id': item.poem.author_id,
                    'author_full_name': item.poem.author.full_name,
                    'visits': item.visits_count,
                }
            )

        authors_agg = (
            monthly.values('poem__author_id', 'poem__author__full_name')
            .annotate(visits=Coalesce(Sum('visits_count'), 0))
            .order_by('-visits')[:5]
        )
        top_authors = [
            {
                'author_id': item['poem__author_id'],
                'author_full_name': item['poem__author__full_name'],
                'visits': item['visits'],
            }
            for item in authors_agg
        ]

        authors_total = Author.objects.filter(deleted_at__isnull=True).count()
        poems_total = Poem.objects.filter(deleted_at__isnull=True).count()

        return Response(
            {
                'profile': _profile_payload(request),
                'stats': {
                    'total_poems': poems_total,
                    'total_authors': authors_total,
                    'month_label': current_month_label(),
                    'month_visits': total_visits,
                    'top_poems': top_poems,
                    'top_authors': top_authors,
                },
            }
        )


class DashboardAuthorListCreateView(DashboardBaseView):
    def get(self, request):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'read')
        if denied:
            return denied

        qs = Author.objects.annotate(
            poems_count=Count('poems', filter=Q(poems__deleted_at__isnull=True), distinct=True),
        )
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(full_name__icontains=q)

        qs = _apply_trash_filter(qs, request.query_params.get('trash'))
        qs = _apply_published_filter(qs, request.query_params.get('published'))
        ordering = _parse_sort(
            request.query_params.get('sort'),
            {
                'alphabetic': 'full_name',
                'oldest': 'created_at',
                'newest': '-created_at',
            },
            'full_name',
        )
        qs = qs.order_by(ordering)
        page, page_size = parse_page(request)
        items, total = paginate_queryset(qs, page, page_size)
        payload = AuthorAdminSerializer(items, many=True, context={'request': request}).data
        return Response(paginated_payload(payload, total, page, page_size))

    def post(self, request):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'create')
        if denied:
            return denied

        serializer = AuthorWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data['avatar_crop'] = _json_or_raw(request.data.get('avatar_crop') or data.get('avatar_crop'))

        author = Author.objects.create(**data)
        if 'photo' in request.FILES:
            author.photo = request.FILES['photo']
            author.save(update_fields=['photo', 'updated_at'])
        payload = AuthorAdminSerializer(author, context={'request': request}).data
        return Response(payload, status=status.HTTP_201_CREATED)


class DashboardAuthorDetailView(DashboardBaseView):
    def get(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'read')
        if denied:
            return denied
        author = get_object_or_404(
            Author.objects.annotate(
                poems_count=Count('poems', filter=Q(poems__deleted_at__isnull=True), distinct=True),
            ),
            pk=pk,
        )
        payload = AuthorAdminSerializer(author, context={'request': request}).data
        payload['poems'] = PoemAdminSerializer(
            Poem.objects.filter(author_id=author.id, deleted_at__isnull=True).select_related('author').order_by('-created_at'),
            many=True,
        ).data
        return Response(payload)

    def patch(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'update')
        if denied:
            return denied
        author = get_object_or_404(Author, pk=pk)

        serializer = AuthorWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if 'avatar_crop' in request.data or 'avatar_crop' in data:
            data['avatar_crop'] = _json_or_raw(request.data.get('avatar_crop') or data.get('avatar_crop'))

        for key, value in data.items():
            setattr(author, key, value)
        if 'photo' in request.FILES:
            author.photo = request.FILES['photo']
        author.save()

        payload = AuthorAdminSerializer(author, context={'request': request}).data
        return Response(payload)

    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'delete')
        if denied:
            return denied

        author = get_object_or_404(Author, pk=pk, deleted_at__isnull=True)
        deleted_at = timezone.now()
        with transaction.atomic():
            author.deleted_at = deleted_at
            author.deleted_by = request.user
            author.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
            Poem.objects.filter(author=author, deleted_at__isnull=True).update(
                deleted_at=deleted_at,
                deleted_by=request.user,
                updated_at=deleted_at,
            )
        return Response({'message': 'Автор отправлен в корзину.'})


class DashboardAuthorPoemsView(DashboardBaseView):
    def get(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'read')
        if denied:
            return denied
        author = get_object_or_404(Author, pk=pk)
        qs = Poem.objects.filter(author_id=author.id).select_related('author')
        qs = _apply_trash_filter(qs, request.query_params.get('trash'))
        qs = _apply_published_filter(qs, request.query_params.get('published'))
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(text__icontains=q))
        ordering = _parse_sort(
            request.query_params.get('sort'),
            {'alphabetic': 'title', 'oldest': 'created_at', 'newest': '-created_at'},
            '-created_at',
        )
        qs = qs.order_by(ordering)
        page, page_size = parse_page(request)
        items, total = paginate_queryset(qs, page, page_size)
        payload = PoemAdminSerializer(items, many=True).data
        return Response(paginated_payload(payload, total, page, page_size))

    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'create')
        if denied:
            return denied

        author = get_object_or_404(Author, pk=pk, deleted_at__isnull=True)
        payload = request.data.copy()
        payload['author_id'] = author.id
        serializer = PoemWriteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        poem = Poem.objects.create(**serializer.validated_data)
        return Response(PoemAdminSerializer(poem).data, status=status.HTTP_201_CREATED)


class DashboardAuthorRestoreView(DashboardBaseView):
    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'update')
        if denied:
            return denied
        author = get_object_or_404(Author, pk=pk, deleted_at__isnull=False)
        with transaction.atomic():
            author.deleted_at = None
            author.deleted_by = None
            author.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
            Poem.objects.filter(author=author, deleted_at__isnull=False).update(
                deleted_at=None,
                deleted_by=None,
                updated_at=timezone.now(),
            )
        return Response({'message': 'Автор восстановлен из корзины.'})


class DashboardAuthorHardDeleteView(DashboardBaseView):
    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_AUTHORS, 'delete')
        if denied:
            return denied
        author = get_object_or_404(Author, pk=pk)
        author.delete()
        return Response({'message': 'Автор удален навсегда.'})


class DashboardPoemListCreateView(DashboardBaseView):
    def get(self, request):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'read')
        if denied:
            return denied

        qs = Poem.objects.select_related('author')
        qs = _apply_trash_filter(qs, request.query_params.get('trash'))
        qs = _apply_published_filter(qs, request.query_params.get('published'))

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(text__icontains=q))

        author_id = request.query_params.get('author_id')
        if author_id:
            qs = qs.filter(author_id=author_id)

        ordering = _parse_sort(
            request.query_params.get('sort'),
            {'alphabetic': 'title', 'oldest': 'created_at', 'newest': '-created_at'},
            '-created_at',
        )
        qs = qs.order_by(ordering)
        page, page_size = parse_page(request)
        items, total = paginate_queryset(qs, page, page_size)
        payload = PoemAdminSerializer(items, many=True).data
        return Response(paginated_payload(payload, total, page, page_size))

    def post(self, request):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'create')
        if denied:
            return denied

        serializer = PoemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        author = get_object_or_404(Author, pk=serializer.validated_data['author_id'], deleted_at__isnull=True)
        poem = Poem.objects.create(
            author=author,
            title=serializer.validated_data['title'],
            text=serializer.validated_data['text'],
            is_published=serializer.validated_data['is_published'],
        )
        return Response(PoemAdminSerializer(poem).data, status=status.HTTP_201_CREATED)


class DashboardPoemDetailView(DashboardBaseView):
    def get(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'read')
        if denied:
            return denied
        poem = get_object_or_404(Poem.objects.select_related('author'), pk=pk)
        return Response(PoemAdminSerializer(poem).data)

    def patch(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'update')
        if denied:
            return denied
        poem = get_object_or_404(Poem, pk=pk)
        serializer = PoemWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if 'author_id' in data:
            poem.author = get_object_or_404(Author, pk=data['author_id'], deleted_at__isnull=True)
        if 'title' in data:
            poem.title = data['title']
        if 'text' in data:
            poem.text = data['text']
        if 'is_published' in data:
            poem.is_published = data['is_published']
        poem.save()
        return Response(PoemAdminSerializer(poem).data)

    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'delete')
        if denied:
            return denied
        poem = get_object_or_404(Poem, pk=pk, deleted_at__isnull=True)
        poem.deleted_at = timezone.now()
        poem.deleted_by = request.user
        poem.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
        return Response({'message': 'Стих отправлен в корзину.'})


class DashboardPoemRestoreView(DashboardBaseView):
    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'update')
        if denied:
            return denied
        poem = get_object_or_404(Poem, pk=pk, deleted_at__isnull=False)
        poem.deleted_at = None
        poem.deleted_by = None
        poem.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
        return Response({'message': 'Стих восстановлен из корзины.'})


class DashboardPoemHardDeleteView(DashboardBaseView):
    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_POEMS, 'delete')
        if denied:
            return denied
        poem = get_object_or_404(Poem, pk=pk)
        poem.delete()
        return Response({'message': 'Стих удален навсегда.'})


class DashboardEmployeeListCreateView(DashboardBaseView):
    def get(self, request):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'read')
        if denied:
            return denied

        qs = DashboardUser.objects.select_related('user', 'role')
        qs = _apply_trash_filter(qs, request.query_params.get('trash'))
        qs = _apply_active_filter(qs, request.query_params.get('status'))
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(full_name__icontains=q)

        ordering = _parse_sort(
            request.query_params.get('sort'),
            {'alphabetic': 'full_name', 'oldest': 'created_at', 'newest': '-created_at'},
            'full_name',
        )
        qs = qs.order_by(ordering)
        page, page_size = parse_page(request)
        items, total = paginate_queryset(qs, page, page_size)
        payload = DashboardUserSerializer(items, many=True).data
        return Response(paginated_payload(payload, total, page, page_size))

    def post(self, request):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'create')
        if denied:
            return denied

        serializer = DashboardUserWriteSerializer(data=request.data, context={'creating': True})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role = get_object_or_404(Role, pk=data['role_id'], deleted_at__isnull=True)
        email = data['email'].strip().lower()
        if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
            return Response({'detail': 'Email уже используется.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=data['password'],
                is_active=data['is_active'],
            )
            profile = DashboardUser.objects.create(
                user=user,
                full_name=data['full_name'],
                role=role,
                is_active=data['is_active'],
            )
        return Response(DashboardUserSerializer(profile).data, status=status.HTTP_201_CREATED)


class DashboardEmployeeDetailView(DashboardBaseView):
    def get(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'read')
        if denied:
            return denied
        profile = get_object_or_404(DashboardUser.objects.select_related('user', 'role'), pk=pk)
        return Response(DashboardUserSerializer(profile).data)

    def patch(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'update')
        if denied:
            return denied

        profile = get_object_or_404(DashboardUser.objects.select_related('user', 'role'), pk=pk)
        serializer = DashboardUserWriteSerializer(data=request.data, partial=True, context={'creating': False})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if profile.user_id == request.user.id and data.get('is_active') is False:
            return Response({'detail': 'Нельзя деактивировать самого себя.'}, status=status.HTTP_400_BAD_REQUEST)

        old_active = profile.is_active and profile.deleted_at is None and profile.user.is_active
        old_admin_capable = old_active and is_admin_capable_role(profile.role)

        if 'role_id' in data:
            profile.role = get_object_or_404(Role, pk=data['role_id'], deleted_at__isnull=True)
        if 'full_name' in data:
            profile.full_name = data['full_name']
        if 'is_active' in data:
            profile.is_active = data['is_active']
            profile.user.is_active = data['is_active']

        if 'email' in data:
            email = data['email'].strip().lower()
            exists_qs = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exclude(pk=profile.user_id)
            if exists_qs.exists():
                return Response({'detail': 'Email уже используется.'}, status=status.HTTP_400_BAD_REQUEST)
            profile.user.email = email
            profile.user.username = email

        new_active = profile.is_active and profile.user.is_active and profile.deleted_at is None
        new_admin_capable = new_active and is_admin_capable_role(profile.role)
        if old_admin_capable and not new_admin_capable:
            if count_active_admin_capable_users(exclude_profile_id=profile.id) == 0:
                return Response({'detail': 'Нельзя отключить последнего администратора.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.user.save()
        profile.save()
        return Response(DashboardUserSerializer(profile).data)

    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'delete')
        if denied:
            return denied
        profile = get_object_or_404(DashboardUser.objects.select_related('user', 'role'), pk=pk, deleted_at__isnull=True)
        if profile.user_id == request.user.id:
            return Response({'detail': 'Нельзя удалить самого себя.'}, status=status.HTTP_400_BAD_REQUEST)

        if profile.is_active and is_admin_capable_role(profile.role):
            if count_active_admin_capable_users(exclude_profile_id=profile.id) == 0:
                return Response({'detail': 'Нельзя удалить последнего администратора.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        profile.deleted_at = now
        profile.deleted_by = request.user
        profile.is_active = False
        profile.user.is_active = False
        profile.user.save(update_fields=['is_active'])
        profile.save(update_fields=['deleted_at', 'deleted_by', 'is_active', 'updated_at'])
        return Response({'message': 'Сотрудник отправлен в корзину.'})


class DashboardEmployeeRestoreView(DashboardBaseView):
    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'update')
        if denied:
            return denied
        profile = get_object_or_404(DashboardUser.objects.select_related('user'), pk=pk, deleted_at__isnull=False)
        profile.deleted_at = None
        profile.deleted_by = None
        profile.is_active = True
        profile.user.is_active = True
        profile.user.save(update_fields=['is_active'])
        profile.save(update_fields=['deleted_at', 'deleted_by', 'is_active', 'updated_at'])
        return Response({'message': 'Сотрудник восстановлен из корзины.'})


class DashboardEmployeeHardDeleteView(DashboardBaseView):
    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'delete')
        if denied:
            return denied
        profile = get_object_or_404(DashboardUser.objects.select_related('user', 'role'), pk=pk)
        if profile.user_id == request.user.id:
            return Response({'detail': 'Нельзя удалить самого себя.'}, status=status.HTTP_400_BAD_REQUEST)
        if profile.is_active and is_admin_capable_role(profile.role):
            if count_active_admin_capable_users(exclude_profile_id=profile.id) == 0:
                return Response({'detail': 'Нельзя удалить последнего администратора.'}, status=status.HTTP_400_BAD_REQUEST)

        user = profile.user
        profile.delete()
        user.delete()
        return Response({'message': 'Сотрудник удален навсегда.'})


class DashboardEmployeeResetPasswordView(DashboardBaseView):
    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_EMPLOYEES, 'update')
        if denied:
            return denied
        profile = get_object_or_404(DashboardUser.objects.select_related('user'), pk=pk, deleted_at__isnull=True)
        serializer = DashboardUserResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile.user.set_password(serializer.validated_data['new_password'])
        profile.user.save(update_fields=['password'])
        profile.must_change_password = False
        profile.temp_password_expires_at = None
        profile.save(update_fields=['must_change_password', 'temp_password_expires_at', 'updated_at'])
        return Response({'message': 'Пароль обновлен.'})


def _upsert_role_permissions(role: Role, permissions_payload):
    ensure_role_permission_rows(role)
    seen = set()
    for item in permissions_payload:
        module = item['module']
        if module not in MODULES:
            continue
        seen.add(module)
        perm = RolePermission.objects.get(role=role, module=module)
        perm.can_create = item.get('can_create', False)
        perm.can_read = item.get('can_read', False)
        perm.can_update = item.get('can_update', False)
        perm.can_delete = item.get('can_delete', False)
        perm.save()
    for module in MODULES:
        if module in seen:
            continue
        perm = RolePermission.objects.get(role=role, module=module)
        perm.can_create = False
        perm.can_read = False
        perm.can_update = False
        perm.can_delete = False
        perm.save()


def _is_admin_with_permissions(role: Role, permissions_payload, is_active: bool):
    if not is_active:
        return False
    matrix = role_permission_matrix(role)
    for row in permissions_payload or []:
        module = row.get('module')
        if module not in MODULES:
            continue
        matrix[module] = {
            'create': row.get('can_create', False),
            'read': row.get('can_read', False),
            'update': row.get('can_update', False),
            'delete': row.get('can_delete', False),
        }
    for module in MODULES:
        values = matrix[module]
        if not (values['create'] and values['read'] and values['update'] and values['delete']):
            return False
    return True


class DashboardRoleListCreateView(DashboardBaseView):
    def get(self, request):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'read')
        if denied:
            return denied

        qs = Role.objects.prefetch_related('permissions').annotate(
            employees_count=Count('employees', filter=Q(employees__deleted_at__isnull=True), distinct=True),
        )
        qs = _apply_trash_filter(qs, request.query_params.get('trash'))
        qs = _apply_active_filter(qs, request.query_params.get('status'))
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(name__icontains=q)

        ordering = _parse_sort(
            request.query_params.get('sort'),
            {'alphabetic': 'name', 'oldest': 'created_at', 'newest': '-created_at'},
            'name',
        )
        qs = qs.order_by(ordering)
        page, page_size = parse_page(request)
        items, total = paginate_queryset(qs, page, page_size)
        payload = RoleSerializer(items, many=True).data
        return Response(paginated_payload(payload, total, page, page_size))

    def post(self, request):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'create')
        if denied:
            return denied

        serializer = RoleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if Role.objects.filter(name__iexact=data['name']).exists():
            return Response({'detail': 'Роль с таким названием уже существует.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            role = Role.objects.create(name=data['name'], is_active=data['is_active'])
            _upsert_role_permissions(role, data['permissions'])

            employee_ids = data.get('employee_ids') or []
            if employee_ids:
                DashboardUser.objects.filter(id__in=employee_ids, deleted_at__isnull=True).update(role=role)

        role = Role.objects.prefetch_related('permissions').annotate(
            employees_count=Count('employees', filter=Q(employees__deleted_at__isnull=True), distinct=True),
        ).get(pk=role.pk)
        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class DashboardRoleDetailView(DashboardBaseView):
    def get(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'read')
        if denied:
            return denied

        role = get_object_or_404(
            Role.objects.prefetch_related('permissions').annotate(
                employees_count=Count('employees', filter=Q(employees__deleted_at__isnull=True), distinct=True),
            ),
            pk=pk,
        )
        payload = RoleSerializer(role).data
        payload['employees'] = DashboardUserSerializer(
            DashboardUser.objects.filter(role=role, deleted_at__isnull=True).select_related('user', 'role'),
            many=True,
        ).data
        return Response(payload)

    def patch(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'update')
        if denied:
            return denied

        role = get_object_or_404(Role.objects.prefetch_related('permissions'), pk=pk)
        serializer = RoleWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if role.deleted_at:
            return Response({'detail': 'Роль в корзине.'}, status=status.HTTP_400_BAD_REQUEST)

        old_is_admin_role = is_admin_capable_role(role)
        old_active_members = DashboardUser.objects.filter(
            role=role,
            deleted_at__isnull=True,
            is_active=True,
            user__is_active=True,
        ).count()

        next_is_active = data.get('is_active', role.is_active)
        next_permissions = data.get('permissions', None)
        next_is_admin_role = _is_admin_with_permissions(role, next_permissions, next_is_active)

        if old_is_admin_role and old_active_members and not next_is_admin_role:
            if count_active_admin_capable_users() - old_active_members <= 0:
                return Response({'detail': 'Нельзя отключить последнюю админ-роль.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'name' in data:
            if Role.objects.filter(name__iexact=data['name']).exclude(pk=role.pk).exists():
                return Response({'detail': 'Роль с таким названием уже существует.'}, status=status.HTTP_400_BAD_REQUEST)
            role.name = data['name']
        if 'is_active' in data:
            role.is_active = data['is_active']
        role.save()

        if 'permissions' in data:
            _upsert_role_permissions(role, data['permissions'])

        if 'employee_ids' in data:
            ids = data['employee_ids'] or []
            DashboardUser.objects.filter(role=role, deleted_at__isnull=True).exclude(id__in=ids).update(role=None)
            DashboardUser.objects.filter(id__in=ids, deleted_at__isnull=True).update(role=role)

        role = Role.objects.prefetch_related('permissions').annotate(
            employees_count=Count('employees', filter=Q(employees__deleted_at__isnull=True), distinct=True),
        ).get(pk=role.pk)
        return Response(RoleSerializer(role).data)

    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'delete')
        if denied:
            return denied

        role = get_object_or_404(Role.objects.prefetch_related('permissions'), pk=pk, deleted_at__isnull=True)
        affected_admin_count = 0
        if is_admin_capable_role(role):
            affected_admin_count = DashboardUser.objects.filter(
                role=role,
                deleted_at__isnull=True,
                is_active=True,
                user__is_active=True,
            ).count()
        if affected_admin_count and count_active_admin_capable_users() - affected_admin_count <= 0:
            return Response({'detail': 'Нельзя удалить последнюю админ-роль.'}, status=status.HTTP_400_BAD_REQUEST)

        role.deleted_at = timezone.now()
        role.deleted_by = request.user
        role.is_active = False
        role.save(update_fields=['deleted_at', 'deleted_by', 'is_active', 'updated_at'])
        return Response({'message': 'Роль отправлена в корзину.'})


class DashboardRoleRestoreView(DashboardBaseView):
    def post(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'update')
        if denied:
            return denied
        role = get_object_or_404(Role, pk=pk, deleted_at__isnull=False)
        role.deleted_at = None
        role.deleted_by = None
        role.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
        return Response({'message': 'Роль восстановлена из корзины.'})


class DashboardRoleHardDeleteView(DashboardBaseView):
    def delete(self, request, pk):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'delete')
        if denied:
            return denied
        role = get_object_or_404(Role.objects.prefetch_related('permissions'), pk=pk)
        affected_admin_count = 0
        if is_admin_capable_role(role):
            affected_admin_count = DashboardUser.objects.filter(
                role=role,
                deleted_at__isnull=True,
                is_active=True,
                user__is_active=True,
            ).count()
        if affected_admin_count and count_active_admin_capable_users() - affected_admin_count <= 0:
            return Response({'detail': 'Нельзя удалить последнюю админ-роль.'}, status=status.HTTP_400_BAD_REQUEST)

        DashboardUser.objects.filter(role=role, deleted_at__isnull=True).update(role=None)
        role.delete()
        return Response({'message': 'Роль удалена навсегда.'})


class DashboardSiteSettingsView(DashboardBaseView):
    def get(self, request):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'read')
        if denied:
            return denied
        settings_obj = SiteSettings.get_solo()
        return Response(SiteSettingsSerializer(settings_obj, context={'request': request}).data)

    def patch(self, request):
        denied = _check_permission(request, RolePermission.MODULE_ROLES, 'update')
        if denied:
            return denied
        settings_obj = SiteSettings.get_solo()
        serializer = SiteSettingsSerializer(settings_obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
