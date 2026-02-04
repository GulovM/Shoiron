from django.contrib import admin

from .models import Author


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'birth_date', 'death_date', 'created_at')
    search_fields = ('full_name',)
    list_filter = ('birth_date',)
