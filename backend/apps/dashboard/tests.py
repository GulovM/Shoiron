from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.authors.models import Author
from apps.dashboard.models import DashboardUser, Role
from apps.dashboard.rbac import MODULES, ensure_role_permission_rows
from apps.poems.models import Poem


User = get_user_model()


def full_permissions_payload():
    return [
        {'module': 'authors', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True},
        {'module': 'poems', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True},
        {'module': 'employees', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True},
        {'module': 'roles', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True},
    ]


def make_role(name: str, permissions: list[dict]) -> Role:
    role = Role.objects.create(name=name, is_active=True)
    ensure_role_permission_rows(role)
    for perm in permissions:
        row = role.permissions.get(module=perm['module'])
        row.can_create = perm.get('can_create', False)
        row.can_read = perm.get('can_read', False)
        row.can_update = perm.get('can_update', False)
        row.can_delete = perm.get('can_delete', False)
        row.save()
    return role


class DashboardBaseTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = make_role('Admin', full_permissions_payload())
        self.admin_user = User.objects.create_user(username='admin@example.com', email='admin@example.com', password='Admin12345!')
        self.admin_profile = DashboardUser.objects.create(
            user=self.admin_user,
            full_name='Admin User',
            role=self.admin_role,
            is_active=True,
        )
        self.author = Author.objects.create(full_name='Тестовый Автор', is_published=True)
        self.poem = Poem.objects.create(author=self.author, title='Тестовый стих', text='Текст', is_published=True)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DashboardAuthFlowTests(DashboardBaseTestCase):
    def test_login_change_password_logout_and_login_again(self):
        login_res = self.client.post(
            '/api/v1/dashboard/auth/login',
            {'email': 'admin@example.com', 'password': 'Admin12345!'},
            format='json',
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertIn('profile', login_res.data)
        self.assertEqual(login_res.data['profile']['email'], 'admin@example.com')

        me_res = self.client.get('/api/v1/dashboard/auth/me')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['profile']['email'], 'admin@example.com')

        change_res = self.client.post(
            '/api/v1/dashboard/auth/change-password',
            {'new_password': 'NewPass1234!', 'confirm_password': 'NewPass1234!'},
            format='json',
        )
        self.assertEqual(change_res.status_code, 200)

        logout_res = self.client.post('/api/v1/dashboard/auth/logout', {}, format='json')
        self.assertEqual(logout_res.status_code, 200)

        old_login = self.client.post(
            '/api/v1/dashboard/auth/login',
            {'email': 'admin@example.com', 'password': 'Admin12345!'},
            format='json',
        )
        self.assertEqual(old_login.status_code, 400)

        new_login = self.client.post(
            '/api/v1/dashboard/auth/login',
            {'email': 'admin@example.com', 'password': 'NewPass1234!'},
            format='json',
        )
        self.assertEqual(new_login.status_code, 200)

    def test_forgot_password_messages_and_temp_flags(self):
        res_ok = self.client.post('/api/v1/dashboard/auth/forgot-password', {'email': 'admin@example.com'}, format='json')
        self.assertEqual(res_ok.status_code, 200)
        self.assertEqual(res_ok.data['message'], 'На почту admin@example.com отправлен временный пароль')

        self.admin_profile.refresh_from_db()
        self.assertTrue(self.admin_profile.must_change_password)
        self.assertIsNotNone(self.admin_profile.temp_password_expires_at)

        res_missing = self.client.post('/api/v1/dashboard/auth/forgot-password', {'email': 'missing@example.com'}, format='json')
        self.assertEqual(res_missing.status_code, 200)
        self.assertEqual(res_missing.data['message'], 'Пользователя с таким email нет в систему!')

    def test_employee_reset_password_flow(self):
        editor_role = make_role(
            'Editor',
            [
                {'module': 'authors', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': False},
                {'module': 'poems', 'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': False},
                {'module': 'employees', 'can_create': False, 'can_read': False, 'can_update': False, 'can_delete': False},
                {'module': 'roles', 'can_create': False, 'can_read': False, 'can_update': False, 'can_delete': False},
            ],
        )
        employee_user = User.objects.create_user(username='emp@example.com', email='emp@example.com', password='OldPassword123!')
        employee = DashboardUser.objects.create(
            user=employee_user,
            full_name='Employee',
            role=editor_role,
            is_active=True,
        )

        self.client.force_login(self.admin_user)
        reset_res = self.client.post(
            f'/api/v1/dashboard/employees/{employee.id}/reset-password',
            {'new_password': 'Reset12345!', 'confirm_password': 'Reset12345!'},
            format='json',
        )
        self.assertEqual(reset_res.status_code, 200)

        self.client.post('/api/v1/dashboard/auth/logout', {}, format='json')
        login_res = self.client.post(
            '/api/v1/dashboard/auth/login',
            {'email': 'emp@example.com', 'password': 'Reset12345!'},
            format='json',
        )
        self.assertEqual(login_res.status_code, 200)


class DashboardRBACTests(DashboardBaseTestCase):
    def test_rbac_deny_and_allow_per_module(self):
        limited_role = make_role(
            'Limited',
            [
                {'module': 'authors', 'can_create': False, 'can_read': True, 'can_update': False, 'can_delete': False},
                {'module': 'poems', 'can_create': False, 'can_read': False, 'can_update': False, 'can_delete': False},
                {'module': 'employees', 'can_create': False, 'can_read': False, 'can_update': False, 'can_delete': False},
                {'module': 'roles', 'can_create': False, 'can_read': False, 'can_update': False, 'can_delete': False},
            ],
        )
        limited_user = User.objects.create_user(username='limited@example.com', email='limited@example.com', password='Limited12345!')
        DashboardUser.objects.create(user=limited_user, full_name='Limited User', role=limited_role, is_active=True)

        self.client.force_login(limited_user)
        self.assertEqual(self.client.get('/api/v1/dashboard/authors').status_code, 200)
        self.assertEqual(
            self.client.post(
                '/api/v1/dashboard/authors',
                {'full_name': 'Denied Author', 'is_published': True},
                format='json',
            ).status_code,
            403,
        )
        self.assertEqual(self.client.get('/api/v1/dashboard/poems').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/dashboard/employees').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/dashboard/roles').status_code, 403)

        self.client.force_login(self.admin_user)
        create_author = self.client.post(
            '/api/v1/dashboard/authors',
            {'full_name': 'Allowed Author', 'is_published': True},
            format='json',
        )
        self.assertEqual(create_author.status_code, 201)

        create_poem = self.client.post(
            '/api/v1/dashboard/poems',
            {'title': 'Allowed Poem', 'text': 'Body', 'author_id': create_author.data['id'], 'is_published': True},
            format='json',
        )
        self.assertEqual(create_poem.status_code, 201)

        create_employee = self.client.post(
            '/api/v1/dashboard/employees',
            {
                'full_name': 'Allowed Employee',
                'role_id': self.admin_role.id,
                'email': 'allowed@example.com',
                'password': 'Allowed12345!',
                'password_confirm': 'Allowed12345!',
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(create_employee.status_code, 201)

        create_role = self.client.post(
            '/api/v1/dashboard/roles',
            {'name': 'Allowed Role', 'is_active': True, 'permissions': full_permissions_payload(), 'employee_ids': []},
            format='json',
        )
        self.assertEqual(create_role.status_code, 201)


class DashboardSoftDeleteTests(DashboardBaseTestCase):
    def test_author_trash_restore_and_hard_delete(self):
        self.client.force_login(self.admin_user)

        delete_res = self.client.delete(f'/api/v1/dashboard/authors/{self.author.id}')
        self.assertEqual(delete_res.status_code, 200)
        self.author.refresh_from_db()
        self.poem.refresh_from_db()
        self.assertIsNotNone(self.author.deleted_at)
        self.assertIsNotNone(self.poem.deleted_at)

        trash_list = self.client.get('/api/v1/dashboard/authors?trash=trash')
        self.assertEqual(trash_list.status_code, 200)
        self.assertGreaterEqual(trash_list.data['count'], 1)

        restore_res = self.client.post(f'/api/v1/dashboard/authors/{self.author.id}/restore', {}, format='json')
        self.assertEqual(restore_res.status_code, 200)
        self.author.refresh_from_db()
        self.poem.refresh_from_db()
        self.assertIsNone(self.author.deleted_at)
        self.assertIsNone(self.poem.deleted_at)

        hard_delete_res = self.client.delete(f'/api/v1/dashboard/authors/{self.author.id}/hard-delete')
        self.assertEqual(hard_delete_res.status_code, 200)
        self.assertFalse(Author.objects.filter(id=self.author.id).exists())

    def test_employee_and_role_trash_restore_and_hard_delete(self):
        self.client.force_login(self.admin_user)
        role = self.client.post(
            '/api/v1/dashboard/roles',
            {'name': 'Temp Role', 'is_active': True, 'permissions': full_permissions_payload(), 'employee_ids': []},
            format='json',
        ).data
        employee = self.client.post(
            '/api/v1/dashboard/employees',
            {
                'full_name': 'Temp Employee',
                'role_id': role['id'],
                'email': 'temp-employee@example.com',
                'password': 'Temp123456!',
                'password_confirm': 'Temp123456!',
                'is_active': True,
            },
            format='json',
        ).data

        del_employee = self.client.delete(f"/api/v1/dashboard/employees/{employee['id']}")
        self.assertEqual(del_employee.status_code, 200)
        restore_employee = self.client.post(f"/api/v1/dashboard/employees/{employee['id']}/restore", {}, format='json')
        self.assertEqual(restore_employee.status_code, 200)
        hard_employee = self.client.delete(f"/api/v1/dashboard/employees/{employee['id']}/hard-delete")
        self.assertEqual(hard_employee.status_code, 200)

        del_role = self.client.delete(f"/api/v1/dashboard/roles/{role['id']}")
        self.assertEqual(del_role.status_code, 200)
        restore_role = self.client.post(f"/api/v1/dashboard/roles/{role['id']}/restore", {}, format='json')
        self.assertEqual(restore_role.status_code, 200)
        hard_role = self.client.delete(f"/api/v1/dashboard/roles/{role['id']}/hard-delete")
        self.assertEqual(hard_role.status_code, 200)

    def test_poem_trash_restore_and_hard_delete(self):
        self.client.force_login(self.admin_user)

        delete_res = self.client.delete(f'/api/v1/dashboard/poems/{self.poem.id}')
        self.assertEqual(delete_res.status_code, 200)
        self.poem.refresh_from_db()
        self.assertIsNotNone(self.poem.deleted_at)

        trash_res = self.client.get('/api/v1/dashboard/poems?trash=trash')
        self.assertEqual(trash_res.status_code, 200)
        self.assertGreaterEqual(trash_res.data['count'], 1)

        restore_res = self.client.post(f'/api/v1/dashboard/poems/{self.poem.id}/restore', {}, format='json')
        self.assertEqual(restore_res.status_code, 200)
        self.poem.refresh_from_db()
        self.assertIsNone(self.poem.deleted_at)

        hard_res = self.client.delete(f'/api/v1/dashboard/poems/{self.poem.id}/hard-delete')
        self.assertEqual(hard_res.status_code, 200)
        self.assertFalse(Poem.objects.filter(id=self.poem.id).exists())


class DashboardListFiltersTests(DashboardBaseTestCase):
    def test_authors_filters_sort_and_pagination(self):
        self.client.force_login(self.admin_user)
        Author.objects.create(full_name='Альфа Автор', is_published=True)
        Author.objects.create(full_name='Бета Автор', is_published=False)
        Author.objects.create(full_name='Гамма Автор', is_published=True)

        list_res = self.client.get('/api/v1/dashboard/authors?q=Автор&sort=alphabetic&page=1&page_size=2&published=all')
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.data['page'], 1)
        self.assertEqual(list_res.data['page_size'], 2)
        self.assertEqual(len(list_res.data['results']), 2)

        next_res = self.client.get('/api/v1/dashboard/authors?q=Автор&sort=alphabetic&page=2&page_size=2&published=all')
        self.assertEqual(next_res.status_code, 200)
        self.assertEqual(next_res.data['page'], 2)

    def test_poems_search_filter_and_sort(self):
        self.client.force_login(self.admin_user)
        Poem.objects.create(author=self.author, title='Весна', text='Теплый текст', is_published=True)
        Poem.objects.create(author=self.author, title='Осень', text='Холодный ветер', is_published=False)

        res = self.client.get('/api/v1/dashboard/poems?q=текст&sort=alphabetic&page=1&page_size=10&published=published')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data['count'], 1)
        for item in res.data['results']:
            self.assertTrue(item['is_published'])
