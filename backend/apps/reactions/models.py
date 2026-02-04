from django.db import models

from apps.poems.models import Poem


class Reaction(models.Model):
    TYPE_HEART = 'heart'
    TYPE_FIRE = 'fire'
    TYPE_LIKE = 'like'
    TYPE_SAD = 'sad'
    TYPE_STAR = 'star'

    TYPE_CHOICES = [
        (TYPE_HEART, 'Heart'),
        (TYPE_FIRE, 'Fire'),
        (TYPE_LIKE, 'Like'),
        (TYPE_SAD, 'Sad'),
        (TYPE_STAR, 'Star'),
    ]

    poem = models.ForeignKey(Poem, related_name='reactions', on_delete=models.CASCADE)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, db_index=True)
    user_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['poem', 'type', 'user_hash'], name='uniq_reaction_per_user_type')
        ]

    def __str__(self):
        return f'{self.type} on {self.poem_id}'
