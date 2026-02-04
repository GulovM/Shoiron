import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.authors.models import Author
from apps.poems.models import Poem
from apps.reactions.models import Reaction


class ReactionToggleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.cookies['shoieron_uid'] = str(uuid.uuid4())
        self.author = Author.objects.create(full_name='Тестовый Автор')
        self.poem = Poem.objects.create(author=self.author, title='Тест', text='Строка')

    def test_toggle_creates_and_removes(self):
        url = '/api/v1/reactions/toggle'
        payload = {'poem_id': self.poem.id, 'type': Reaction.TYPE_HEART}

        res1 = self.client.post(url, payload, format='json')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(Reaction.objects.count(), 1)
        self.assertTrue(res1.data['user_flags_by_type'][Reaction.TYPE_HEART])

        res2 = self.client.post(url, payload, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(Reaction.objects.count(), 0)
        self.assertFalse(res2.data['user_flags_by_type'][Reaction.TYPE_HEART])

    def test_only_one_reaction_allowed(self):
        url = '/api/v1/reactions/toggle'
        payload_heart = {'poem_id': self.poem.id, 'type': Reaction.TYPE_HEART}
        payload_fire = {'poem_id': self.poem.id, 'type': Reaction.TYPE_FIRE}

        res1 = self.client.post(url, payload_heart, format='json')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(Reaction.objects.count(), 1)

        res2 = self.client.post(url, payload_fire, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(Reaction.objects.count(), 1)
        self.assertTrue(res2.data['user_flags_by_type'][Reaction.TYPE_FIRE])
        self.assertFalse(res2.data['user_flags_by_type'][Reaction.TYPE_HEART])
