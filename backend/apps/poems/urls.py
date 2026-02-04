from django.urls import path

from .views import (
    HealthView,
    HomeRecommendationView,
    HomeView,
    PoemDetailView,
    PoemNeighborsView,
    PoemRandomView,
    PoemViewRegister,
    StatsView,
)

urlpatterns = [
    path('healthz', HealthView.as_view(), name='healthz'),
    path('stats', StatsView.as_view(), name='stats'),
    path('home', HomeView.as_view(), name='home'),
    path('home/recommendation/next', HomeRecommendationView.as_view(), name='home-recommendation'),
    path('poems/random', PoemRandomView.as_view(), name='poems-random'),
    path('poems/<int:pk>', PoemDetailView.as_view(), name='poems-detail'),
    path('poems/<int:pk>/view', PoemViewRegister.as_view(), name='poems-view'),
    path('poems/<int:pk>/neighbors', PoemNeighborsView.as_view(), name='poems-neighbors'),
]
