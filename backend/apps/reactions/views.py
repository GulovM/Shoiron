from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from config.throttling import ReactionRateThrottle
from config.utils import get_user_hash
from apps.poems.models import Poem
from .models import Reaction
from .serializers import ReactionToggleSerializer
from .utils import get_reaction_counts, get_user_flags


class ReactionToggleView(APIView):
    throttle_classes = [ReactionRateThrottle]

    def post(self, request):
        serializer = ReactionToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        poem_id = serializer.validated_data['poem_id']
        reaction_type = serializer.validated_data['type']
        user_hash = get_user_hash(request)

        get_object_or_404(Poem, pk=poem_id)

        existing = Reaction.objects.filter(
            poem_id=poem_id,
            type=reaction_type,
            user_hash=user_hash,
        ).first()

        if existing:
            existing.delete()
        else:
            Reaction.objects.filter(poem_id=poem_id, user_hash=user_hash).exclude(type=reaction_type).delete()
            Reaction.objects.create(
                poem_id=poem_id,
                type=reaction_type,
                user_hash=user_hash,
            )

        counts = get_reaction_counts(poem_id)
        flags = get_user_flags(poem_id, user_hash)
        return Response({
            'counts_by_type': counts,
            'user_flags_by_type': flags,
        })
