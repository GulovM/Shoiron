from rest_framework import serializers

from config.utils import slugify_fallback
from .models import Poem


class PoemListSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    url_slug = serializers.SerializerMethodField()

    class Meta:
        model = Poem
        fields = ['id', 'title', 'preview', 'author', 'views', 'slug', 'url_slug']

    def get_author(self, obj):
        return {
            'id': obj.author_id,
            'full_name': obj.author.full_name,
            'slug': slugify_fallback(obj.author.full_name, 'author'),
        }

    def get_preview(self, obj):
        lines = [line for line in obj.text.splitlines() if line.strip()]
        preview_lines = lines[:3]
        return '\n'.join(preview_lines)

    def get_slug(self, obj):
        return slugify_fallback(obj.title, 'poem')

    def get_url_slug(self, obj):
        return f"{obj.id}-{self.get_slug(obj)}"


class PoemDetailSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    url_slug = serializers.SerializerMethodField()

    class Meta:
        model = Poem
        fields = ['id', 'title', 'text', 'author', 'views', 'slug', 'url_slug']

    def get_author(self, obj):
        return {
            'id': obj.author_id,
            'full_name': obj.author.full_name,
            'slug': slugify_fallback(obj.author.full_name, 'author'),
        }

    def get_slug(self, obj):
        return slugify_fallback(obj.title, 'poem')

    def get_url_slug(self, obj):
        return f"{obj.id}-{self.get_slug(obj)}"
