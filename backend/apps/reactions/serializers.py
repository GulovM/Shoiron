from rest_framework import serializers

from .models import Reaction


class ReactionToggleSerializer(serializers.Serializer):
    poem_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=Reaction.TYPE_CHOICES)
