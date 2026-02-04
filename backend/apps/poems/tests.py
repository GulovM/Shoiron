from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authors.models import Author
from apps.poems.models import Poem


class HomeAggregatesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        a1 = Author.objects.create(full_name='Автор 1')
        a2 = Author.objects.create(full_name='Автор 2')
        Poem.objects.create(author=a1, title='Поэма 1', text='Текст', views=10)
        Poem.objects.create(author=a1, title='Поэма 2', text='Текст', views=5)
        Poem.objects.create(author=a2, title='Поэма 3', text='Текст', views=20)

    def test_home_payload(self):
        res = self.client.get('/api/v1/home')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['stats']['authors_count'], 2)
        self.assertEqual(res.data['stats']['poems_count'], 3)
        self.assertEqual(len(res.data['top_poems']), 3)
        self.assertEqual(len(res.data['top_authors']), 2)