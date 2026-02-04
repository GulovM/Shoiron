from django.contrib import admin

from .models import Reaction


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'poem', 'type', 'user_hash', 'created_at')
    list_filter = ('type',)
    search_fields = ('user_hash',)
