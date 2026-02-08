from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.db import models
from django.utils import timezone

from apps.authors.models import Author


class Poem(models.Model):
    author = models.ForeignKey(Author, related_name='poems', on_delete=models.CASCADE, db_index=True)
    title = models.CharField(max_length=255, db_index=True)
    text = models.TextField()
    views = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(blank=True, null=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_poems',
    )
    search_vector = SearchVectorField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        indexes = [GinIndex(fields=['search_vector'], name='poems_search_gin')]

    def __str__(self):
        return f'{self.title} ({self.author.full_name})'

    def update_search_vector(self):
        self.__class__.objects.filter(pk=self.pk).update(
            search_vector=SearchVector('title', 'text', config='simple')
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.update_search_vector()


class PoemView(models.Model):
    poem = models.ForeignKey(Poem, related_name='views_log', on_delete=models.CASCADE)
    user_hash = models.CharField(max_length=64, db_index=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    viewed_date = models.DateField(db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['poem', 'user_hash', 'viewed_date'], name='uniq_poem_view_per_day')
        ]

    def save(self, *args, **kwargs):
        if not self.viewed_date:
            self.viewed_date = timezone.now().date()
        super().save(*args, **kwargs)


class PoemMonthlyVisit(models.Model):
    poem = models.ForeignKey(Poem, related_name='monthly_visits', on_delete=models.CASCADE)
    month_start = models.DateField(db_index=True)
    visits_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['poem', 'month_start'], name='uniq_poem_monthly_visit')
        ]
        indexes = [
            models.Index(fields=['month_start', '-visits_count'], name='poem_month_visits_idx'),
        ]
