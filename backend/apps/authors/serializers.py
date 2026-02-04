from django.conf import settings
from rest_framework import serializers

from config.utils import slugify_fallback
from .models import Author


class AuthorSerializer(serializers.ModelSerializer):
    poems_count = serializers.IntegerField(read_only=True)
    popularity = serializers.IntegerField(read_only=True)
    slug = serializers.SerializerMethodField()
    url_slug = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'birth_date',
            'death_date',
            'photo_url',
            'poems_count',
            'popularity',
            'slug',
            'url_slug',
        ]

    def get_slug(self, obj):
        return slugify_fallback(obj.full_name, 'author')

    def get_url_slug(self, obj):
        return f"{obj.id}-{self.get_slug(obj)}"

    def get_photo_url(self, obj):
        if obj.photo:
            url = obj.photo.url
            if settings.PUBLIC_BASE_URL:
                return f'{settings.PUBLIC_BASE_URL}{url}'
            request = self.context.get('request')
            return request.build_absolute_uri(url) if request else url
        return obj.photo_url


class AuthorDetailSerializer(AuthorSerializer):
    class Meta(AuthorSerializer.Meta):
        fields = AuthorSerializer.Meta.fields + ['biography_md']
