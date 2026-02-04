from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector, SearchVectorField
from django.db import models


class Author(models.Model):
    full_name = models.CharField(max_length=255, db_index=True)
    birth_date = models.DateField(null=True, blank=True)
    death_date = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='authors/', null=True, blank=True)
    photo_url = models.URLField(blank=True, null=True)
    biography_md = models.TextField(blank=True, null=True)
    search_vector = SearchVectorField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']
        indexes = [GinIndex(fields=['search_vector'], name='authors_search_gin')]

    def __str__(self):
        return self.full_name

    def update_search_vector(self):
        self.__class__.objects.filter(pk=self.pk).update(
            search_vector=SearchVector('full_name', config='simple')
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.update_search_vector()
