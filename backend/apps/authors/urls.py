from django.urls import path

from .views import AuthorDetailView, AuthorListView, AuthorPoemsListView, AuthorRandomView

urlpatterns = [
    path('authors', AuthorListView.as_view(), name='authors-list'),
    path('authors/random', AuthorRandomView.as_view(), name='authors-random'),
    path('authors/<int:pk>', AuthorDetailView.as_view(), name='authors-detail'),
    path('authors/<int:pk>/poems', AuthorPoemsListView.as_view(), name='authors-poems'),
]
