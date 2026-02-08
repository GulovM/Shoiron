from datetime import date

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from config.throttling import ViewRateThrottle
from config.utils import get_user_hash
from apps.authors.models import Author
from apps.authors.serializers import AuthorSerializer
from apps.reactions.utils import get_reaction_counts, get_user_flags
from .models import Poem, PoemMonthlyVisit, PoemView
from .serializers import PoemDetailSerializer, PoemListSerializer


HERO_TEXT = 'Портали асарҳои шоирони классикӣ ва муосири форсу-тоҷик.'


class HealthView(APIView):
    def get(self, request):
        return Response({'status': 'ok'})


class StatsView(APIView):
    def get(self, request):
        return Response({
            'authors_count': Author.objects.filter(deleted_at__isnull=True, is_published=True).count(),
            'poems_count': Poem.objects.filter(
                deleted_at__isnull=True,
                is_published=True,
                author__deleted_at__isnull=True,
                author__is_published=True,
            ).count(),
        })


class HomeView(APIView):
    def get(self, request):
        cached = cache.get('home_payload')
        if cached:
            return Response(cached)

        top_poems = Poem.objects.filter(
            deleted_at__isnull=True,
            is_published=True,
            author__deleted_at__isnull=True,
            author__is_published=True,
        ).select_related('author').order_by('-views')[:5]
        top_authors = Author.objects.filter(deleted_at__isnull=True, is_published=True).annotate(
            poems_count=Count(
                'poems',
                filter=Q(poems__deleted_at__isnull=True, poems__is_published=True),
                distinct=True,
            ),
            popularity=Coalesce(
                Sum('poems__views', filter=Q(poems__deleted_at__isnull=True, poems__is_published=True)),
                0,
            ),
        ).order_by('-popularity')[:5]

        payload = {
            'hero_text': HERO_TEXT,
            'stats': {
                'authors_count': Author.objects.filter(deleted_at__isnull=True, is_published=True).count(),
                'poems_count': Poem.objects.filter(
                    deleted_at__isnull=True,
                    is_published=True,
                    author__deleted_at__isnull=True,
                    author__is_published=True,
                ).count(),
            },
            'top_poems': PoemListSerializer(top_poems, many=True, context={'request': request}).data,
            'top_authors': AuthorSerializer(top_authors, many=True, context={'request': request}).data,
        }
        cache.set('home_payload', payload, 60)
        return Response(payload)


class HomeRecommendationView(APIView):
    def get(self, request):
        poem = Poem.objects.filter(
            deleted_at__isnull=True,
            is_published=True,
            author__deleted_at__isnull=True,
            author__is_published=True,
        ).select_related('author').order_by('?').first()
        if not poem:
            return Response({'detail': 'No poems'}, status=404)
        return Response(PoemListSerializer(poem, context={'request': request}).data)


class PoemRandomView(APIView):
    def get(self, request):
        poem = Poem.objects.filter(
            deleted_at__isnull=True,
            is_published=True,
            author__deleted_at__isnull=True,
            author__is_published=True,
        ).select_related('author').order_by('?').first()
        if not poem:
            return Response({'detail': 'No poems'}, status=404)
        return Response(PoemListSerializer(poem, context={'request': request}).data)


class PoemDetailView(RetrieveAPIView):
    serializer_class = PoemDetailSerializer
    queryset = Poem.objects.filter(
        deleted_at__isnull=True,
        is_published=True,
        author__deleted_at__isnull=True,
        author__is_published=True,
    ).select_related('author')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self.get_serializer(instance).data
        user_hash = get_user_hash(request)
        data['reactions'] = {
            'counts_by_type': get_reaction_counts(instance.id),
            'user_flags_by_type': get_user_flags(instance.id, user_hash),
        }
        return Response(data)


class PoemViewRegister(APIView):
    throttle_classes = [ViewRateThrottle]

    def post(self, request, pk):
        poem = get_object_or_404(
            Poem,
            pk=pk,
            deleted_at__isnull=True,
            is_published=True,
            author__deleted_at__isnull=True,
            author__is_published=True,
        )
        user_hash = get_user_hash(request)
        today = timezone.now().date()
        month_start = date(today.year, today.month, 1)

        created = False
        with transaction.atomic():
            try:
                PoemView.objects.create(poem=poem, user_hash=user_hash, viewed_date=today)
                created = True
            except IntegrityError:
                created = False

            if created:
                Poem.objects.filter(pk=poem.pk).update(views=F('views') + 1)
                monthly, _ = PoemMonthlyVisit.objects.get_or_create(poem=poem, month_start=month_start)
                PoemMonthlyVisit.objects.filter(pk=monthly.pk).update(visits_count=F('visits_count') + 1)

        poem.refresh_from_db(fields=['views'])
        return Response({'views': poem.views, 'counted': created})


class PoemNeighborsView(APIView):
    def get(self, request, pk):
        author_id = request.query_params.get('author_id')
        if not author_id:
            return Response({'detail': 'author_id required'}, status=400)
        get_object_or_404(Author, pk=author_id, deleted_at__isnull=True, is_published=True)

        visible_filters = {
            'author_id': author_id,
            'deleted_at__isnull': True,
            'is_published': True,
            'author__deleted_at__isnull': True,
            'author__is_published': True,
        }
        prev_poem = Poem.objects.filter(**visible_filters, id__lt=pk).order_by('-id').first()
        next_poem = Poem.objects.filter(**visible_filters, id__gt=pk).order_by('id').first()

        def minimal(poem):
            if not poem:
                return None
            data = PoemListSerializer(poem, context={'request': request}).data
            return {
                'id': data['id'],
                'title': data['title'],
                'url_slug': data['url_slug'],
            }

        return Response({'prev': minimal(prev_poem), 'next': minimal(next_poem)})
