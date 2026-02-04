from django.contrib import admin

from .models import Poem, PoemView


@admin.register(Poem)
class PoemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'views', 'created_at')
    search_fields = ('title', 'text')
    list_filter = ('author',)


@admin.register(PoemView)
class PoemViewAdmin(admin.ModelAdmin):
    list_display = ('id', 'poem', 'user_hash', 'viewed_date', 'viewed_at')
    search_fields = ('user_hash',)
    list_filter = ('viewed_date',)
