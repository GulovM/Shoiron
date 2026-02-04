from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.poems.models import Poem
from apps.poems.serializers import PoemListSerializer
from .models import Author
from .serializers import AuthorDetailSerializer, AuthorSerializer


class AuthorListView(ListAPIView):
    serializer_class = AuthorSerializer

    def get_queryset(self):
        qs = Author.objects.all().annotate(
            poems_count=Count('poems', distinct=True),
            popularity=Coalesce(Sum('poems__views'), 0),
        )
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(full_name__icontains=q)
        ordering = self.request.query_params.get('ordering')
        allowed = {'full_name', '-full_name', 'popularity', '-popularity', 'poems_count', '-poems_count'}
        if ordering in allowed:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('full_name')
        return qs


class AuthorDetailView(RetrieveAPIView):
    serializer_class = AuthorDetailSerializer
    queryset = Author.objects.all().annotate(
        poems_count=Count('poems', distinct=True),
        popularity=Coalesce(Sum('poems__views'), 0),
    )


class AuthorPoemsListView(ListAPIView):
    serializer_class = PoemListSerializer
    pagination_class = None

    def get(self, request, *args, **kwargs):
        author_id = kwargs['pk']
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 25))
        qs = Poem.objects.filter(author_id=author_id).select_related('author').order_by('id')
        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset: offset + page_size]
        serializer = self.serializer_class(items, many=True, context={'request': request})
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })


class AuthorRandomView(APIView):
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        exclude = request.query_params.get('exclude')
        qs = Author.objects.all().annotate(
            poems_count=Count('poems', distinct=True),
            popularity=Coalesce(Sum('poems__views'), 0),
        )
        if exclude:
            qs = qs.exclude(id=exclude)
        authors = qs.order_by('?')[:limit]
        data = AuthorSerializer(authors, many=True, context={'request': request}).data
        return Response(data)
