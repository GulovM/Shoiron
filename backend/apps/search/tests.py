from django.test import TestCase
from rest_framework.test import APIClient

from apps.authors.models import Author
from apps.poems.models import Poem


class SearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = Author.objects.create(full_name='Рудаки')
        self.author2 = Author.objects.create(full_name='Мирзо Турсунзода')
        self.poem = Poem.objects.create(author=self.author, title='Весна', text='Весна пришла')

    def test_search_returns_authors_and_poems(self):
        res = self.client.get('/api/v1/search', {'q': 'Рудаки'})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data['authors']['count'], 1)

        res2 = self.client.get('/api/v1/search', {'q': 'Весна'})
        self.assertEqual(res2.status_code, 200)
        self.assertGreaterEqual(res2.data['poems']['count'], 1)

    def test_search_prefix(self):
        res = self.client.get('/api/v1/search', {'q': 'Турсун'})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data['authors']['count'], 1)

        res2 = self.client.get('/api/v1/search', {'q': 'Вес'})
        self.assertEqual(res2.status_code, 200)
        self.assertGreaterEqual(res2.data['poems']['count'], 1)
