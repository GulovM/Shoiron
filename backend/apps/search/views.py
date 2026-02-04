import re

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce, Greatest
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.contrib.postgres.search import TrigramSimilarity
from rest_framework.response import Response
from rest_framework.views import APIView

from config.throttling import SearchRateThrottle
from apps.authors.models import Author
from apps.authors.serializers import AuthorSerializer
from apps.poems.models import Poem
from apps.poems.serializers import PoemListSerializer


class SearchView(APIView):
    throttle_classes = [SearchRateThrottle]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 25))

        if not q:
            return Response({
                'authors': {'count': 0, 'page': page, 'page_size': page_size, 'results': []},
                'poems': {'count': 0, 'page': page, 'page_size': page_size, 'results': []},
            })

        tokens = re.findall(r"[\w']+", q, flags=re.U)
        if not tokens:
            return Response({
                'authors': {'count': 0, 'page': page, 'page_size': page_size, 'results': []},
                'poems': {'count': 0, 'page': page, 'page_size': page_size, 'results': []},
            })

        raw_query = ' & '.join([f'{token}:*' for token in tokens])
        query = SearchQuery(raw_query, search_type='raw', config='simple')

        authors_qs = Author.objects.annotate(
            rank=SearchRank(F('search_vector'), query),
            similarity=TrigramSimilarity('full_name', q),
            poems_count=Count('poems', distinct=True),
            popularity=Coalesce(Sum('poems__views'), 0),
        ).filter(
            Q(search_vector=query)
            | Q(full_name__icontains=q)
            | Q(full_name__trigram_similar=q)
        ).order_by('-rank', '-similarity', '-popularity')

        poems_qs = Poem.objects.select_related('author').annotate(
            rank=SearchRank(F('search_vector'), query),
            similarity=Greatest(TrigramSimilarity('title', q), TrigramSimilarity('text', q)),
        ).filter(
            Q(search_vector=query)
            | Q(title__icontains=q)
            | Q(text__icontains=q)
            | Q(title__trigram_similar=q)
        ).order_by('-rank', '-similarity', '-views')

        def paginate(qs):
            total = qs.count()
            offset = (page - 1) * page_size
            items = qs[offset: offset + page_size]
            return items, total

        authors_page, authors_total = paginate(authors_qs)
        poems_page, poems_total = paginate(poems_qs)

        return Response({
            'authors': {
                'count': authors_total,
                'page': page,
                'page_size': page_size,
                'results': AuthorSerializer(authors_page, many=True, context={'request': request}).data,
            },
            'poems': {
                'count': poems_total,
                'page': page,
                'page_size': page_size,
                'results': PoemListSerializer(poems_page, many=True, context={'request': request}).data,
            },
        })
