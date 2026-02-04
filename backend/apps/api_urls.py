from django.urls import include, path

urlpatterns = [
    path('', include('apps.authors.urls')),
    path('', include('apps.poems.urls')),
    path('', include('apps.reactions.urls')),
    path('', include('apps.search.urls')),
]
